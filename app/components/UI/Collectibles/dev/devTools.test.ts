import { isCollectiblesDevEnabled } from './devTools';

describe('Collectibles Dev tools environment', () => {
  const originalDevelopment = __DEV__;

  afterEach(() => {
    Object.defineProperty(globalThis, '__DEV__', {
      value: originalDevelopment,
    });
  });

  it('shows the tools for devnet', () => {
    const enabled = isCollectiblesDevEnabled('devnet');

    expect(enabled).toBe(true);
  });

  it.each([true, false])(
    'hides mainnet tools with __DEV__ = %s',
    (development) => {
      Object.defineProperty(globalThis, '__DEV__', { value: development });

      const enabled = isCollectiblesDevEnabled('mainnet');

      expect(enabled).toBe(false);
    },
  );
});
