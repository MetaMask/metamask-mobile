import { createArcPath } from './TokenIconWithSpinner.utils';

describe('createArcPath', () => {
  const defaultCenter = 20;
  const defaultRadius = 18;

  describe('arc path format', () => {
    it('returns SVG path string with correct format', () => {
      const result = createArcPath(0, 20, defaultCenter, defaultRadius);

      expect(result).toMatch(/^M .+ .+ A .+ .+ 0 [01] 1 .+ .+$/);
    });

    it('includes move command with start coordinates', () => {
      const result = createArcPath(0, 20, defaultCenter, defaultRadius);

      expect(result).toContain('M ');
    });

    it('includes arc command with radius values', () => {
      const result = createArcPath(0, 20, defaultCenter, defaultRadius);

      expect(result).toContain(`A ${defaultRadius} ${defaultRadius}`);
    });
  });

  describe('start coordinates calculation', () => {
    it('calculates start point at 0 degrees (right side of circle)', () => {
      const result = createArcPath(0, 10, defaultCenter, defaultRadius);

      // At 0 degrees: x = center + radius, y = center
      expect(result).toContain(
        `M ${defaultCenter + defaultRadius} ${defaultCenter}`,
      );
    });

    it('calculates start point at 90 degrees (bottom of circle)', () => {
      const result = createArcPath(90, 100, defaultCenter, defaultRadius);

      // At 90 degrees: x = center, y = center + radius
      const expectedX =
        defaultCenter + defaultRadius * Math.cos((90 * Math.PI) / 180);
      const expectedY =
        defaultCenter + defaultRadius * Math.sin((90 * Math.PI) / 180);

      expect(result).toContain(`M ${expectedX} ${expectedY}`);
    });

    it('calculates start point at 180 degrees (left side of circle)', () => {
      const result = createArcPath(180, 190, defaultCenter, defaultRadius);

      const expectedX =
        defaultCenter + defaultRadius * Math.cos((180 * Math.PI) / 180);
      const expectedY =
        defaultCenter + defaultRadius * Math.sin((180 * Math.PI) / 180);

      expect(result).toContain(`M ${expectedX} ${expectedY}`);
    });
  });

  describe('large arc flag', () => {
    it('sets large arc flag to 0 when arc spans less than 180 degrees', () => {
      const result = createArcPath(0, 90, defaultCenter, defaultRadius);

      // Format: A rx ry x-axis-rotation large-arc-flag sweep-flag x y
      expect(result).toMatch(/A \d+ \d+ 0 0 1/);
    });

    it('sets large arc flag to 0 when arc spans exactly 180 degrees', () => {
      const result = createArcPath(0, 180, defaultCenter, defaultRadius);

      expect(result).toMatch(/A \d+ \d+ 0 0 1/);
    });

    it('sets large arc flag to 1 when arc spans more than 180 degrees', () => {
      const result = createArcPath(0, 270, defaultCenter, defaultRadius);

      expect(result).toMatch(/A \d+ \d+ 0 1 1/);
    });

    it('sets large arc flag to 1 for full circle arc', () => {
      const result = createArcPath(0, 359, defaultCenter, defaultRadius);

      expect(result).toMatch(/A \d+ \d+ 0 1 1/);
    });
  });

  describe('different center and radius values', () => {
    it('generates path with custom center value', () => {
      const customCenter = 50;
      const result = createArcPath(0, 20, customCenter, defaultRadius);

      expect(result).toContain(`M ${customCenter + defaultRadius}`);
    });

    it('generates path with custom radius value', () => {
      const customRadius = 30;
      const result = createArcPath(0, 20, defaultCenter, customRadius);

      expect(result).toContain(`A ${customRadius} ${customRadius}`);
    });

    it('generates path with both custom center and radius', () => {
      const customCenter = 40;
      const customRadius = 35;
      const result = createArcPath(0, 20, customCenter, customRadius);

      expect(result).toContain(
        `M ${customCenter + customRadius} ${customCenter}`,
      );
      expect(result).toContain(`A ${customRadius} ${customRadius}`);
    });
  });

  describe('edge cases', () => {
    it('handles zero degree arc', () => {
      const result = createArcPath(0, 0, defaultCenter, defaultRadius);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('handles negative start angle', () => {
      const result = createArcPath(-45, 45, defaultCenter, defaultRadius);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('handles angles greater than 360 degrees', () => {
      const result = createArcPath(0, 450, defaultCenter, defaultRadius);

      expect(result).toBeDefined();
      expect(result).toMatch(/A \d+ \d+ 0 1 1/);
    });
  });
});
