import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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

jest.mock('../utils/quickBuyQuickAmounts', () => ({
  getBuyQuickAmounts: jest.fn(() => [
    { value: 10, label: '$10', presetTierUsd: 10 },
    { value: 50, label: '$50', presetTierUsd: 50 },
    { value: 100, label: '$100', presetTierUsd: 100 },
    { value: 250, label: '$250', presetTierUsd: 250 },
  ]),
  SELL_QUICK_PERCENTAGES: [25, 50, 75, 100],
}));

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
  usdToCurrentCurrencyRate: 1,
  hasSourcePrice: true,
  isSliderDisabled: false,
  handleQuickAmountPress: jest.fn(),
  handleSliderChange: jest.fn(),
  handleSliderDragEnd: jest.fn(),
  useKeyboard: false,
  setIsKeypadOpen: jest.fn(),
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

    expect(screen.getByText('$10')).toBeOnTheScreen();
    expect(screen.getByText('$250')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('$50'));

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

  it('dismisses the keypad on the keyboard treatment when a buy pill is tapped', async () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      useKeyboard: true,
    });

    renderWithProvider(<QuickBuyQuickAmounts />);

    fireEvent.press(screen.getByText('$50'));

    await waitFor(() => {
      expect(baseContext.setIsKeypadOpen).toHaveBeenCalledWith(false);
      expect(baseContext.handleQuickAmountPress).toHaveBeenCalledWith(50, 50);
    });
  });

  it('does not toggle the keypad on the slider control variant', async () => {
    renderWithProvider(<QuickBuyQuickAmounts />);

    fireEvent.press(screen.getByText('$50'));

    await waitFor(() => {
      expect(baseContext.handleQuickAmountPress).toHaveBeenCalledWith(50, 50);
    });
    expect(baseContext.setIsKeypadOpen).not.toHaveBeenCalled();
  });
});
