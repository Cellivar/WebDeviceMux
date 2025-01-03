import { ConnectionDirectionMode, type IDeviceChannel, type IDeviceCommunicationOptions } from "../Channel.js";
import type { IDeviceInformation } from "../Device.js";
import { DeviceCommunicationError, DeviceNotReadyError } from "../Error.js";

/** Device information extended with USB information. */
export interface IUSBDeviceInformation extends IDeviceInformation {
  readonly deviceClass: number;
  readonly deviceSubclass: number;
  readonly deviceProtocol: number;
  readonly vendorId: number;
  readonly productId: number;
  readonly deviceVersionMajor: number;
  readonly deviceVersionMinor: number;
  readonly deviceVersionSubminor: number;
}

/** Convert a USBDevice object to an IUSBDeviceInformation object. */
function deviceToInfo(device: USBDevice): IUSBDeviceInformation {
  return {
    deviceClass          : device.deviceClass,
    deviceProtocol       : device.deviceProtocol,
    deviceSubclass       : device.deviceSubclass,
    deviceVersionMajor   : device.deviceVersionMajor,
    deviceVersionMinor   : device.deviceVersionMinor,
    deviceVersionSubminor: device.deviceVersionSubminor,
    productId            : device.productId,
    vendorId             : device.vendorId,
    manufacturerName     : device.manufacturerName,
    productName          : device.productName,
    serialNumber         : device.serialNumber,
  };
}

function getTransferLength(
  maxRecieve?: number,
  devicePacket?: number,
) {
  // Math is hard, let's go shopping
  const defaultMax = 4096;
  if (maxRecieve === undefined && devicePacket === 64) {
    return defaultMax;
  }

  let maxPacket = maxRecieve ?? defaultMax;
  maxPacket = maxPacket > 0 ? maxPacket : defaultMax;

  let devicePacketSize = devicePacket ?? 64;
  devicePacketSize = devicePacketSize > 0 ? devicePacketSize : 64;

  return devicePacketSize * Math.floor(maxPacket / devicePacketSize);
}

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest

  describe('deviceToInfo', () => {
    it('Translates all values', () => {
      const dev = {
        deviceClass          : 1,
        deviceProtocol       : 2,
        deviceSubclass       : 3,
        deviceVersionMajor   : 4,
        deviceVersionMinor   : 5,
        deviceVersionSubminor: 6,
        productId            : 7,
        vendorId             : 8,
        manufacturerName     : 'man',
        productName          : 'name',
        serialNumber         : 'ser',
      } as unknown as USBDevice;
      expect(deviceToInfo(dev)).toEqual(dev);
    });
  });
}

/** Class for managing the WebUSB communication with a device. */
export class UsbDeviceChannel implements IDeviceChannel<Uint8Array, Uint8Array> {
  private device: USBDevice;
  private deviceIn?: USBEndpoint;
  private deviceOut?: USBEndpoint;

  private _commOptions: IDeviceCommunicationOptions;

  public readonly channelType = "USB" as const;

  private _commMode = ConnectionDirectionMode.none;
  public get commMode() { return this._commMode; }

  public get connected() {
    return !this._disposed && this.device.opened;
  }

  private _disposed = false;

  static async fromDevice(
    device: USBDevice,
    options: IDeviceCommunicationOptions = { debug: false },
  ): Promise<UsbDeviceChannel> {
    const c = new UsbDeviceChannel(device, options);
    await c.setup();
    return c;
  }

  protected constructor(
    device: USBDevice,
    commOptions: IDeviceCommunicationOptions
  ) {
    this.device = device;
    this._commOptions = commOptions;
  }

  private async setup() {
    try {
      const { input, output } = await connectDevice(this.device);

      this.deviceIn = input;
      this.deviceOut = output;
      this._commMode = getCommMode(this.deviceOut !== undefined, this.deviceIn !== undefined);
      if (this._commOptions.debug) {
        console.debug('Comm mode with device is', ConnectionDirectionMode[this._commMode]);
      }
    } catch (e) {
      await this.dispose();
      throw e;
    }
  }

  public async dispose() {
    if (this._disposed) {
      return;
    }

    this._disposed = true;

    try {
      await this.device.close();
    } catch (e) {
      if (
        e instanceof DOMException &&
        e.name === 'NotFoundError' &&
        e.message ===
        "Failed to execute 'close' on 'USBDevice': The device was disconnected."
      ) {
        // Device was already closed, no-op.
        return;
      }

      throw e;
    }
  }

  public async send(
    commandBuffer: Uint8Array
  ): Promise<DeviceNotReadyError | undefined> {
    if (this.deviceOut === undefined || !this.connected) {
      return new DeviceNotReadyError();
    }

    if (this._commOptions.debug) {
      console.debug('Sending command buffer to device via USB.');
      console.time('commandBufferSendTime');
    }

    try {
      // TOOD: Add timeout in case of communication hang.
      await this.device.transferOut(this.deviceOut.endpointNumber, commandBuffer);
      return;
    } catch (e: unknown) {
      if (typeof e === 'string') {
        return new DeviceCommunicationError(e);
      }
      if (e instanceof Error ) {
        return new DeviceCommunicationError(undefined, e);
      }
      // Dunno what this is but we can't wrap it.
      throw e;
    } finally {
      if (this._commOptions.debug) {
        console.timeEnd('commandBufferSendTime');
        console.debug('Completed sending commands.');
      }
    }
  }

  public getDeviceInfo() {
    return Promise.resolve(deviceToInfo(this.device));
  }

  public async receive(): Promise<Uint8Array[] | DeviceNotReadyError> {
    if (this.deviceIn === undefined || !this.connected) { return new DeviceNotReadyError('Channel is not connected.'); }

    const result = await this.device.transferIn(
      this.deviceIn.endpointNumber,
      getTransferLength(
        this._commOptions.maxReceivePacketSize,
        this.deviceIn?.packetSize,
      ),
    )
    .catch((error: unknown) => {
      if (error instanceof DOMException
        && error.message.endsWith('A transfer error has occurred.')
        && error.name === 'NetworkError'
      ){
        // The device disconnected, this is fine.
        return new DeviceNotReadyError('Channel has disconnected');
      }
      // dunno what happened
      throw error;
    });

    if (result instanceof DeviceNotReadyError) {
      return result;
    }

    // Sanity tests
    if (result.status === "stall") {
      // TODO: Way better error handling if this is encountered...
      console.error(`USB device gave 'stall' error on receipt of data. Automatically resetting the connection to try again. This may indicate a problem with the device.`);
      this.device.clearHalt("in", this.deviceIn.endpointNumber);
    }
    if (result.status === "babble") {
      console.error(`USB device gave 'babble' error on receipt of data. Response data was likely lost. This may indicate an issue with the device or the way this library tries to communicate to the device.`);
    }
    if (result.data === undefined || result.data.byteLength === 0) { return []; }

    return [new Uint8Array(result.data.buffer, result.data.byteOffset, result.data.byteLength)];
  }
}

async function connectDevice(d: USBDevice) {
  // Most devices have two endpoints on one interface for bidirectional bulk
  // in and out. The more poorly performing a device the more random this
  // layout will be, so we must go and look for these two endpoints.
  if (d.configurations[0]?.interfaces[0]?.alternates[0] === undefined) {
    // Can't talk to the device at all???
    throw new DeviceCommunicationError(
      'USB device did not expose an endpoint to communicate with. Try power-cycling the device, or checking its settings. This is a hardware problem.'
    );
  }

  // Open the connection! Stop having it be closed!
  try {
    await d.open();
  } catch (e) {
    if (
      e instanceof DOMException &&
      e.name === 'SecurityError' &&
      e.message === "Failed to execute 'open' on 'USBDevice': Access denied."
    ) {
      // This can happen if something else, usually the operating system, has taken
      // exclusive access of the USB device and won't allow WebUSB to take control.
      // This most often happens on Windows. You can use Zadig to replace the driver.
      throw new DriverAccessDeniedError();
    }

    throw e;
  }

  // TODO: Settings for multiple interfaces?
  await d.selectConfiguration(1);
  await d.claimInterface(0);

  let o: USBEndpoint | undefined = undefined;
  let i: USBEndpoint | undefined = undefined;
  for (const endpoint of d.configurations[0].interfaces[0].alternates[0].endpoints) {
    if (endpoint.direction == 'out') {
      o = endpoint;
    } else if (endpoint.direction == 'in') {
      i = endpoint;
    }
  }

  // For no apparent reason sometimes devices will omit to advertise the
  // input endpoint. Sometimes they'll also omit the output endpoint. This
  // attempts to handle those situations in a degraded mode.
  if (!o) {
    throw new DeviceCommunicationError(
      'USB device did not expose an output endpoint. Try power-cycling the device. This is a hardware problem.'
    );
  }

  if (!i) {
    console.warn('USB device did not expose an input endpoint, using unidirectional mode.');
  }

  return {input: i, output: o}
}

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest;

  describe('connectDevice', () => {
    it('Throws on no endpoint', async () => {
      const badDevice: USBDevice = {
        configurations: []
      } as unknown as USBDevice;
      await expect(() => connectDevice(badDevice)).rejects.toThrowError();
    });

    it('Throws on access denied', async () => {
      // This is thrown if the operating system won't let the browser talk to
      // the device directly.
      const accessException = new DOMException(
        "Failed to execute 'open' on 'USBDevice': Access denied.",
        'SecurityError'
      );
      const badDevice: USBDevice = {
        configurations: [
          {
            interfaces: [
              {
                alternates: [
                  {}
                ]
              }
            ]
          }
        ],
        open() {
          throw accessException;
        },
      } as unknown as USBDevice;
      await expect(() => connectDevice(badDevice)).rejects.toThrow(new DriverAccessDeniedError());
    });
  });
}

function getCommMode(output: boolean, input: boolean) {
  // TODO: Figure out if getting the Interface Protocol Mode is more
  // reliable than the detection method used here...
  if (output === false) {
    // Can't talk to something that isn't listening...
    return ConnectionDirectionMode.none;
  }
  if (input === false) {
    // Can send commands but can't get info back. Operating in the blind.
    return ConnectionDirectionMode.unidirectional;
  }
  return ConnectionDirectionMode.bidirectional;
}

if (import.meta.vitest) {
  const { it, expect, describe } = import.meta.vitest

  describe('getCommMode', () => {
    it('Gets sane result', () => {
      expect(getCommMode(false, false)).toBe(ConnectionDirectionMode.none);
      expect(getCommMode(false, true)).toBe(ConnectionDirectionMode.none);
      expect(getCommMode(true, false)).toBe(ConnectionDirectionMode.unidirectional);
      expect(getCommMode(true, true)).toBe(ConnectionDirectionMode.bidirectional);
    });
  });
}

/** Error indicating the devices's driver cannot be used by WebUSB. */
export class DriverAccessDeniedError extends DeviceCommunicationError {
  constructor() {
    super(
      'Operating system prevented accessing the USB device. If this is on Windows you may need to replace the driver. See https://cellivar.github.io/WebZLP/docs/windows_driver for more details.'
    );
  }
}
