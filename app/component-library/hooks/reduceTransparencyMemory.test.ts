import {
  getRememberedReduceTransparency,
  rememberReduceTransparency,
} from './reduceTransparencyMemory';

// Module state is shared across cases, so they run in this order on purpose.
describe('reduceTransparencyMemory', () => {
  it('knows nothing before the first read', () => {
    expect(getRememberedReduceTransparency()).toBeUndefined();
  });

  it('remembers a read', () => {
    rememberReduceTransparency(true);

    expect(getRememberedReduceTransparency()).toBe(true);
  });

  it('keeps only the latest read', () => {
    rememberReduceTransparency(false);

    expect(getRememberedReduceTransparency()).toBe(false);
  });
});
