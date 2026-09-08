import {
  mapFormattedCursorToRaw,
  mapRawCursorToFormatted,
} from './cursorPosition';

describe('cursorPosition utils', () => {
  describe('mapFormattedCursorToRaw', () => {
    it('maps grouped integer cursor to raw index', () => {
      expect(
        mapFormattedCursorToRaw({
          rawValue: '1000000',
          formattedValue: '1,000,000',
          formattedCursorIndex: 2,
        }),
      ).toBe(1);
    });
  });

  describe('mapRawCursorToFormatted', () => {
    it('maps raw cursor to grouped integer cursor', () => {
      expect(
        mapRawCursorToFormatted({
          rawValue: '1000000',
          formattedValue: '1,000,000',
          rawCursorIndex: 1,
        }),
      ).toBe(1);
    });
  });
});
