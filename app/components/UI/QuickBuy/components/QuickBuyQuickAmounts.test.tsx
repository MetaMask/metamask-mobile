import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import QuickBuyQuickAmounts from './QuickBuyQuickAmounts';
import { useQuickBuyContext } from '../useQuickBuyContext';
import { ImpactMoment, useHaptics } from '../../../../util/haptics';
import renderWithProvider from '../../../../util/test/renderWithProvider';

jest.mock('../useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockPlayImpact = jest.fn();

jest.mock('../../../../util/haptics', () => ({
  ...jest.requireActual<typeof import('../../../../util/haptics')>(
    '../../../../util/haptics',
  ),
  useHaptics: jest.fn(),
}));

const baseContext = {
  tradeMode: 'buy' as const,
  currentCurrency: 'USD',
  buyQuickAmounts: [10, 50, 100, 250] as [number, number, number, number],
  sellQuickPercentages: [25, 50, 75, 100] as [number, number, number, number],
  isQuickAmountPreferencesLoaded: true,
  hasSourcePrice: true,
  isSliderDisabled: false,
  handleQuickAmountPress: jest.fn(),
  handleSliderChange: jest.fn(),
  handleSliderDragEnd: jest.fn(),
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

  it('renders skeleton pills while quick amount preferences are loading', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      isQuickAmountPreferencesLoaded: false,
    });

    renderWithProvider(<QuickBuyQuickAmounts />);

    expect(
      screen.getAllByTestId('quick-buy-quick-amount-pill-skeleton'),
    ).toHaveLength(4);
    expect(screen.getByTestId('quick-buy-buy-pill-loading-0')).toBeDisabled();
    expect(screen.queryByTestId('quick-buy-buy-pill-10')).not.toBeOnTheScreen();
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

  it('dismisses the keypad when a buy pill is tapped', async () => {
    const setIsKeypadOpen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      setIsKeypadOpen,
    });

    renderWithProvider(<QuickBuyQuickAmounts />);

    fireEvent.press(screen.getByTestId('quick-buy-buy-pill-50'));

    await waitFor(() => {
      expect(baseContext.handleQuickAmountPress).toHaveBeenCalledWith(50, 50);
    });
    expect(setIsKeypadOpen).toHaveBeenCalledWith(false);
  });

  it('dismisses the keypad when a sell pill is tapped', async () => {
    const setIsKeypadOpen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      tradeMode: 'sell',
      setIsKeypadOpen,
    });

    renderWithProvider(<QuickBuyQuickAmounts />);

    fireEvent.press(screen.getByTestId('quick-buy-sell-pill-75'));

    await waitFor(() => {
      expect(baseContext.handleSliderChange).toHaveBeenCalledWith(75);
      expect(baseContext.handleSliderDragEnd).toHaveBeenCalledWith(75);
    });
    expect(setIsKeypadOpen).toHaveBeenCalledWith(false);
  });

  it('renders the Done button when showDone is true', () => {
    const onDonePress = jest.fn();
    renderWithProvider(
      <QuickBuyQuickAmounts showDone onDonePress={onDonePress} />,
    );

    fireEvent.press(screen.getByTestId('quick-buy-keypad-done'));

    expect(onDonePress).toHaveBeenCalledTimes(1);
  });

  it('keeps the compact suffix of a custom buy amount readable at large OS font sizes', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      buyQuickAmounts: [10, 50, 100, 25000] as [number, number, number, number],
    });

    renderWithProvider(<QuickBuyQuickAmounts />);

    // Without the cap ButtonBase clips the label (numberOfLines: 1 +
    // ellipsizeMode: 'clip'), turning "$25K" into "$25".
    const label = screen.getByText('$25K');
    expect(label.props.maxFontSizeMultiplier).toBe(1);
    expect(label.props.numberOfLines).toBe(1);
    expect(label.props.ellipsizeMode).toBe('tail');
  });

  it('sizes every pill in the row identically regardless of label length', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      buyQuickAmounts: [10, 50, 100, 25000] as [number, number, number, number],
    });

    renderWithProvider(
      <QuickBuyQuickAmounts showDone onDonePress={jest.fn()} />,
    );

    // Per-label auto-shrink would size "$25K" down while "$10" stays put,
    // leaving a ragged row.
    for (const text of ['$10', '$50', '$100', '$25K', 'Done']) {
      const label = screen.getByText(text);
      expect(label.props.adjustsFontSizeToFit).toBeUndefined();
      expect(label.props.maxFontSizeMultiplier).toBe(1);
    }
  });

  it('applies the same font-scaling guards to sell pills and the Done button', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      tradeMode: 'sell',
    });

    renderWithProvider(
      <QuickBuyQuickAmounts showDone onDonePress={jest.fn()} />,
    );

    for (const label of [screen.getByText('75%'), screen.getByText('Done')]) {
      expect(label.props.maxFontSizeMultiplier).toBe(1);
      expect(label.props.ellipsizeMode).toBe('tail');
    }
  });
});
