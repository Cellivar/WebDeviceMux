import { test, expect } from 'vitest';
import subtract from './subtract.js';
test('subtracts two numbers', () => {
  expect(subtract(10, 7)).toBe(3);
});
