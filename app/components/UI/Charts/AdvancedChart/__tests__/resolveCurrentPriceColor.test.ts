import { resolveCurrentPriceColor } from '../AdvancedChart.types';

const themeSuccessDefault = 'theme-success';

describe('resolveCurrentPriceColor', () => {
  it('falls back to themeSuccessDefault when everything is omitted', () => {
    expect(resolveCurrentPriceColor({ themeSuccessDefault })).toBe(
      'theme-success',
    );
  });

  it('uses successColorOverride when lineColorOverride is unset', () => {
    expect(
      resolveCurrentPriceColor({
        successColorOverride: 'success-color',
        themeSuccessDefault,
      }),
    ).toBe('success-color');
  });

  it('prefers lineColorOverride over successColorOverride', () => {
    expect(
      resolveCurrentPriceColor({
        lineColorOverride: 'line-color',
        successColorOverride: 'success-color',
        themeSuccessDefault,
      }),
    ).toBe('line-color');
  });

  it('prefers currentPriceLineColorOverride over line/success colors', () => {
    expect(
      resolveCurrentPriceColor({
        currentPriceLineColorOverride: 'current-color',
        lineColorOverride: 'line-color',
        themeSuccessDefault,
      }),
    ).toBe('current-color');
  });

  it('prefers lastValuePillColor over everything else', () => {
    expect(
      resolveCurrentPriceColor({
        lastValuePillColor: 'pill-color',
        currentPriceLineColorOverride: 'current-color',
        lineColorOverride: 'line-color',
        successColorOverride: 'success-color',
        themeSuccessDefault,
      }),
    ).toBe('pill-color');
  });
});
