import { test, expect, describe } from 'vitest';
import { InputMessageListener } from './InputListener.js';

describe('InputListener Disposes Cleanly', () => {
  test('Dispose does not throw', () => {
    const listener = new InputMessageListener<string>(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 250));
        return ['hello '];
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      async (_input) => { return {}}
    );
    listener.start();
    listener.dispose();
    expect(listener["_disposed"]).toEqual(true);
  });
});
