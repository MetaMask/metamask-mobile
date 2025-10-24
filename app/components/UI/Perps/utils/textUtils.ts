import { LayoutChangeEvent } from 'react-native';

// Detect if text contains non-Latin characters
export const hasNonLatinCharacters = (text: string): boolean => {
  // Check for common non-Latin Unicode ranges
  const nonLatinRanges = [
    /[\u0370-\u03FF]/, // Greek
    /[\u0400-\u04FF]/, // Cyrillic
    /[\u0590-\u05FF]/, // Hebrew
    /[\u0600-\u06FF]/, // Arabic
    /[\u4E00-\u9FFF]/, // CJK Ideographs (Chinese)
    /[\u3040-\u309F]/, // Hiragana
    /[\u30A0-\u30FF]/, // Katakana
    /[\uAC00-\uD7AF]/, // Hangul (Korean)
  ];

  return nonLatinRanges.some((range) => range.test(text));
};

export const createFontScaleHandler =
  (config: {
    maxHeight: number;
    currentFontSize: number;
    setter: (size: number) => void;
    minFontSize: number;
    currentValue: number | null;
  }) =>
  (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;

    if (height > config.maxHeight && config.currentValue === null) {
      const scaleFactor = config.maxHeight / height;
      const newFontSize = Math.max(
        config.currentFontSize * scaleFactor,
        config.minFontSize,
      );
      config.setter(newFontSize);
    }
  };
