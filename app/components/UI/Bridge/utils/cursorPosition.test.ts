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

      expect(
        mapFormattedCursorToRaw({
          rawValue: '1000000',
          formattedValue: '1,000,000',
          formattedCursorIndex: 5,
        }),
      ).toBe(4);
    });

    it('maps locale decimal separator cursor to raw index', () => {
      expect(
        mapFormattedCursorToRaw({
          rawValue: '1234.56',
          formattedValue: '1.234,56',
          formattedCursorIndex: 6,
        }),
      ).toBe(5);
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

      expect(
        mapRawCursorToFormatted({
          rawValue: '1000000',
          formattedValue: '1,000,000',
          rawCursorIndex: 4,
        }),
      ).toBe(5);
    });

    it('maps raw decimal cursor to locale decimal cursor', () => {
      expect(
        mapRawCursorToFormatted({
          rawValue: '1234.56',
          formattedValue: '1.234,56',
          rawCursorIndex: 5,
        }),
      ).toBe(6);
    });
  });
});
