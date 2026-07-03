import { useCallback, useState, useMemo } from 'react';
import { LayoutChangeEvent } from 'react-native';

const MAX_FONT_SIZE = 40;
const MIN_FONT_SIZE = 20;

/**
 * Safety factor to leave a small margin and prevent edge-case overflow
 * due to minor inaccuracies in character width estimation.
 */
const SAFETY_FACTOR = 0.95;

/**
 * Approximate character width ratios relative to fontSize
 * for numeric characters in the system font (SF Pro / Roboto).
 * Digits use tabular figures so they share the same width.
 */
const DIGIT_WIDTH_RATIO = 0.6;
const NARROW_CHAR_WIDTH_RATIO = 0.3;
const DEFAULT_CHAR_WIDTH_RATIO = 0.6;

const NARROW_CHARS = new Set(['.', ',']);

/**
 * Calculates the sum of per-character width ratios for a given text string.
 * Uses different ratios for digits, narrow characters (period, comma),
 * and a default fallback for any other characters.
 */
export const getTextWidthRatio = (text: string): number => {
  let totalRatio = 0;
  for (const char of text) {
    if (NARROW_CHARS.has(char)) {
      totalRatio += NARROW_CHAR_WIDTH_RATIO;
    } else if (char >= '0' && char <= '9') {
      totalRatio += DIGIT_WIDTH_RATIO;
    } else {
      totalRatio += DEFAULT_CHAR_WIDTH_RATIO;
    }
  }
  return totalRatio;
};

/**
 * Calculates the optimal font size so that a given text fits
 * within a specified container width, clamped between min and max bounds.
 *
 * @param text - The text to fit.
 * @param containerWidth - The available width in pixels.
 * @param maxFontSize - Upper bound for the font size. Defaults to 40.
 * @param minFontSize - Lower bound for the font size. Defaults to 16.
 * @returns The calculated font size.
 */
export const calculateFontSizeForWidth = (
  text: string,
  containerWidth: number,
  maxFontSize = MAX_FONT_SIZE,
  minFontSize = MIN_FONT_SIZE,
): number => {
  if (!containerWidth || !text || text.length === 0) {
    return maxFontSize;
  }

  const totalRatio = getTextWidthRatio(text);

  if (totalRatio === 0) return maxFontSize;

  const idealFontSize = (containerWidth * SAFETY_FACTOR) / totalRatio;

  return Math.max(
    minFontSize,
    Math.min(maxFontSize, Math.floor(idealFontSize)),
  );
};

/**
 * Hook that dynamically calculates the font size so a text string
 * fits within its measured container width.
 *
 * Attach the returned `onContainerLayout` to the container's `onLayout`
 * prop so the hook can measure available width.
 *
 * @param options.text - The text to size.
 * @param options.maxFontSize - Upper bound for font size. Defaults to 40.
 * @param options.minFontSize - Lower bound for font size. Defaults to 16.
 * @returns `{ fontSize, onContainerLayout }`
 */
export const useAutoSizingFont = ({
  text,
  maxFontSize = MAX_FONT_SIZE,
  minFontSize = MIN_FONT_SIZE,
}: {
  text: string;
  maxFontSize?: number;
  minFontSize?: number;
}) => {
  const [containerWidth, setContainerWidth] = useState(0);

  const onContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  }, []);

  const fontSize = useMemo(
    () =>
      containerWidth > 0
        ? calculateFontSizeForWidth(
            text,
            containerWidth,
            maxFontSize,
            minFontSize,
          )
        : maxFontSize,
    [text, containerWidth, maxFontSize, minFontSize],
  );

  return { fontSize, onContainerLayout };
};
