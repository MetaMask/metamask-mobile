import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { TextColor } from '@metamask/design-system-react-native';
import {
  formatCloseSummaryFiat,
  formatSignedCloseSummaryFiat,
  getCloseSummaryPnlColor,
} from './closeSummaryFormat';

describe('closeSummaryFormat', () => {
  it.each([
    [1020, '$1,020'],
    [undefined, PERPS_CONSTANTS.FallbackDataDisplay],
  ])('formats the close amount %s as %s', (amount, expected) => {
    const formatted = formatCloseSummaryFiat(amount);

    expect(formatted).toBe(expected);
  });

  it.each([
    [-50, '-$50'],
    [0.49, '+$0.49'],
    [undefined, PERPS_CONSTANTS.FallbackDataDisplay],
  ])('signs the P&L %s as %s', (pnl, expected) => {
    const formatted = formatSignedCloseSummaryFiat(pnl);

    expect(formatted).toBe(expected);
  });

  it.each([
    [-1, TextColor.ErrorDefault],
    [0, TextColor.SuccessDefault],
    [undefined, TextColor.TextDefault],
  ])('colors the P&L %s as %s', (pnl, expected) => {
    const color = getCloseSummaryPnlColor(pnl);

    expect(color).toBe(expected);
  });
});
