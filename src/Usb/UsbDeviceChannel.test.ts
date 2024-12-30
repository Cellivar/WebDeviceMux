/* eslint-disable @typescript-eslint/no-unused-vars */
import { it, expect, describe } from 'vitest';
import { DriverAccessDeniedError, UsbDeviceChannel } from './UsbDeviceChannel.js';

type deviceThrows
= 'none'
| 'openSecurity'
| 'close'
| 'forget'
| 'selectConfiguration'
| 'claimInterface'
| 'releaseInterface';

function getFakeDevice(
  throws: deviceThrows = 'none',
  input: string = 'hello'
): USBDevice {
  const dev: USBDevice = {
    usbVersionMajor: 0,
    usbVersionMinor: 0,
    usbVersionSubminor: 0,
    deviceClass: 0,
    deviceSubclass: 0,
    deviceProtocol: 0,
    vendorId: 0,
    productId: 0,
    deviceVersionMajor: 0,
    deviceVersionMinor: 0,
    deviceVersionSubminor: 0,
    configurations: [{
      configurationValue: 0,
      interfaces: [{
        alternate: undefined!,
        claimed: false,
        interfaceNumber: 0,
        alternates: [{
          alternateSetting: 0,
          interfaceClass: 0,
          interfaceProtocol: 1,
          interfaceSubclass: 0,
          endpoints: [{
            direction: 'in',
            endpointNumber: 0,
            packetSize: 64,
            type: 'bulk'
          },
        {
          direction: 'out',
          endpointNumber: 1,
          packetSize: 64,
          type: 'bulk'
        }]
        }]
      }]
    }],
    opened: false,
    open: function (): Promise<void> {
      if (throws === 'openSecurity') {
        throw new DOMException(
          "Failed to execute 'open' on 'USBDevice': Access denied.",
          'SecurityError'
        );
      }
      return Promise.resolve();
    },
    close: function (): Promise<void> {
      if (throws === 'close') {
        throw new Error('closed.');
      }
      return Promise.resolve();
    },
    forget: function (): Promise<void> {
      if (throws === 'forget') {
        throw new Error('forget.');
      }
      return Promise.resolve();
    },
    selectConfiguration: function (_configurationValue: number): Promise<void> {
      if (throws === 'selectConfiguration') {
        throw new Error('selectConfiguration.');
      }
      return Promise.resolve();
    },
    claimInterface: function (_interfaceNumber: number): Promise<void> {
      if (throws === 'claimInterface') {
        throw new Error('claimInterface.');
      }
      return Promise.resolve();
    },
    releaseInterface: function (_interfaceNumber: number): Promise<void> {
      if (throws === 'releaseInterface') {
        throw new Error('releaseInterface.');
      }
      return Promise.resolve();
    },
    selectAlternateInterface: function (_interfaceNumber: number, _alternateSetting: number): Promise<void> {
      throw new Error('Function not implemented.');
    },
    controlTransferIn: function (_setup: USBControlTransferParameters, _length: number): Promise<USBInTransferResult> {
      throw new Error('Function not implemented.');
    },
    controlTransferOut: function (_setup: USBControlTransferParameters, _data?: BufferSource): Promise<USBOutTransferResult> {
      throw new Error('Function not implemented.');
    },
    clearHalt: function (_direction: USBDirection, _endpointNumber: number): Promise<void> {
      throw new Error('Function not implemented.');
    },
    transferIn: function (_endpointNumber: number, _length: number): Promise<USBInTransferResult> {
      const msg = new TextEncoder().encode(input);
      return Promise.resolve(new USBInTransferResult('ok', new DataView(msg.buffer, msg.byteOffset, msg.byteLength)));
    },
    transferOut: function (_endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult> {
      return Promise.resolve({
        bytesWritten: data.byteLength,
        status: 'ok'
      });
    },
    isochronousTransferIn: function (_endpointNumber: number, _packetLengths: number[]): Promise<USBIsochronousInTransferResult> {
      throw new Error('Function not implemented.');
    },
    isochronousTransferOut: function (_endpointNumber: number, _data: BufferSource, _packetLengths: number[]): Promise<USBIsochronousOutTransferResult> {
      throw new Error('Function not implemented.');
    },
    reset: function (): Promise<void> {
      throw new Error('Function not implemented.');
    }
  };
  return dev;
}

describe('UsbDeviceChannel', () => {
  it('Constructs and sets fields', async () => {
    const channel = await UsbDeviceChannel.fromDevice(getFakeDevice(), { debug: true });
    expect(channel['_disposed']).toBe(false);
    expect(channel['deviceIn']).not.toBeUndefined();
    expect(channel['deviceOut']).not.toBeUndefined();
  });

  it('Throws security error', async () => {
    const dev = getFakeDevice('openSecurity');
    await expect(async () => {
      const channel = await UsbDeviceChannel.fromDevice(dev);
      channel.dispose();
    }).rejects.toThrowError(new DriverAccessDeniedError());
  });
});
