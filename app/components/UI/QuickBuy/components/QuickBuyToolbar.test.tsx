import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import QuickBuyToolbar from './QuickBuyToolbar';
import { useQuickBuyContext } from '../useQuickBuyContext';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const baseContext = {
  onClose: jest.fn(),
  features: {
    tradeModes: ['buy'] as ('buy' | 'sell')[],
    quickAmountPills: true,
  },
  tradeMode: 'buy' as const,
  setTradeMode: jest.fn(),
  sourceToken: { chainId: '0x1' },
  destToken: { chainId: '0x2105' },
};

describe('QuickBuyToolbar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue(baseContext);
  });

  it('hides the trade mode toggle when only buy mode is enabled', () => {
    render(<QuickBuyToolbar />);
    expect(screen.queryByTestId('quick-buy-trade-mode-toggle')).toBeNull();
  });

  it('hides the trade mode toggle when sell is unavailable due to zero balance', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      features: { tradeModes: ['buy', 'sell'], quickAmountPills: true },
      hasSellableBalance: false,
    });
    render(<QuickBuyToolbar />);
    expect(screen.queryByTestId('quick-buy-trade-mode-toggle')).toBeNull();
  });

  it('renders the Buy/Sell toggle when both modes are enabled and sellable', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      features: { tradeModes: ['buy', 'sell'], quickAmountPills: true },
      hasSellableBalance: true,
    });
    render(<QuickBuyToolbar />);
    expect(screen.getByTestId('quick-buy-trade-mode-toggle')).toBeOnTheScreen();
  });

  it('opens the slippage sheet when the settings gear is pressed', () => {
    render(<QuickBuyToolbar />);
    fireEvent.press(screen.getByTestId('quick-buy-settings-button'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: { sourceChainId: '0x1', destChainId: '0x2105' },
    });
  });
});
