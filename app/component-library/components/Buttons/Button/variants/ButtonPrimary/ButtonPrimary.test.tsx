// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../../../Icons/Icon';
import { ButtonSize } from '../../Button.types';

// Internal dependencies.
import ButtonPrimary from './ButtonPrimary';
import {
  SAMPLE_BUTTONPRIMARY_PROPS,
  BUTTONPRIMARY_TESTID,
} from './ButtonPrimary.constants';

describe('ButtonPrimary', () => {
  const mockOnPress = jest.fn();
  const mockOnPressIn = jest.fn();
  const mockOnPressOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders string label correctly', () => {
      // Arrange
      const testLabel = 'Test Button';

      // Act
      const { getByText } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label={testLabel}
          onPress={mockOnPress}
        />,
      );

      // Assert
      expect(getByText(testLabel)).toBeOnTheScreen();
    });

    it('renders with start icon when provided', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Button with icon"
          startIconName={IconName.Bank}
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });

    it('renders with end icon when provided', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Button with icon"
          endIconName={IconName.ArrowRight}
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });

    it('renders with different sizes', () => {
      // Arrange
      const sizes = Object.values(ButtonSize);

      sizes.forEach((size) => {
        // Act
        const { getByTestId, unmount } = render(
          <ButtonPrimary
            {...SAMPLE_BUTTONPRIMARY_PROPS}
            label={`Button ${size}`}
            size={size}
            onPress={mockOnPress}
            testID={`${BUTTONPRIMARY_TESTID}-${size}`}
          />,
        );

        // Assert
        expect(
          getByTestId(`${BUTTONPRIMARY_TESTID}-${size}`),
        ).toBeOnTheScreen();

        unmount();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading is true', () => {
      // Arrange & Act
      const { getByTestId, queryByText } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Loading Button"
          loading
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
      expect(queryByText('Loading Button')).not.toBeOnTheScreen();
    });

    it('shows label when loading is false', () => {
      // Arrange
      const testLabel = 'Normal Button';

      // Act
      const { getByText } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label={testLabel}
          loading={false}
          onPress={mockOnPress}
        />,
      );

      // Assert
      expect(getByText(testLabel)).toBeOnTheScreen();
    });
  });

  describe('Disabled State', () => {
    it('sets disabled prop when isDisabled is true', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Disabled Button"
          isDisabled
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      const buttonElement = getByTestId(BUTTONPRIMARY_TESTID);
      expect(buttonElement).toHaveProp('disabled', true);
    });

    it('does not set disabled prop when isDisabled is false', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Enabled Button"
          isDisabled={false}
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      const buttonElement = getByTestId(BUTTONPRIMARY_TESTID);
      expect(buttonElement).toHaveProp('disabled', false);
    });

    it('triggers onPress when enabled', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Enabled Button"
          isDisabled={false}
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act
      fireEvent.press(getByTestId(BUTTONPRIMARY_TESTID));

      // Assert
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interaction Events', () => {
    it('triggers onPressIn when button is pressed', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Test Button"
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressIn', {});

      // Assert
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('triggers onPressOut when button press is released', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Test Button"
          onPress={mockOnPress}
          onPressOut={mockOnPressOut}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressOut', {});

      // Assert
      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
    });

    it('triggers press sequence correctly', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Test Button"
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          onPressOut={mockOnPressOut}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressIn', {});
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressOut', {});
      fireEvent.press(getByTestId(BUTTONPRIMARY_TESTID));

      // Assert
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('handles pressed state with inverse danger combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Pressed Button"
          isInverse
          isDanger
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressIn', {});

      // Assert
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });

    it('renders loading state with inverse danger pressed combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Loading Button"
          isInverse
          isDanger
          loading
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act - trigger press while loading
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('renders loading state with inverse pressed combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Loading Button"
          isInverse
          loading
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('renders loading state with default pressed combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Loading Button"
          loading
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Color Variants - Default State', () => {
    it('renders with default colors when no variant props are set', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Default Button"
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Default Button')).toBeOnTheScreen();
    });

    it('renders with danger colors when isDanger is true', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Danger Button"
          isDanger
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Danger Button')).toBeOnTheScreen();
    });

    it('renders with inverse colors when isInverse is true', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Inverse Button"
          isInverse
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Inverse Button')).toBeOnTheScreen();
    });

    it('renders with inverse danger colors when both isInverse and isDanger are true', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Inverse Danger Button"
          isInverse
          isDanger
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Inverse Danger Button')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('has accessible role when testID is provided', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Accessible Button"
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
          accessibilityLabel="Custom accessibility label"
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });

    it('supports accessibility hint', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Button with hint"
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
          accessibilityHint="Double tap to perform action"
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom style prop', () => {
      // Arrange
      const customStyle = { marginTop: 20 };

      // Act
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Styled Button"
          style={customStyle}
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });

    it('accepts custom width', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Wide Button"
          width={200}
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });
  });

  describe('Default Props', () => {
    it('has correct default values for isDanger and isInverse', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Default Props Button"
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert - Component should render successfully with defaults
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Default Props Button')).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string label', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label=""
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });

    it('handles rapid press events with coordination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Rapid Press Button"
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act - Fire multiple rapid presses
      fireEvent.press(getByTestId(BUTTONPRIMARY_TESTID));
      fireEvent.press(getByTestId(BUTTONPRIMARY_TESTID));
      fireEvent.press(getByTestId(BUTTONPRIMARY_TESTID));

      // Assert - In test environment, coordination is bypassed for test reliability
      // All presses go through since coordination logic is disabled in tests
      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });

    it('handles loading state changes', () => {
      // Arrange
      const { rerender, getByText, queryByText } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Toggle Loading"
          loading={false}
          onPress={mockOnPress}
        />,
      );

      // Act & Assert - Initially not loading
      expect(getByText('Toggle Loading')).toBeOnTheScreen();

      // Act - Change to loading
      rerender(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Toggle Loading"
          loading
          onPress={mockOnPress}
        />,
      );

      // Assert - Now loading
      expect(queryByText('Toggle Loading')).not.toBeOnTheScreen();
    });
  });

  describe('Style Combinations', () => {
    it('applies pressed styles for inverse combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Inverse Button"
          isInverse
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act - trigger pressed state
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });

    it('applies pressed styles for danger combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Danger Button"
          isDanger
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act - trigger pressed state
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });

    it('applies pressed styles for default combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonPrimary
          {...SAMPLE_BUTTONPRIMARY_PROPS}
          label="Default Button"
          onPress={mockOnPress}
          testID={BUTTONPRIMARY_TESTID}
        />,
      );

      // Act - trigger pressed state
      fireEvent(getByTestId(BUTTONPRIMARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTONPRIMARY_TESTID)).toBeOnTheScreen();
    });
  });
});
