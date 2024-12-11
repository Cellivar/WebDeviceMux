import { it, expect, describe } from 'vitest';
import { isManageableDevice } from './UsbUtilities.js';

describe('Filter Includes Work', () => {
  const device = {
    vendorId: 0x1234,
  } as USBDevice;
  it('No filters means no device', () => {
    const filter = {} as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(false);
  });

  it('Filter mismatch excludes device', () => {
    const filter = {
      filters: [
        {
          vendorId: 0x9999,
        }
      ]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(false);
  });

  it('Multiple filters with all mismatch excludes device', () => {
    const filter = {
      filters: [
        {
          vendorId: 0x9999,
        },
        {
          vendorId: 0x9998,
        }
      ]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(false);
  });

  it('Blank filter allows device', () => {
    const filter = {
      filters: [{}]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(true);
  });

  it('Filter match allows device', () => {
    const filter = {
      filters: [
        {
          vendorId: 0x1234,
        }
      ]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(true);
  });

  it('Multiple filters with some match allows device', () => {
    const filter = {
      filters: [
        {
          vendorId: 0x1234,
        },
        {
          vendorId: 0x9999,
        }
      ]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(true);
  });

  it('Multiple filters with all match allows device', () => {
    const filter = {
      filters: [
        {
          vendorId: 0x1234,
        },
        {
          vendorId: 0x1234,
        }
      ]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(true);
  });
});

describe('Multiple filter fields work', () => {
  const device = {
    vendorId: 0x1234,
    productId: 0xabcd,
    deviceClass: 0x42,
    deviceSubclass: 0x01,
    deviceProtocol: 0x00,
    serialNumber: '1234567890'
  } as USBDevice;

  it('Filter multiple data match includes device', () => {
    const filter = {
      filters: [
        {
          vendorId: 0x1234,
          productId: 0xabcd,
          classCode: 0x42,
          subclassCode: 0x01,
          protocolCode: 0x00,
          serialNumber: '1234567890'
        }
      ]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(true);
  });

  it('Multiple filters with one valid includes device', () => {
    const filter = {
      filters: [
        {
          vendorId: 0x1234,
          productId: 0xabcd,
        },
        {
          vendorId: 0x1234,
          productId: 0x1234,
        }
      ]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(true);
  });

  it('Mixed field match excludes device', () => {
    const filter = {
      filters: [
        {
          vendorId: 0x1234,
          productId: 0x1234,
        }
      ]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(false);
  });

  it('Multiple mixed field mismatch excludes device', () => {
    const filter = {
      filters: [
        {
          vendorId: 0x1234,
          productId: 0x1234,
        },
        {
          vendorId: 0xabcd,
          productId: 0xabcd,
        }
      ]
    } as USBDeviceRequestOptions;
    expect(isManageableDevice(device, filter)).toBe(false);
  });
});
