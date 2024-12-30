/* eslint-disable @typescript-eslint/no-unused-vars */
import { it, expect, describe } from 'vitest';
import { InputMessageListener, type InputErrorHandler, type InputHandler } from './InputListener.js';
import { DeviceCommunicationError } from './Error.js';

function getValidListener(
  callback: InputHandler<string> = (i) => { console.log(i); return Promise.resolve({}); },
  errorHandler: InputErrorHandler = (e) => { console.log(e); return Promise.resolve(); }
) {
  return new InputMessageListener<string>(
    async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return ['hello'];
    },
    callback,
    errorHandler
  );
}

function getErrorListener() {
  return new InputMessageListener<string>(
    async () => {
      return new DeviceCommunicationError("This is a test error");
    },
    async (input) => { return {remainderData: input} },
    (_) => { return Promise.resolve(); }
  );
}

function getSlowListener(
  callback: InputHandler<string> = (i) => { console.log(i); return Promise.resolve({}); }
) {
  return new InputMessageListener<string>(
    async () => {
      await new Promise(resolve => setTimeout(resolve, 510));
      return ['hello, but slowly.'];
    },
    callback,
    (_) => { return Promise.resolve(); }
  );
}

describe('InputListener Disposes Cleanly', () => {
  it('Dispose does not throw', () => {
    const listener = getValidListener();
    expect(listener["_disposed"]).toBe(false);
    listener.start();
    expect(listener["_disposed"]).toBe(false);
    listener.dispose();
    expect(listener["_disposed"]).toEqual(true);
  });

  it('Double dispose does not throw', () => {
    const listener = getValidListener();
    expect(listener["_disposed"]).toBe(false);
    listener.start();
    expect(listener["_disposed"]).toBe(false);
    listener.dispose();
    expect(listener["_disposed"]).toBe(true);
    listener.dispose();
    expect(listener["_disposed"]).toBe(true);
  });

  it('Dispose on error', async () => {
    const listener = getErrorListener();
    expect(listener["_disposed"]).toBe(false);
    listener.start();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(listener["_disposed"]).toBe(true);
  });

  it('Slow listener returns eventually', async () => {
    let awaitResolve: (value: boolean) => void;
    const signal = new Promise<boolean>((resolve) => { awaitResolve = resolve});
    const callback = (i: string[]) => {
      awaitResolve(true);
      expect(i).toStrictEqual(['hello, but slowly.']);
      return Promise.resolve({});
    }
    const listener = getSlowListener(callback);
    listener.start();
    await signal;
  });

  it('Disposed slow listener is ignored', async () => {
    let awaitResolve: (value: boolean) => void;
    const signal = new Promise<boolean>((resolve) => { awaitResolve = resolve});
    const callback = (i: string[]) => {
      awaitResolve(true);
      console.log(i);
      return Promise.resolve({});
    }
    const listener = getSlowListener(callback);
    listener.start();
    // Disposing immediately after starting should prevent the signal from resolving.
    listener.dispose();
    const result = await Promise.race([
      signal,
      new Promise<string>(resolve => setTimeout(() => resolve('Correct!'), 510))
    ]);
    expect(result).toEqual('Correct!');
  });
});
