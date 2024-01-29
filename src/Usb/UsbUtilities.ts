/** Determine if a given device is allowed to be managed by this manager. */
export function isManageableDevice(
  device: USBDevice,
  requestOptions: USBDeviceRequestOptions
): boolean {
  const filters = requestOptions.filters ?? [];
  const exclusionFilters = requestOptions.exclusionFilters ?? [];

  // Sanity check: No filters, no devices.
  if (filters === undefined || filters.length === 0) {
    return false;
  }

  // Step 1: Look for filters where the device doesn't match.
  if (filters.every(f => isDeviceFilterMatchOperation(device, f, "ne") === true)) {
    return false;
  }

  // Step 2: Look for exclusions where the device does match.
  if (exclusionFilters.some(f => isDeviceFilterMatchOperation(device, f, "eq") === true)) {
    return false;
  }

  // Not filtered!
  return true;
}

type Operation = "eq" | "ne";

function isDeviceFilterMatchOperation(
  device: USBDevice,
  filter: USBDeviceFilter,
  operation: Operation,
) {
  return (filter.vendorId   !== undefined && op(operation, filter.vendorId, device.vendorId))
    || (filter.productId    !== undefined && op(operation, filter.productId, device.productId))
    || (filter.classCode    !== undefined && op(operation, filter.classCode, device.deviceClass))
    || (filter.subclassCode !== undefined && op(operation, filter.subclassCode, device.deviceSubclass))
    || (filter.protocolCode !== undefined && op(operation, filter.protocolCode, device.deviceProtocol))
    || (filter.serialNumber !== undefined && op(operation, filter.serialNumber, device.serialNumber));
}

function op<TVal>(op: Operation, left: TVal, right: TVal) {
  return op === "eq"
    ? left === right
    : left !== right
}
