import { resolveCurrentPriceColor } from '../AdvancedChart.types';

describe('resolveCurrentPriceColor', () => {
  const themeSuccessDefault = 'theme-success-token';

  it('prefers lastValuePillColor over currentPriceLineColorOverride and line color', () => {
    expect(
      resolveCurrentPriceColor({
        lastValuePillColor: 'pill-color',
        currentPriceLineColorOverride: 'current-color',
        lineColorOverride: 'line-color',
        themeSuccessDefault,
      }),
    ).toBe('pill-color');
  });

  it('falls back to currentPriceLineColorOverride then line color', () => {
    expect(
      resolveCurrentPriceColor({
        currentPriceLineColorOverride: 'current-color',
        lineColorOverride: 'line-color',
        themeSuccessDefault,
      }),
    ).toBe('current-color');

    expect(
      resolveCurrentPriceColor({
        lineColorOverride: 'line-color',
        themeSuccessDefault,
      }),
    ).toBe('line-color');
  });
});
