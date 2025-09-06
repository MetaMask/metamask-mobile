import { transformSvgForReactNative, isValidSvgContent } from './svgTransform';

describe('svgTransform', () => {
  describe('isValidSvgContent', () => {
    it('returns true for valid SVG content', () => {
      expect(isValidSvgContent('<svg></svg>')).toBe(true);
      expect(isValidSvgContent('<?xml version="1.0"?><svg></svg>')).toBe(true);
    });

    it('returns false for invalid content', () => {
      expect(isValidSvgContent('<div>Not SVG</div>')).toBe(false);
      expect(isValidSvgContent('Just text')).toBe(false);
    });
  });

  describe('transformSvgForReactNative', () => {
    it('converts display-p3 colors to RGB', () => {
      const input = '<rect fill="color(display-p3 0.5 0.5 0.5)"/>';
      const output = transformSvgForReactNative(input);
      expect(output).toContain('rgb(128, 128, 128)');
      expect(output).not.toContain('display-p3');
    });

    it('removes filter elements', () => {
      const input =
        '<svg><filter id="blur"></filter><rect filter="url(#blur)"/></svg>';
      const output = transformSvgForReactNative(input);
      expect(output).not.toContain('<filter');
      expect(output).not.toContain('filter=');
    });

    it('removes mask elements', () => {
      const input =
        '<svg><mask id="mask"></mask><rect mask="url(#mask)"/></svg>';
      const output = transformSvgForReactNative(input);
      expect(output).not.toContain('<mask');
      expect(output).not.toContain('mask=');
    });

    it('converts CSS classes to inline styles', () => {
      const input =
        '<svg><style>.cls-1{fill:#ff0000;}</style><rect class="cls-1"/></svg>';
      const output = transformSvgForReactNative(input);
      expect(output).toContain('style="fill:#ff0000;"');
      expect(output).not.toContain('class=');
      expect(output).not.toContain('<style>');
    });

    it('removes clip-path elements and attributes', () => {
      const input =
        '<svg><clipPath id="clip"></clipPath><rect clip-path="url(#clip)"/></svg>';
      const output = transformSvgForReactNative(input);
      expect(output).not.toContain('<clipPath');
      expect(output).not.toContain('clip-path');
    });

    it('adds viewBox if missing', () => {
      const input = '<svg width="100" height="100"><rect/></svg>';
      const output = transformSvgForReactNative(input);
      expect(output).toContain('viewBox="0 0 100 100"');
    });

    it('preserves viewBox if already present', () => {
      const input = '<svg viewBox="0 0 50 50"><rect/></svg>';
      const output = transformSvgForReactNative(input);
      expect(output).toContain('viewBox="0 0 50 50"');
    });
  });
});
