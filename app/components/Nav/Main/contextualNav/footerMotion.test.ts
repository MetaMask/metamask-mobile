import {
  getFooterMotion,
  getFooterTransitionId,
  FOOTER_COLLAPSE_MS,
  FOOTER_EXPAND_MS,
  animateFooterTransition,
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
    expect(FOOTER_COLLAPSE_MS).toBe(260);
    expect(FOOTER_EXPAND_MS).toBe(320);
    expect(FOOTER_COLLAPSE_MS).toBeLessThan(FOOTER_EXPAND_MS);
  });

  it('keeps one identity across Explore, Swap, Perps, and Predictions, and changes it when the footer set changes', () => {
    expect(getFooterTransitionId(null, null)).toBe('default');
    expect(getFooterTransitionId('trading', 'explore')).toBe('trade');
    expect(getFooterTransitionId('trading', 'swap')).toBe('trade');
    expect(getFooterTransitionId('trading', 'perps')).toBe('trade');
    expect(getFooterTransitionId('trading', 'predictions')).toBe('trade');
    expect(getFooterTransitionId('collectibles', 'popular')).toBe(
      'collectibles',
    );
    expect(getFooterTransitionId('collectibles', 'packs')).toBe('collectibles');
    expect(getFooterTransitionId('money', 'account')).toBe('money');

    expect(getFooterTransitionId('trading', 'swap')).not.toBe('default');
    expect(getFooterTransitionId('trading', 'perps')).not.toBe('collectibles');
    expect(getFooterTransitionId('collectibles', 'popular')).not.toBe('trade');
    expect(getFooterTransitionId('money', 'account')).not.toBe('trade');
  });
});

describe('animateFooterTransition', () => {
  it('morphs the pill width down and back up, and crossfades for Reduce Motion', () => {
    const clip = { value: 320 };
    const opacity = { value: 1 };
    const translate = { value: 0 };
    const clock = { value: 0 };
    const midpoint = jest.fn();

    animateFooterTransition(
      clip as never,
      opacity as never,
      translate as never,
      clock as never,
      320,
      84,
      'morph',
      midpoint,
    );

    expect(clip.value).not.toBe(320);
    expect(clock.value).not.toBe(0);

    animateFooterTransition(
      clip as never,
      opacity as never,
      translate as never,
      clock as never,
      320,
      84,
      'crossfade',
      midpoint,
    );

    expect(clip.value).toBe(320);
  });
});
