import type { IDeviceInformation } from "./Device.js";
import type { DeviceCommunicationError } from "./Error.js";

/** Possible ways to communicate with a device */
export type DeviceChannelType
  = "USB"
  | "Serial"
  | "Bluetooth"
  | "Network"

/** Whether data can be transmitted or received from the device. */
export enum ConnectionDirectionMode {
  none,
  unidirectional,
  bidirectional
}

/** Behavior options when communicating with a device. */
export interface IDeviceCommunicationOptions {
  /** Whether to display printer communication to the dev console. */
  debug: boolean;

  /** Milliseconds to wait for messages from a device before assuming it's done talking. Defaults to 500ms. */
  messageWaitTimeoutMS?: number;

  /**
   * Max receive packet size, in bytes. Should be a power of two, 512, 1024, etc.
   *
   * Not all devices will respect this number. This value will be rounded down
   * to the nearest packet size if the device must transmit on a specific length
   * boundary. For example, most USB devices use multiples of 64.
   */
  maxReceivePacketSize?: number;
}

/** A communication channel for talking to a device. */
export interface IDeviceChannel<TOutput, TInput> {
  /** Gets the mode the communication is set up as. */
  get commMode(): ConnectionDirectionMode;

  /** Gets this channel type. */
  readonly channelType: DeviceChannelType;

  /** Whether the device is connected. */
  get connected(): boolean;

  /** Close the channel, disallowing future communication. */
  dispose(): Promise<void>;

  /** Gets the basic information for the device connected on this channel. */
  getDeviceInfo(): Promise<IDeviceInformation>;

  /**
   * Send data to the device.
   * @param data The buffer of data to send to the device.
   */
  send(data: TOutput): Promise<DeviceCommunicationError | undefined>;

  /** Request data from the device. */
  receive(): Promise<TInput[] | DeviceCommunicationError>;
}
