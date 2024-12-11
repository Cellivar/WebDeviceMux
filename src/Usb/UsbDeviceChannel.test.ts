/* eslint-disable @typescript-eslint/no-unused-vars */
import { it, expect, describe } from 'vitest';
import { UsbDeviceChannel } from './UsbDeviceChannel.js';

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
    selectConfiguration: function (configurationValue: number): Promise<void> {
      if (throws === 'selectConfiguration') {
        throw new Error('selectConfiguration.');
      }
      return Promise.resolve();
    },
    claimInterface: function (interfaceNumber: number): Promise<void> {
      if (throws === 'claimInterface') {
        throw new Error('claimInterface.');
      }
      return Promise.resolve();
    },
    releaseInterface: function (interfaceNumber: number): Promise<void> {
      if (throws === 'releaseInterface') {
        throw new Error('releaseInterface.');
      }
      return Promise.resolve();
    },
    selectAlternateInterface: function (interfaceNumber: number, alternateSetting: number): Promise<void> {
      throw new Error('Function not implemented.');
    },
    controlTransferIn: function (setup: USBControlTransferParameters, length: number): Promise<USBInTransferResult> {
      throw new Error('Function not implemented.');
    },
    controlTransferOut: function (setup: USBControlTransferParameters, data?: BufferSource): Promise<USBOutTransferResult> {
      throw new Error('Function not implemented.');
    },
    clearHalt: function (direction: USBDirection, endpointNumber: number): Promise<void> {
      throw new Error('Function not implemented.');
    },
    transferIn: function (endpointNumber: number, length: number): Promise<USBInTransferResult> {
      const msg = new TextEncoder().encode(input);
      return Promise.resolve(new USBInTransferResult('ok', new DataView(msg.buffer, msg.byteOffset, msg.byteLength)));
    },
    transferOut: function (endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult> {
      return Promise.resolve({
        bytesWritten: data.byteLength,
        status: 'ok'
      });
    },
    isochronousTransferIn: function (endpointNumber: number, packetLengths: number[]): Promise<USBIsochronousInTransferResult> {
      throw new Error('Function not implemented.');
    },
    isochronousTransferOut: function (endpointNumber: number, data: BufferSource, packetLengths: number[]): Promise<USBIsochronousOutTransferResult> {
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
    const channel = new UsbDeviceChannel(getFakeDevice(), { debug: true });
    await channel.ready;
    expect(channel['_disposed']).toBe(false);
    expect(channel['deviceIn']).not.toBeUndefined();
    expect(channel['deviceOut']).not.toBeUndefined();
  });
});
