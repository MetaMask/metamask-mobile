import { doubleValue } from '.';

describe('doubleValue', () => {
  it('doubles the input', () => {
    expect(doubleValue(21)).toBe(42);
  });
});
