import {
  WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD,
  WHATS_HAPPENING_CARD_WIDTH,
  WHATS_HAPPENING_CAROUSEL_GAP,
  WHATS_HAPPENING_CAROUSEL_HORIZONTAL_PADDING,
} from '../constants';

/**
 * Content-coordinate of the left edge of carousel card `index`.
 * The content container insets every card by the horizontal padding, then
 * lays cards out at `card width + gap`.
 *
 * @param index - Zero-based card index in the carousel.
 * @returns Left edge in scroll-content coordinates.
 */
export const getWhatsHappeningCardContentStart = (index: number): number =>
  WHATS_HAPPENING_CAROUSEL_HORIZONTAL_PADDING +
  index * (WHATS_HAPPENING_CARD_WIDTH + WHATS_HAPPENING_CAROUSEL_GAP);

/**
 * Whether a carousel card overlaps the viewport by at least the threshold.
 * Uses width along the scroll axis. A card that is only vertically on screen
 * is not enough — horizontal carousels keep every card in the same y range.
 *
 * @param index - Zero-based card index in the carousel.
 * @param contentOffsetX - Horizontal scroll offset of the carousel.
 * @param viewportWidth - Width of the carousel viewport.
 * @param threshold - Fraction of card width that must be visible. Defaults to 50%.
 * @returns True when the visible fraction of the card is at least `threshold`.
 */
export const isWhatsHappeningCardVisible = (
  index: number,
  contentOffsetX: number,
  viewportWidth: number,
  threshold = WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD,
): boolean => {
  if (viewportWidth <= 0) {
    return false;
  }

  const cardStart = getWhatsHappeningCardContentStart(index);
  const cardEnd = cardStart + WHATS_HAPPENING_CARD_WIDTH;
  const viewportEnd = contentOffsetX + viewportWidth;
  const visibleStart = Math.max(cardStart, contentOffsetX);
  const visibleEnd = Math.min(cardEnd, viewportEnd);
  const visibleWidth = visibleEnd - visibleStart;

  if (visibleWidth <= 0) {
    return false;
  }

  return visibleWidth / WHATS_HAPPENING_CARD_WIDTH >= threshold;
};
