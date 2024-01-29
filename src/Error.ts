/** Exception thrown from the WebDeviceMux library. */
export class WebDeviceMuxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Error indicating communication with the device could not be initiated. */
export class DeviceConnectionError extends WebDeviceMuxError {
  constructor(message?: string, innerException?: Error) {
    super(message ?? innerException?.message ?? 'Error connecting to device');
    this.innerException = innerException;
  }

  innerException?: Error;
}

/** Error indicating communication with the device failed. */
export class DeviceCommunicationError extends WebDeviceMuxError {
  constructor(message?: string, innerException?: Error) {
    super(message ?? innerException?.message ?? 'Error communicating with device');
    this.innerException = innerException;
  }

  innerException?: Error;
}

/** Error indicating the device was not ready to communicate. */
export class DeviceNotReadyError extends DeviceCommunicationError {
  constructor(message?: string, innerException?: Error) {
    super(message ?? innerException?.message ?? 'Device not ready to communicate.');
  }
}
