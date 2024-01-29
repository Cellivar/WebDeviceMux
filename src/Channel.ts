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
  messageWaitTimeoutMS?: number
}

/** A communication channel for talking to a device. */
export interface IDeviceChannel<TOutput, TInput> {
  /** Gets the mode the communication is set up as. */
  get commMode(): ConnectionDirectionMode;

  /** Gets this channel type. */
  readonly channelType: DeviceChannelType;

  /** A promise indicating this communication channel is ready for use. */
  get ready(): Promise<boolean>;

  /** Whether the device is connected. */
  get connected(): boolean;

  /** Close the channel, disallowing future communication. */
  dispose(): Promise<void>;

  /** Gets the basic information for the device connected on this channel. */
  getDeviceInfo(): IDeviceInformation

  /**
   * Send a series of commands to the device.
   * @param commandBuffer The series of commands to send in order.
   */
  sendCommands(commandBuffer: TOutput): Promise<DeviceCommunicationError | undefined>;

  /** Request data from the device. */
  getInput(): Promise<TInput[] | DeviceCommunicationError>;
}
