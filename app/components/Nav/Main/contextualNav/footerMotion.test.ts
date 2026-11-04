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
    expect(FOOTER_COLLAPSE_MS).toBe(220);
    expect(FOOTER_EXPAND_MS).toBe(280);
    expect(FOOTER_COLLAPSE_MS).toBeLessThan(FOOTER_EXPAND_MS);
  });

  it('changes identity when entering or leaving Swap, Perps, Predictions, and Collectibles', () => {
    expect(getFooterTransitionId(null, null)).toBe('default');
    expect(getFooterTransitionId('trading', 'dashboard')).toBe(
      'trade-dashboard',
    );
    expect(getFooterTransitionId('trading', 'swap')).toBe('trade-swap');
    expect(getFooterTransitionId('trading', 'perps')).toBe('trade-perps');
    expect(getFooterTransitionId('trading', 'predictions')).toBe(
      'trade-predictions',
    );
    expect(getFooterTransitionId('collectibles', 'popular')).toBe(
      'collectibles',
    );
    expect(getFooterTransitionId('collectibles', 'packs')).toBe('collectibles');

    const entered = [
      getFooterTransitionId('trading', 'swap'),
      getFooterTransitionId('trading', 'perps'),
      getFooterTransitionId('trading', 'predictions'),
      getFooterTransitionId('collectibles', 'popular'),
    ];
    entered.forEach((id) => {
      expect(id).not.toBe('default');
      expect(id).not.toBe('trade-dashboard');
    });
    expect(getFooterTransitionId(null, null)).not.toBe(entered[0]);
  });
});

describe('animateFooterTransition', () => {
  it('morphs width down to Home and back up for hub entries, including Reduce Motion as a crossfade', () => {
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
