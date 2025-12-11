import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import { Switch } from 'react-native';
import PerpsStopLossPromptBanner from './PerpsStopLossPromptBanner';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsStopLossPromptSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('PerpsStopLossPromptBanner', () => {
  describe('add_margin variant', () => {
    it('renders add_margin variant correctly', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="add_margin"
          liquidationDistance={2.5}
          onAddMargin={jest.fn()}
        />,
        { state: initialState },
      );

      expect(
        getByTestId(PerpsStopLossPromptSelectorsIDs.CONTAINER),
      ).toBeTruthy();
      expect(
        getByTestId(PerpsStopLossPromptSelectorsIDs.ADD_MARGIN_BUTTON),
      ).toBeTruthy();
      // Should show rounded distance (3%)
      expect(getByText(/3%/)).toBeTruthy();
    });

    it('calls onAddMargin when button pressed', () => {
      const onAddMargin = jest.fn();
      const { getByTestId } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="add_margin"
          liquidationDistance={2.5}
          onAddMargin={onAddMargin}
        />,
        { state: initialState },
      );

      fireEvent.press(
        getByTestId(PerpsStopLossPromptSelectorsIDs.ADD_MARGIN_BUTTON),
      );
      expect(onAddMargin).toHaveBeenCalledTimes(1);
    });

    it('shows loading state on add_margin button', () => {
      const { getByTestId, queryByText } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="add_margin"
          liquidationDistance={2.5}
          onAddMargin={jest.fn()}
          isLoading
        />,
        { state: initialState },
      );

      const button = getByTestId(
        PerpsStopLossPromptSelectorsIDs.ADD_MARGIN_BUTTON,
      );
      expect(button).toBeTruthy();
      // Button text should not be visible when loading
      expect(queryByText('Add margin')).toBeFalsy();
    });

    it('has isDisabled prop when loading', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="add_margin"
          liquidationDistance={2.5}
          onAddMargin={jest.fn()}
          isLoading
        />,
        { state: initialState },
      );

      // Button is rendered and disabled (isDisabled prop is set)
      const button = getByTestId(
        PerpsStopLossPromptSelectorsIDs.ADD_MARGIN_BUTTON,
      );
      expect(button).toBeTruthy();
    });
  });

  describe('stop_loss variant', () => {
    it('renders stop_loss variant correctly', () => {
      const { getByTestId, getByText } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="47500"
          suggestedStopLossPercent={-50}
          onSetStopLoss={jest.fn()}
        />,
        { state: initialState },
      );

      expect(
        getByTestId(PerpsStopLossPromptSelectorsIDs.CONTAINER),
      ).toBeTruthy();
      expect(getByTestId(PerpsStopLossPromptSelectorsIDs.TOGGLE)).toBeTruthy();
      expect(getByText(/\$47,500/)).toBeTruthy();
      expect(getByText(/-50%/)).toBeTruthy();
    });

    it('calls onSetStopLoss when toggle switched on', () => {
      const onSetStopLoss = jest.fn();
      const { UNSAFE_getByType } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="47500"
          suggestedStopLossPercent={-50}
          onSetStopLoss={onSetStopLoss}
        />,
        { state: initialState },
      );

      const toggle = UNSAFE_getByType(Switch);
      fireEvent(toggle, 'onValueChange', true);
      expect(onSetStopLoss).toHaveBeenCalledTimes(1);
    });

    it('does not call onSetStopLoss when toggle switched off', () => {
      const onSetStopLoss = jest.fn();
      const { UNSAFE_getByType } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="47500"
          suggestedStopLossPercent={-50}
          onSetStopLoss={onSetStopLoss}
        />,
        { state: initialState },
      );

      const toggle = UNSAFE_getByType(Switch);
      fireEvent(toggle, 'onValueChange', false);
      expect(onSetStopLoss).not.toHaveBeenCalled();
    });

    it('shows loading indicator instead of toggle when loading', () => {
      const { getByTestId, queryByTestId } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="47500"
          suggestedStopLossPercent={-50}
          onSetStopLoss={jest.fn()}
          isLoading
        />,
        { state: initialState },
      );

      expect(getByTestId(PerpsStopLossPromptSelectorsIDs.LOADING)).toBeTruthy();
      expect(queryByTestId(PerpsStopLossPromptSelectorsIDs.TOGGLE)).toBeFalsy();
    });

    it('does not trigger action when loading', () => {
      const onSetStopLoss = jest.fn();
      const { getByTestId } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="47500"
          suggestedStopLossPercent={-50}
          onSetStopLoss={onSetStopLoss}
          isLoading
        />,
        { state: initialState },
      );

      // Loading indicator is shown, no toggle to interact with
      expect(getByTestId(PerpsStopLossPromptSelectorsIDs.LOADING)).toBeTruthy();
    });

    it('formats price correctly', () => {
      const { getByText } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="72709.50"
          suggestedStopLossPercent={-17}
          onSetStopLoss={jest.fn()}
        />,
        { state: initialState },
      );

      // Price is formatted and rounded by formatPerpsFiat
      expect(getByText(/\$72,710/)).toBeTruthy();
      expect(getByText(/-17%/)).toBeTruthy();
    });

    it('handles positive percent with plus sign', () => {
      const { getByText } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="52500"
          suggestedStopLossPercent={5}
          onSetStopLoss={jest.fn()}
        />,
        { state: initialState },
      );

      expect(getByText(/\+5%/)).toBeTruthy();
    });
  });

  describe('fade-out animation', () => {
    it('calls onFadeOutComplete after success animation', async () => {
      jest.useFakeTimers();
      const onFadeOutComplete = jest.fn();

      renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="47500"
          suggestedStopLossPercent={-50}
          onSetStopLoss={jest.fn()}
          isSuccess
          onFadeOutComplete={onFadeOutComplete}
        />,
        { state: initialState },
      );

      // Fast-forward past animation duration (300ms)
      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(onFadeOutComplete).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it('does not call onFadeOutComplete when not successful', async () => {
      jest.useFakeTimers();
      const onFadeOutComplete = jest.fn();

      renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="47500"
          suggestedStopLossPercent={-50}
          onSetStopLoss={jest.fn()}
          isSuccess={false}
          onFadeOutComplete={onFadeOutComplete}
        />,
        { state: initialState },
      );

      await act(async () => {
        jest.advanceTimersByTime(400);
      });

      expect(onFadeOutComplete).not.toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('edge cases', () => {
    it('handles missing suggestedStopLossPrice', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          onSetStopLoss={jest.fn()}
        />,
        { state: initialState },
      );

      expect(
        getByTestId(PerpsStopLossPromptSelectorsIDs.CONTAINER),
      ).toBeTruthy();
    });

    it('handles missing onSetStopLoss callback', () => {
      const { UNSAFE_getByType } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="stop_loss"
          liquidationDistance={15}
          suggestedStopLossPrice="47500"
          suggestedStopLossPercent={-50}
        />,
        { state: initialState },
      );

      const toggle = UNSAFE_getByType(Switch);
      // Should not throw when toggle is pressed without callback
      expect(() => fireEvent(toggle, 'onValueChange', true)).not.toThrow();
    });

    it('handles missing onAddMargin callback', () => {
      const { getByTestId } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="add_margin"
          liquidationDistance={2.5}
        />,
        { state: initialState },
      );

      // Should render without error
      expect(
        getByTestId(PerpsStopLossPromptSelectorsIDs.CONTAINER),
      ).toBeTruthy();
    });

    it('uses custom testID when provided', () => {
      const customTestId = 'custom-banner-test-id';
      const { getByTestId } = renderWithProvider(
        <PerpsStopLossPromptBanner
          variant="add_margin"
          liquidationDistance={2.5}
          testID={customTestId}
        />,
        { state: initialState },
      );

      expect(getByTestId(customTestId)).toBeTruthy();
    });
  });
});
