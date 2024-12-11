// TODO: Rewrite the entire message handling system as a stream transformer?

import { DeviceCommunicationError } from "./Error.js";

export type DataProvider<TInput> = () => Promise<TInput[] | DeviceCommunicationError>;
export type InputHandler<TInput> = (input: TInput[]) => Promise<IHandlerResponse<TInput>>;
export interface IHandlerResponse<TInput> {
  remainderData?: TInput[];
}

function promiseWithTimeoutDefault<T>(
  promise: Promise<T>,
  ms: number,
  resolveDefault: T
): Promise<T> {
  // create a promise that rejects in milliseconds
  const timeout = new Promise<T>((resolve) => {
    setTimeout(() => {
      resolve(resolveDefault);
    }, ms);
  });

  // returns a race between timeout and the passed promise
  return Promise.race<T>([promise, timeout]);
}

const listenSentinel = new DeviceCommunicationError('ListenSentinel');

export class InputMessageListener<TInput> {
  public start() {
    // We intentionally want to kick off an async promise here without needing
    // the calling function to be async. The promise we're starting is meant to
    // run forever and never resolve until it's being shut down.
    // eslint-disable-next-line no-async-promise-executor
    new Promise<void>(async (_, reject) => {
      let aggregate: TInput[] = [];
      let inputPromise: undefined | Promise<TInput[] | DeviceCommunicationError> = undefined;
      do {
        // Allow resuming awaiting an already-in-progress promise.
        inputPromise ??= this._dataProvider();
        const data = await promiseWithTimeoutDefault(inputPromise, 500, listenSentinel);

        // Printers can idle or otherwise not response for long periods of time.
        // We have a little event loop here, where every 500 milliseconds we
        // can do some housekeeping to see if we should continue waiting or give
        // up entirely.
        if (data === listenSentinel) {
          continue;
        } else {
          // This indicates we've left our event loop and got a real result.
          inputPromise = undefined;
        }

        if (data instanceof DeviceCommunicationError) {
          console.error(`Error getting data from source: `, data);
          reject(data);
          break;
        }

        if (data.length === 0) {
          continue;
        }

        aggregate.push(...data);
        this.logIfDebug(`Got data from provider, now has ${aggregate.length} items in receive buffer. Data: `, data);

        // The handler determines if what we got was sufficient, or if we need more.
        const handleResult = await this._inputHandler(aggregate);
        if (handleResult.remainderData !== undefined && handleResult.remainderData.length !== 0) {
          this.logIfDebug(`Input handler provided a ${handleResult.remainderData.length} length incomplete buffer.`);
        }

        // The handler is not required to be stateful, this is instead.
        // The handler may indicate more data is expected by returning incomplete
        // data back. We prefix our buffer with that incomplete data to add more
        // to it and wait again for more.
        aggregate = handleResult.remainderData ?? [];
      } while (!this._disposed);
    })
    .catch((reason) => {
      // TODO: Better logging?
      this._disposed = true;
      this.logIfDebug(`Device stream listener stopped listening unexpectedly.`, reason);
    });
  }

  private _disposed = false;
  public dispose() {
    if (this._disposed) { return; }
    this._disposed = true;
  }

  constructor(
    private readonly _dataProvider: DataProvider<TInput>,
    private readonly _inputHandler: InputHandler<TInput>,
    private readonly _debugLogging: boolean = true, // TODO: false
  ) {}

  private logIfDebug(...obj: unknown[]) {
    if (this._debugLogging) {
      console.debug(...obj);
    }
  }
}
