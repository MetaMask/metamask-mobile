import {
  WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD,
  WHATS_HAPPENING_CARD_WIDTH,
  WHATS_HAPPENING_CAROUSEL_GAP,
  WHATS_HAPPENING_CAROUSEL_HORIZONTAL_PADDING,
} from '../constants';
import {
  getWhatsHappeningCardContentStart,
  isWhatsHappeningCardVisible,
} from './carouselVisibility';

const halfCardWidth =
  WHATS_HAPPENING_CARD_WIDTH * WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD;

describe('carouselVisibility', () => {
  it('places the first card after the content padding', () => {
    expect(getWhatsHappeningCardContentStart(0)).toBe(
      WHATS_HAPPENING_CAROUSEL_HORIZONTAL_PADDING,
    );
  });

  it('steps each later card by the card width plus the gap', () => {
    expect(getWhatsHappeningCardContentStart(2)).toBe(
      WHATS_HAPPENING_CAROUSEL_HORIZONTAL_PADDING +
        2 * (WHATS_HAPPENING_CARD_WIDTH + WHATS_HAPPENING_CAROUSEL_GAP),
    );
  });

  it('returns false when the viewport width is zero', () => {
    expect(isWhatsHappeningCardVisible(0, 0, 0)).toBe(false);
  });

  it('returns true when exactly half the card overlaps the viewport', () => {
    const cardStart = getWhatsHappeningCardContentStart(1);
    const viewportWidth = cardStart + halfCardWidth;

    expect(isWhatsHappeningCardVisible(1, 0, viewportWidth)).toBe(true);
  });

  it('returns false when the overlap is one pixel under half the card', () => {
    const cardStart = getWhatsHappeningCardContentStart(1);
    const viewportWidth = cardStart + halfCardWidth - 1;

    expect(isWhatsHappeningCardVisible(1, 0, viewportWidth)).toBe(false);
  });

  it('returns false when the card is fully to the right of the viewport', () => {
    const viewportWidth = getWhatsHappeningCardContentStart(2);

    expect(isWhatsHappeningCardVisible(2, 0, viewportWidth)).toBe(false);
  });

  it('returns true while at least half the card remains as it leaves to the left', () => {
    const cardEnd =
      getWhatsHappeningCardContentStart(0) + WHATS_HAPPENING_CARD_WIDTH;
    const offsetX = cardEnd - halfCardWidth;

    expect(isWhatsHappeningCardVisible(0, offsetX, 400)).toBe(true);
    expect(isWhatsHappeningCardVisible(0, offsetX + 1, 400)).toBe(false);
  });
});
