import { selectVbaEffectiveLocation } from './index';

const neobank = (regionOverride: string | undefined) => ({
  chooseCurrency: false,
  regionOverride,
});

describe('selectVbaEffectiveLocation', () => {
  it('prefers regionOverride over the pinned KYC country', () => {
    const result = selectVbaEffectiveLocation.resultFunc(
      neobank('BR'),
      'US',
      'SE',
    );

    expect(result).toBe('BR');
  });

  it('prefers the pinned KYC country over the IP location', () => {
    const result = selectVbaEffectiveLocation.resultFunc(
      neobank(undefined),
      'US',
      'SE',
    );

    expect(result).toBe('US');
  });

  it('falls back to the IP location when nothing is pinned', () => {
    const result = selectVbaEffectiveLocation.resultFunc(
      neobank(undefined),
      undefined,
      'US-CA',
    );

    expect(result).toBe('US-CA');
  });

  it('returns undefined when no location is known', () => {
    const result = selectVbaEffectiveLocation.resultFunc(
      neobank(undefined),
      undefined,
      undefined as unknown as string,
    );

    expect(result).toBeUndefined();
  });
});
