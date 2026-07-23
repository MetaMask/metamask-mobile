import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import QuickBuyQuickAmounts from './QuickBuyQuickAmounts';
import { useQuickBuyContext } from '../useQuickBuyContext';
import { ImpactMoment, useHaptics } from '../../../../../../../util/haptics';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../utils/quickBuyQuickAmounts', () => {
  const actual = jest.requireActual('../utils/quickBuyQuickAmounts');
  return {
    ...actual,
    formatQuickBuyPillLabel: (value: number, currency: string) =>
      `${currency}:${value}`,
  };
});

const mockPlayImpact = jest.fn();

jest.mock('../../../../../../../util/haptics', () => ({
  ...jest.requireActual<typeof import('../../../../../../../util/haptics')>(
    '../../../../../../../util/haptics',
  ),
  useHaptics: jest.fn(),
}));

const baseContext = {
  tradeMode: 'buy' as const,
  currentCurrency: 'USD',
  buyQuickAmounts: [10, 50, 100, 250] as [number, number, number, number],
  sellQuickPercentages: [25, 50, 75, 100] as [number, number, number, number],
  hasSourcePrice: true,
  isSliderDisabled: false,
  handleQuickAmountPress: jest.fn(),
  handleSliderChange: jest.fn(),
  handleSliderDragEnd: jest.fn(),
};

describe('QuickBuyQuickAmounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useHaptics as jest.Mock).mockReturnValue({
      playImpact: mockPlayImpact,
    });
    (useQuickBuyContext as jest.Mock).mockReturnValue(baseContext);
  });

  it('renders buy pills and commits the tapped fiat amount', async () => {
    renderWithProvider(<QuickBuyQuickAmounts />);

    expect(screen.getByTestId('quick-buy-buy-pill-10')).toBeOnTheScreen();
    expect(screen.getByTestId('quick-buy-buy-pill-250')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('quick-buy-buy-pill-50'));

    await waitFor(() => {
      expect(mockPlayImpact).toHaveBeenCalledWith(
        ImpactMoment.QuickAmountSelection,
      );
      expect(baseContext.handleQuickAmountPress).toHaveBeenCalledWith(50, 50);
    });
  });

  it('renders sell percentage pills and commits via the slider handlers', async () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      tradeMode: 'sell',
    });

    renderWithProvider(<QuickBuyQuickAmounts />);

    expect(screen.getByText('25%')).toBeOnTheScreen();
    expect(
      screen.getByText('social_leaderboard.quick_buy.max'),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByText('75%'));

    await waitFor(() => {
      expect(baseContext.handleSliderChange).toHaveBeenCalledWith(75);
      expect(baseContext.handleSliderDragEnd).toHaveBeenCalledWith(75);
    });
  });

  it('uses only handleSliderChange for unpriced sell sources', async () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      tradeMode: 'sell',
      hasSourcePrice: false,
    });

    renderWithProvider(<QuickBuyQuickAmounts />);

    fireEvent.press(screen.getByText('50%'));

    await waitFor(() => {
      expect(baseContext.handleSliderChange).toHaveBeenCalledWith(50);
      expect(baseContext.handleSliderDragEnd).not.toHaveBeenCalled();
    });
  });
});
