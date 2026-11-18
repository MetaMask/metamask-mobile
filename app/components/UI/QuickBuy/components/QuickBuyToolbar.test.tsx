import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { formatPriceWithSubscriptNotation } from '../../../../util/number/subscriptNotation';
import QuickBuyToolbar from './QuickBuyToolbar';
import { useQuickBuyContext } from '../useQuickBuyContext';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('./QuickBuyTokenIcon', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, vars?: { symbol?: string }) =>
    key.endsWith('sell_title') ? `Sell ${vars?.symbol ?? ''}` : key,
}));

const PUMP_PRICE = 0.003524833432906117;

// Unit, not component-view: the sheet preset prices USDC at $1.00, which
// both formatters render the same, and the header rate does not follow a
// TokenRatesController override. This locks the formatter at the label.
describe('QuickBuyToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formats a sub-cent sell price with the token page formatter', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      features: { tradeModes: ['buy', 'sell'] },
      hasSellableBalance: true,
      currentCurrency: 'usd',
      sourceToken: {
        symbol: 'PUMP',
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
        address: 'pump',
        currencyExchangeRate: PUMP_PRICE,
      },
      destToken: undefined,
      tokenPrice: PUMP_PRICE,
      target: { tokenSymbol: 'PUMP' },
      tradeMode: 'sell',
      setTradeMode: jest.fn(),
    });

    render(<QuickBuyToolbar />);

    expect(
      screen.getByText(formatPriceWithSubscriptNotation(PUMP_PRICE, 'usd')),
    ).toBeOnTheScreen();
    expect(screen.queryByText('$0.00')).not.toBeOnTheScreen();
  });
});
