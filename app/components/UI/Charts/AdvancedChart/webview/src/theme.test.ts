/* eslint-disable @metamask/design-tokens/color-no-hex */

import { generatePaletteShades, getSeriesColorOverrides } from './theme';

describe('generatePaletteShades', () => {
  it('returns exactly 19 shades', () => {
    expect(generatePaletteShades('#1c8a3c')).toHaveLength(19);
  });

  it('first shade is near white (lightest)', () => {
    const shades = generatePaletteShades('#1c8a3c');
    const r = parseInt(shades[0].slice(1, 3), 16);
    const g = parseInt(shades[0].slice(3, 5), 16);
    const b = parseInt(shades[0].slice(5, 7), 16);
    expect(r).toBeGreaterThan(200);
    expect(g).toBeGreaterThan(200);
    expect(b).toBeGreaterThan(200);
  });

  it('last shade is near black (darkest)', () => {
    const shades = generatePaletteShades('#1c8a3c');
    const r = parseInt(shades[18].slice(1, 3), 16);
    const g = parseInt(shades[18].slice(3, 5), 16);
    const b = parseInt(shades[18].slice(5, 7), 16);
    expect(r).toBeLessThan(20);
    expect(g).toBeLessThan(20);
    expect(b).toBeLessThan(20);
  });

  it('midpoint shade (index 9) equals the input color', () => {
    const shades = generatePaletteShades('#1c8a3c');
    expect(shades[9]).toBe('#1c8a3c');
  });

  it('all shades are valid 7-char hex strings', () => {
    const shades = generatePaletteShades('#ff6600');
    for (const s of shades) {
      expect(s).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('handles black input', () => {
    const shades = generatePaletteShades('#000000');
    expect(shades).toHaveLength(19);
    expect(shades[9]).toBe('#000000');
  });

  it('handles white input', () => {
    const shades = generatePaletteShades('#ffffff');
    expect(shades).toHaveLength(19);
    expect(shades[9]).toBe('#ffffff');
  });
});

describe('getSeriesColorOverrides', () => {
  it('sets line color to the given value', () => {
    const overrides = getSeriesColorOverrides('#28a745');
    expect(overrides['mainSeriesProperties.lineStyle.color']).toBe('#28a745');
  });

  it('sets linewidth to 2 across all series types', () => {
    const overrides = getSeriesColorOverrides('#28a745');
    expect(overrides['mainSeriesProperties.lineStyle.linewidth']).toBe(2);
    expect(
      overrides['mainSeriesProperties.lineWithMarkersStyle.linewidth'],
    ).toBe(2);
    expect(overrides['mainSeriesProperties.areaStyle.linewidth']).toBe(2);
    expect(overrides['mainSeriesProperties.baselineStyle.topLineWidth']).toBe(
      2,
    );
  });

  it('sets baseline fill colors to transparent', () => {
    const overrides = getSeriesColorOverrides('#28a745');
    expect(overrides['mainSeriesProperties.baselineStyle.topFillColor1']).toBe(
      'rgba(0,0,0,0)',
    );
    expect(
      overrides['mainSeriesProperties.baselineStyle.bottomFillColor2'],
    ).toBe('rgba(0,0,0,0)');
  });

  it('applies the same color to lineWithMarkers and area styles', () => {
    const overrides = getSeriesColorOverrides('#ff0000');
    expect(overrides['mainSeriesProperties.lineWithMarkersStyle.color']).toBe(
      '#ff0000',
    );
    expect(overrides['mainSeriesProperties.areaStyle.linecolor']).toBe(
      '#ff0000',
    );
  });
});
