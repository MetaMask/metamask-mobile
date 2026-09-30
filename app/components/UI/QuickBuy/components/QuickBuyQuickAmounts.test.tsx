import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
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
  sellQuickPercentages: [25, 50, 75, 100] as [number, number, number, number],
  hasSourcePrice: true,
  isSliderDisabled: false,
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

  it.each(['buy', 'sell'] as const)(
    'renders percentage pills in %s mode and commits via the slider handlers',
    async (tradeMode) => {
      (useQuickBuyContext as jest.Mock).mockReturnValue({
        ...baseContext,
        tradeMode,
      });

      renderWithProvider(<QuickBuyQuickAmounts />);

      expect(screen.getByText('25%')).toBeOnTheScreen();
      expect(
        screen.getByText('social_leaderboard.quick_buy.max'),
      ).toBeOnTheScreen();

      fireEvent.press(screen.getByTestId('quick-buy-percent-pill-75'));

      await waitFor(() => {
        expect(mockPlayImpact).toHaveBeenCalledWith(
          ImpactMoment.QuickAmountSelection,
        );
        expect(baseContext.handleSliderChange).toHaveBeenCalledWith(75);
        expect(baseContext.handleSliderDragEnd).toHaveBeenCalledWith(75);
      });
      expect(baseContext.setIsKeypadOpen).toHaveBeenCalledWith(false);
    },
  );

  it('uses only handleSliderChange for unpriced sources', async () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue({
      ...baseContext,
      hasSourcePrice: false,
    });

    renderWithProvider(<QuickBuyQuickAmounts />);

    fireEvent.press(screen.getByText('50%'));

    await waitFor(() => {
      expect(baseContext.handleSliderChange).toHaveBeenCalledWith(50);
      expect(baseContext.handleSliderDragEnd).not.toHaveBeenCalled();
    });
  });

  it('renders the Done button when showDone is true', () => {
    const onDonePress = jest.fn();
    renderWithProvider(
      <QuickBuyQuickAmounts showDone onDonePress={onDonePress} />,
    );

    fireEvent.press(screen.getByTestId('quick-buy-keypad-done'));

    expect(onDonePress).toHaveBeenCalledTimes(1);
  });

  it('applies the same font-scaling guards to every pill and the Done button', () => {
    renderWithProvider(
      <QuickBuyQuickAmounts showDone onDonePress={jest.fn()} />,
    );

    for (const text of ['25%', 'social_leaderboard.quick_buy.max', 'Done']) {
      const label = screen.getByText(text);
      expect(label.props.adjustsFontSizeToFit).toBeUndefined();
      expect(label.props.maxFontSizeMultiplier).toBe(1);
      expect(label.props.ellipsizeMode).toBe('tail');
    }
  });
});
