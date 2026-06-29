import { advancedChartLineChromePresets } from '../advancedChartLineChrome.presets';
import { resolveLineChromeOptions } from '../AdvancedChart.types';

describe('resolveLineChromeOptions', () => {
  it('defaults to TV built-ins when lineChrome is omitted', () => {
    expect(resolveLineChromeOptions()).toEqual({
      hideTimeScale: false,
      useCustomLineEndMarker: false,
      useCustomDashedLastPriceLine: false,
      useCustomPriceLabels: false,
    });
  });

  it('defaults to TV built-ins when lineChrome is null', () => {
    expect(resolveLineChromeOptions(null)).toEqual({
      hideTimeScale: false,
      useCustomLineEndMarker: false,
      useCustomDashedLastPriceLine: false,
      useCustomPriceLabels: false,
    });
  });

  it('respects explicit preset values and fills omitted keys from defaults', () => {
    expect(
      resolveLineChromeOptions(
        advancedChartLineChromePresets.tokenOverview.lineChrome,
      ),
    ).toEqual({
      hideTimeScale: false,
      useCustomLineEndMarker: false,
      useCustomDashedLastPriceLine: false,
      useCustomPriceLabels: false,
    });
  });

  it('merges partial lineChrome with built-in-first defaults', () => {
    expect(resolveLineChromeOptions({ useCustomLineEndMarker: true })).toEqual({
      hideTimeScale: false,
      useCustomLineEndMarker: true,
      useCustomDashedLastPriceLine: false,
      useCustomPriceLabels: false,
    });
  });
});
