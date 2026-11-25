import { AnimationDuration } from '@metamask/design-tokens';
import { getMarketListOptions } from './index';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('getMarketListOptions', () => {
  it('defaults to the slide-from-right animation with no duration override', () => {
    const options = getMarketListOptions(undefined, undefined);

    expect(options.animation).toBe('slide_from_right');
    expect(options.animationDuration).toBeUndefined();
    expect(options.headerShown).toBe(false);
  });

  it('keeps an explicit animation when one is set', () => {
    const options = getMarketListOptions('slide_from_bottom', undefined);

    expect(options.animation).toBe('slide_from_bottom');
  });

  it('passes an explicit duration through for the chart-header picker', () => {
    const options = getMarketListOptions(
      'slide_from_bottom',
      AnimationDuration.Promptly,
    );

    expect(options.animationDuration).toBe(AnimationDuration.Promptly);
  });
});
