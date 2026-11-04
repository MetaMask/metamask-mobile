import {
  getFooterMotion,
  FOOTER_COLLAPSE_MS,
  FOOTER_EXPAND_MS,
} from './footerMotion';

describe('getFooterMotion', () => {
  it('morphs unless Reduce Motion is on or hardware is LOW on a known network', () => {
    expect(getFooterMotion('HIGH', 'WIFI', false)).toBe('morph');
    expect(getFooterMotion('MID', 'NONE', false)).toBe('morph');
    expect(getFooterMotion(null, null, null)).toBe('morph');
    expect(getFooterMotion('LOW', null, false)).toBe('morph');
    expect(getFooterMotion('LOW', 'WIFI', false)).toBe('crossfade');
    expect(getFooterMotion('LOW', 'NONE', null)).toBe('crossfade');
    expect(getFooterMotion('HIGH', 'WIFI', true)).toBe('crossfade');
  });

  it('uses a shorter collapse than the expand', () => {
    expect(FOOTER_COLLAPSE_MS).toBeLessThan(FOOTER_EXPAND_MS);
  });
});
