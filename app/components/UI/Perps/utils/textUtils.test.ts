import { LayoutChangeEvent } from 'react-native';
import { hasNonLatinCharacters, createFontScaleHandler } from './textUtils';

describe('textUtils', () => {
  describe('hasNonLatinCharacters', () => {
    describe('returns false for Latin-only text', () => {
      it('returns false for English text', () => {
        expect(hasNonLatinCharacters('Hello World')).toBe(false);
      });

      it('returns false for Spanish text', () => {
        expect(hasNonLatinCharacters('Hola Mundo')).toBe(false);
      });

      it('returns false for text with accented Latin characters', () => {
        expect(hasNonLatinCharacters('café résumé naïve')).toBe(false);
      });

      it('returns false for empty string', () => {
        expect(hasNonLatinCharacters('')).toBe(false);
      });

      it('returns false for numbers and punctuation only', () => {
        expect(hasNonLatinCharacters('123 !@# $%^ &*() .,?')).toBe(false);
      });

      it('returns false for mixed Latin, numbers, and punctuation', () => {
        expect(hasNonLatinCharacters('PERPS Trading 2024!')).toBe(false);
      });
    });

    describe('returns true for non-Latin text', () => {
      it('returns true for Greek characters', () => {
        expect(hasNonLatinCharacters('Αλφα Βητα Γάμμα')).toBe(true);
      });

      it('returns true for Cyrillic characters', () => {
        expect(hasNonLatinCharacters('Привет мир')).toBe(true);
      });

      it('returns true for Hebrew characters', () => {
        expect(hasNonLatinCharacters('שלום עולם')).toBe(true);
      });

      it('returns true for Arabic characters', () => {
        expect(hasNonLatinCharacters('مرحبا بالعالم')).toBe(true);
      });

      it('returns true for Chinese characters', () => {
        expect(hasNonLatinCharacters('你好世界')).toBe(true);
      });

      it('returns true for Japanese Hiragana', () => {
        expect(hasNonLatinCharacters('こんにちは')).toBe(true);
      });

      it('returns true for Japanese Katakana', () => {
        expect(hasNonLatinCharacters('コンニチハ')).toBe(true);
      });

      it('returns true for Korean Hangul', () => {
        expect(hasNonLatinCharacters('안녕하세요')).toBe(true);
      });

      it('returns true for mixed Latin and non-Latin text', () => {
        expect(hasNonLatinCharacters('Hello 안녕하세요')).toBe(true);
      });

      it('returns true for text with parentheses containing Latin text', () => {
        expect(hasNonLatinCharacters('무기한 선물을 (PERPS)')).toBe(true);
      });
    });
  });

  describe('createFontScaleHandler', () => {
    const mockSetter = jest.fn();
    const mockConfig = {
      maxHeight: 100,
      currentFontSize: 48,
      setter: mockSetter,
      minFontSize: 24,
      currentValue: null,
    };

    const createMockLayoutEvent = (height: number): LayoutChangeEvent => ({
      nativeEvent: {
        layout: {
          x: 0,
          y: 0,
          width: 200,
          height,
        },
      },
      currentTarget: null as never,
      target: null as never,
      bubbles: false,
      cancelable: false,
      defaultPrevented: false,
      eventPhase: 0,
      isTrusted: false,
      preventDefault: jest.fn(),
      isDefaultPrevented: jest.fn(() => false),
      stopPropagation: jest.fn(),
      isPropagationStopped: jest.fn(() => false),
      persist: jest.fn(),
      timeStamp: Date.now(),
      type: 'layout',
    });

    beforeEach(() => {
      mockSetter.mockClear();
    });

    describe('function creation', () => {
      it('returns a function when called with config', () => {
        const handler = createFontScaleHandler(mockConfig);
        expect(typeof handler).toBe('function');
      });
    });

    describe('scaling logic', () => {
      it('calls setter when height exceeds maxHeight and currentValue is null', () => {
        const handler = createFontScaleHandler(mockConfig);
        const event = createMockLayoutEvent(150); // Height > maxHeight (100)

        handler(event);

        expect(mockSetter).toHaveBeenCalledTimes(1);
        // scaleFactor = 100 / 150 = 0.667
        // newFontSize = 48 * 0.667 = 32
        expect(mockSetter).toHaveBeenCalledWith(32);
      });

      it('does not call setter when height is within maxHeight', () => {
        const handler = createFontScaleHandler(mockConfig);
        const event = createMockLayoutEvent(80); // Height < maxHeight (100)

        handler(event);

        expect(mockSetter).not.toHaveBeenCalled();
      });

      it('does not call setter when currentValue is already set', () => {
        const configWithValue = { ...mockConfig, currentValue: 36 };
        const handler = createFontScaleHandler(configWithValue);
        const event = createMockLayoutEvent(150); // Height > maxHeight

        handler(event);

        expect(mockSetter).not.toHaveBeenCalled();
      });

      it('respects minimum font size constraint', () => {
        const handler = createFontScaleHandler(mockConfig);
        const event = createMockLayoutEvent(400); // Very large height

        handler(event);

        expect(mockSetter).toHaveBeenCalledTimes(1);
        // scaleFactor = 100 / 400 = 0.25
        // calculated = 48 * 0.25 = 12, but minFontSize is 24
        expect(mockSetter).toHaveBeenCalledWith(24);
      });

      it('calculates correct scaled font size for moderate overflow', () => {
        const handler = createFontScaleHandler(mockConfig);
        const event = createMockLayoutEvent(120);

        handler(event);

        expect(mockSetter).toHaveBeenCalledTimes(1);
        // scaleFactor = 100 / 120 = 0.833
        // newFontSize = 48 * 0.833 = 40
        expect(mockSetter).toHaveBeenCalledWith(40);
      });
    });

    describe('edge cases', () => {
      it('handles zero maxHeight gracefully', () => {
        const configWithZero = { ...mockConfig, maxHeight: 0 };
        const handler = createFontScaleHandler(configWithZero);
        const event = createMockLayoutEvent(50);

        handler(event);

        expect(mockSetter).toHaveBeenCalledWith(mockConfig.minFontSize);
      });

      it('handles minFontSize larger than currentFontSize', () => {
        const configWithLargeMin = {
          ...mockConfig,
          currentFontSize: 20,
          minFontSize: 30,
        };
        const handler = createFontScaleHandler(configWithLargeMin);
        const event = createMockLayoutEvent(150);

        handler(event);

        expect(mockSetter).toHaveBeenCalledWith(30); // Should use minFontSize
      });

      it('handles very small scale factor', () => {
        const handler = createFontScaleHandler(mockConfig);
        const event = createMockLayoutEvent(1000); // Extremely large height

        handler(event);

        expect(mockSetter).toHaveBeenCalledWith(mockConfig.minFontSize);
      });

      it('handles height equal to maxHeight', () => {
        const handler = createFontScaleHandler(mockConfig);
        const event = createMockLayoutEvent(100); // Height = maxHeight

        handler(event);

        expect(mockSetter).not.toHaveBeenCalled();
      });
    });
  });
});
