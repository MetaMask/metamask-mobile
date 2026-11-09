import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { TextColor } from '@metamask/design-system-react-native';
import {
  formatCloseSummaryFiat,
  formatSignedCloseSummaryFiat,
  getCloseSummaryPnlColor,
} from './closeSummaryFormat';

describe('closeSummaryFormat', () => {
  it('formats a known amount and shows the unavailable state for an unknown one', () => {
    expect(formatCloseSummaryFiat(1020)).toBe('$1,020');
    expect(formatCloseSummaryFiat(undefined)).toBe(
      PERPS_CONSTANTS.FallbackDataDisplay,
    );
  });

  it('signs a P&L and keeps an unknown P&L unavailable rather than zero', () => {
    expect(formatSignedCloseSummaryFiat(-50)).toBe('-$50');
    expect(formatSignedCloseSummaryFiat(0.49)).toBe('+$0.49');
    expect(formatSignedCloseSummaryFiat(undefined)).toBe(
      PERPS_CONSTANTS.FallbackDataDisplay,
    );
  });

  it('colors a P&L by sign and leaves an unknown P&L neutral', () => {
    expect(getCloseSummaryPnlColor(-1)).toBe(TextColor.ErrorDefault);
    expect(getCloseSummaryPnlColor(0)).toBe(TextColor.SuccessDefault);
    expect(getCloseSummaryPnlColor(undefined)).toBe(TextColor.TextDefault);
  });
});
