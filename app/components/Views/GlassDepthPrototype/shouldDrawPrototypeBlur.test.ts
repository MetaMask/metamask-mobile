import { shouldDrawPrototypeBlur } from './shouldDrawPrototypeBlur';

describe('shouldDrawPrototypeBlur', () => {
  it('skips blur when the network is known to be offline', () => {
    expect(shouldDrawPrototypeBlur('HIGH', 'NONE')).toBe(false);
    expect(shouldDrawPrototypeBlur('MID', 'NONE')).toBe(false);
    expect(shouldDrawPrototypeBlur('LOW', 'NONE')).toBe(false);
    expect(shouldDrawPrototypeBlur(null, 'NONE')).toBe(false);
  });

  it('skips blur on a known low-end device when the network tier is known', () => {
    expect(shouldDrawPrototypeBlur('LOW', 'WIFI')).toBe(false);
    expect(shouldDrawPrototypeBlur('LOW', 'FAST_CELLULAR')).toBe(false);
    expect(shouldDrawPrototypeBlur('LOW', 'SLOW_CELLULAR')).toBe(false);
  });

  it('keeps blur when a tier is unknown, so unknown is not treated as constrained', () => {
    expect(shouldDrawPrototypeBlur('LOW', null)).toBe(true);
    expect(shouldDrawPrototypeBlur(null, 'WIFI')).toBe(true);
    expect(shouldDrawPrototypeBlur(null, 'SLOW_CELLULAR')).toBe(true);
    expect(shouldDrawPrototypeBlur(null, null)).toBe(true);
  });

  it('keeps blur for the product-default cells', () => {
    expect(shouldDrawPrototypeBlur('MID', 'WIFI')).toBe(true);
    expect(shouldDrawPrototypeBlur('MID', 'FAST_CELLULAR')).toBe(true);
    expect(shouldDrawPrototypeBlur('HIGH', 'SLOW_CELLULAR')).toBe(true);
    expect(shouldDrawPrototypeBlur('MID', null)).toBe(true);
  });
});
