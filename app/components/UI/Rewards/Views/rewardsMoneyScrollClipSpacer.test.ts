import { rewardsMoneyScrollClipSpacer } from './rewardsMoneyScrollClipSpacer';

const VIEWPORT_HEIGHT = 652;
const TITLE_HEIGHT = 64;
const VISIBLE_HEIGHT = VIEWPORT_HEIGHT - TITLE_HEIGHT;
const REVEAL_THRESHOLD = VIEWPORT_HEIGHT + TITLE_HEIGHT;

describe('rewardsMoneyScrollClipSpacer', () => {
  it('returns 0 before the title or the scroller has been measured', () => {
    const unmeasured = rewardsMoneyScrollClipSpacer({
      rawContentHeight: 640,
      scrollViewportHeight: 0,
      titleSectionHeight: TITLE_HEIGHT,
    });

    expect(unmeasured).toBe(0);
  });

  it('returns 0 when the panel fits in the visible area', () => {
    const spacer = rewardsMoneyScrollClipSpacer({
      rawContentHeight: VISIBLE_HEIGHT,
      scrollViewportHeight: VIEWPORT_HEIGHT,
      titleSectionHeight: TITLE_HEIGHT,
    });

    expect(spacer).toBe(0);
  });

  it('returns 0 when the panel is tall enough to collapse the title', () => {
    const spacer = rewardsMoneyScrollClipSpacer({
      rawContentHeight: REVEAL_THRESHOLD,
      scrollViewportHeight: VIEWPORT_HEIGHT,
      titleSectionHeight: TITLE_HEIGHT,
    });

    expect(spacer).toBe(0);
  });

  it('pads a panel clipped by the title overdraw so scroll can reach its end', () => {
    const rawContentHeight = 640;

    const spacer = rewardsMoneyScrollClipSpacer({
      rawContentHeight,
      scrollViewportHeight: VIEWPORT_HEIGHT,
      titleSectionHeight: TITLE_HEIGHT,
    });

    expect(rawContentHeight).toBeGreaterThan(VISIBLE_HEIGHT);
    expect(rawContentHeight).toBeLessThan(REVEAL_THRESHOLD);
    expect(spacer).toBe(REVEAL_THRESHOLD - rawContentHeight);
  });

  it('rounds the pad up so a fractional shortfall still clears the clip', () => {
    const spacer = rewardsMoneyScrollClipSpacer({
      rawContentHeight: REVEAL_THRESHOLD - 0.2,
      scrollViewportHeight: VIEWPORT_HEIGHT,
      titleSectionHeight: TITLE_HEIGHT,
    });

    expect(spacer).toBe(1);
  });
});
