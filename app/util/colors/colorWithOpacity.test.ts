import { colorWithOpacity } from './colorWithOpacity';

describe('colorWithOpacity', () => {
  describe('6-character hex colors', () => {
    it('converts #RRGGBB to rgba with specified opacity', () => {
      expect(colorWithOpacity('#FF0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(colorWithOpacity('#00FF00', 1)).toBe('rgba(0, 255, 0, 1)');
      expect(colorWithOpacity('#0000FF', 0)).toBe('rgba(0, 0, 255, 0)');
    });

    it('handles lowercase hex', () => {
      expect(colorWithOpacity('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('handles mixed case hex', () => {
      expect(colorWithOpacity('#FfAaBb', 0.5)).toBe('rgba(255, 170, 187, 0.5)');
    });
  });

  describe('8-character hex colors', () => {
    it('converts #RRGGBBAA to rgba, replacing original alpha', () => {
      expect(colorWithOpacity('#FF0000FF', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(colorWithOpacity('#00FF0080', 1)).toBe('rgba(0, 255, 0, 1)');
    });
  });

  describe('3-character hex colors', () => {
    it('converts #RGB to rgba by expanding to #RRGGBB', () => {
      expect(colorWithOpacity('#F00', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(colorWithOpacity('#0F0', 1)).toBe('rgba(0, 255, 0, 1)');
      expect(colorWithOpacity('#00F', 0)).toBe('rgba(0, 0, 255, 0)');
    });

    it('handles lowercase 3-char hex', () => {
      expect(colorWithOpacity('#abc', 0.5)).toBe('rgba(170, 187, 204, 0.5)');
    });
  });

  describe('4-character hex colors', () => {
    it('converts #RGBA to rgba, replacing original alpha', () => {
      expect(colorWithOpacity('#F00F', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
      expect(colorWithOpacity('#0F08', 1)).toBe('rgba(0, 255, 0, 1)');
    });
  });

  describe('rgb() format', () => {
    it('converts rgb(r, g, b) to rgba', () => {
      expect(colorWithOpacity('rgb(255, 0, 0)', 0.5)).toBe(
        'rgba(255, 0, 0, 0.5)',
      );
      expect(colorWithOpacity('rgb(0, 255, 0)', 1)).toBe('rgba(0, 255, 0, 1)');
    });

    it('handles spaces in rgb format', () => {
      expect(colorWithOpacity('rgb( 255 , 128 , 64 )', 0.5)).toBe(
        'rgba(255, 128, 64, 0.5)',
      );
    });
  });

  describe('rgba() format', () => {
    it('converts rgba(r, g, b, a) replacing original alpha', () => {
      expect(colorWithOpacity('rgba(255, 0, 0, 1)', 0.5)).toBe(
        'rgba(255, 0, 0, 0.5)',
      );
      expect(colorWithOpacity('rgba(0, 255, 0, 0.8)', 0)).toBe(
        'rgba(0, 255, 0, 0)',
      );
    });
  });

  describe('edge cases', () => {
    it('trims whitespace from input', () => {
      expect(colorWithOpacity('  #FF0000  ', 0.5)).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('returns transparent fallback for invalid colors in dev mode', () => {
      const result = colorWithOpacity('not-a-color', 0.5);
      expect(result).toBe('rgba(0, 0, 0, 0)');
    });

    it('handles opacity of 0', () => {
      expect(colorWithOpacity('#FFFFFF', 0)).toBe('rgba(255, 255, 255, 0)');
    });

    it('handles opacity of 1', () => {
      expect(colorWithOpacity('#000000', 1)).toBe('rgba(0, 0, 0, 1)');
    });
  });
});
