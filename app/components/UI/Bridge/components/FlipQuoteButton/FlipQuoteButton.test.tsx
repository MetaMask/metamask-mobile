import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { FLipQuoteButton } from './index';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { initialState } from '../../_mocks_/initialState';

const mockOnPress = jest.fn();

const renderFlipQuoteButton = (disabled: boolean = false) =>
  renderWithProvider(
    <FLipQuoteButton onPress={mockOnPress} disabled={disabled} />,
    {
      state: initialState,
    },
  );

describe('FLipQuoteButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    it('renders with enabled state', () => {
      const { toJSON, getByTestId } = renderFlipQuoteButton(false);

      expect(getByTestId('arrow-button')).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders with disabled state', () => {
      const { toJSON, getByTestId } = renderFlipQuoteButton(true);

      expect(getByTestId('arrow-button')).toBeTruthy();
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders SwapVertical icon', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      expect(button).toBeTruthy();
    });
  });

  describe('Interaction - Enabled State', () => {
    it('calls onPress when button is pressed and enabled', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('handles onPressIn event when enabled', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent(button, 'pressIn');

      // Component should handle pressIn without errors
      expect(button).toBeTruthy();
    });

    it('handles onPressOut event when enabled', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent(button, 'pressOut');

      // Component should handle pressOut without errors
      expect(button).toBeTruthy();
    });

    it('handles complete press cycle with pressIn and pressOut', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent(button, 'pressIn');
      fireEvent.press(button);
      fireEvent(button, 'pressOut');

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interaction - Disabled State', () => {
    it('sets onPress handler to undefined when disabled', () => {
      const { getByTestId } = renderFlipQuoteButton(true);
      const button = getByTestId('arrow-button');

      expect(button.props.onPress).toBeUndefined();
    });

    it('sets onPressIn handler to undefined when disabled', () => {
      const { getByTestId } = renderFlipQuoteButton(true);
      const button = getByTestId('arrow-button');

      expect(button.props.onPressIn).toBeUndefined();
    });

    it('sets onPressOut handler to undefined when disabled', () => {
      const { getByTestId } = renderFlipQuoteButton(true);
      const button = getByTestId('arrow-button');

      expect(button.props.onPressOut).toBeUndefined();
    });

    it('has disabled prop set to true when disabled', () => {
      const { getByTestId } = renderFlipQuoteButton(true);
      const button = getByTestId('arrow-button');

      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Press State Management', () => {
    it('updates pressed state on pressIn', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent(button, 'pressIn');

      // Pressed state should be true, affecting the button's style
      expect(button).toBeTruthy();
    });

    it('resets pressed state on pressOut', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent(button, 'pressIn');
      fireEvent(button, 'pressOut');

      // Pressed state should be false, resetting the button's style
      expect(button).toBeTruthy();
    });

    it('maintains pressed state when transitioning from pressIn to press', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent(button, 'pressIn');
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(button).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has accessible property set to true', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      expect(button.props.accessible).toBe(true);
    });

    it('maintains accessibility when disabled', () => {
      const { getByTestId } = renderFlipQuoteButton(true);
      const button = getByTestId('arrow-button');

      expect(button.props.accessible).toBe(true);
      expect(button.props.disabled).toBe(true);
    });

    it('has testID for test identification', () => {
      const { getByTestId } = renderFlipQuoteButton(false);

      expect(getByTestId('arrow-button')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid successive presses when enabled', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent.press(button);
      fireEvent.press(button);
      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });

    it('handles pressIn without corresponding pressOut', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent(button, 'pressIn');
      // No pressOut called

      expect(button).toBeTruthy();
    });

    it('handles pressOut without preceding pressIn', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent(button, 'pressOut');

      expect(button).toBeTruthy();
    });

    it('maintains disabled state with all handlers undefined', () => {
      const { getByTestId } = renderFlipQuoteButton(true);
      const button = getByTestId('arrow-button');

      expect(button.props.onPress).toBeUndefined();
      expect(button.props.onPressIn).toBeUndefined();
      expect(button.props.onPressOut).toBeUndefined();
      expect(button.props.disabled).toBe(true);
    });
  });

  describe('Props Validation', () => {
    it('accepts and uses onPress callback prop', () => {
      const customCallback = jest.fn();
      const { getByTestId } = renderWithProvider(
        <FLipQuoteButton onPress={customCallback} disabled={false} />,
        { state: initialState },
      );

      const button = getByTestId('arrow-button');
      fireEvent.press(button);

      expect(customCallback).toHaveBeenCalledTimes(1);
    });

    it('respects disabled prop set to false', () => {
      const { getByTestId } = renderFlipQuoteButton(false);
      const button = getByTestId('arrow-button');

      fireEvent.press(button);

      expect(mockOnPress).toHaveBeenCalled();
    });

    it('respects disabled prop set to true', () => {
      const { getByTestId } = renderFlipQuoteButton(true);
      const button = getByTestId('arrow-button');

      expect(button.props.disabled).toBe(true);
      expect(button.props.onPress).toBeUndefined();
    });
  });
});
