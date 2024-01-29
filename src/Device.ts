
/** Interface describing a device that can be connected to. */
export interface IDevice {
  /** Close the connection to this device and clean up unmanaged resources. */
  dispose(): Promise<void>;

  /** Whether the device is connected. */
  get connected(): boolean;

  /** A promise indicating this device is ready to be used. */
  ready: Promise<boolean>;
}

/** An event object corresponding to a particular device. */
export interface IDeviceEvent<TDevice extends IDevice> {
  /** The device the event is for. */
  device: TDevice;
}

/** Basic metadata about a device, including from before we connect to it. */
export interface IDeviceInformation {
  /** A string representing the manufacturer, if available. */
  readonly manufacturerName?: string | undefined;
  /** A string representing the device product name, if available. */
  readonly productName?: string | undefined;
  /** A string representing the device's unique serial number, if available. */
  readonly serialNumber?: string | undefined;
}
