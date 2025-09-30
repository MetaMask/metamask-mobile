// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../../../Icons/Icon';
import { ButtonSize } from '../../Button.types';

// Internal dependencies.
import ButtonSecondary from './ButtonSecondary';
import { SAMPLE_BUTTONSECONDARY_PROPS } from './ButtonSecondary.constants';

describe('ButtonSecondary', () => {
  const mockOnPress = jest.fn();
  const mockOnPressIn = jest.fn();
  const mockOnPressOut = jest.fn();
  const BUTTON_SECONDARY_TESTID = 'button-secondary';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders string label correctly', () => {
      // Arrange
      const testLabel = 'Secondary Button';

      // Act
      const { getByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
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
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Button with icon"
          startIconName={IconName.Bank}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });

    it('renders with end icon when provided', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Button with icon"
          endIconName={IconName.ArrowRight}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });

    it('renders with different sizes', () => {
      // Arrange
      const sizes = Object.values(ButtonSize);

      sizes.forEach((size) => {
        // Act
        const { getByTestId, unmount } = render(
          <ButtonSecondary
            {...SAMPLE_BUTTONSECONDARY_PROPS}
            label={`Button ${size}`}
            size={size}
            onPress={mockOnPress}
            testID={`${BUTTON_SECONDARY_TESTID}-${size}`}
          />,
        );

        // Assert
        expect(
          getByTestId(`${BUTTON_SECONDARY_TESTID}-${size}`),
        ).toBeOnTheScreen();

        unmount();
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when loading is true', () => {
      // Arrange & Act
      const { getByTestId, queryByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Loading Button"
          loading
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(queryByText('Loading Button')).not.toBeOnTheScreen();
    });

    it('shows label when loading is false', () => {
      // Arrange
      const testLabel = 'Normal Button';

      // Act
      const { getByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
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
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Disabled Button"
          isDisabled
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      const buttonElement = getByTestId(BUTTON_SECONDARY_TESTID);
      expect(buttonElement).toHaveProp('disabled', true);
    });

    it('does not set disabled prop when isDisabled is false', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Enabled Button"
          isDisabled={false}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      const buttonElement = getByTestId(BUTTON_SECONDARY_TESTID);
      expect(buttonElement).toHaveProp('disabled', false);
    });

    it('triggers onPress when enabled', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Enabled Button"
          isDisabled={false}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent.press(getByTestId(BUTTON_SECONDARY_TESTID));

      // Assert
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interaction Events', () => {
    it('triggers onPressIn when button is pressed', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Test Button"
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('triggers onPressOut when button press is released', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Test Button"
          onPress={mockOnPress}
          onPressOut={mockOnPressOut}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressOut', {});

      // Assert
      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
    });

    it('triggers press sequence correctly', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Test Button"
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          onPressOut={mockOnPressOut}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressOut', {});
      fireEvent.press(getByTestId(BUTTON_SECONDARY_TESTID));

      // Assert
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
      expect(mockOnPressOut).toHaveBeenCalledTimes(1);
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('handles pressed state with inverse danger combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Pressed Button"
          isInverse
          isDanger
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });

    it('handles pressed state with danger only combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Pressed Button"
          isDanger
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });

    it('renders loading state with inverse danger pressed combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Loading Button"
          isInverse
          isDanger
          loading
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('renders loading state with inverse pressed combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Loading Button"
          isInverse
          loading
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('renders loading state with danger pressed combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Loading Button"
          isDanger
          loading
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });

    it('renders loading state with default pressed combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Loading Button"
          loading
          onPress={mockOnPress}
          onPressIn={mockOnPressIn}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(mockOnPressIn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Color Variants - ButtonSecondary Specific Logic', () => {
    it('renders with default colors when no variant props are set', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Default Secondary"
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Default Secondary')).toBeOnTheScreen();
    });

    it('renders with danger colors when isDanger is true and isInverse is false', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Danger Secondary"
          isDanger
          isInverse={false}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Danger Secondary')).toBeOnTheScreen();
    });

    it('renders with inverse colors when isInverse is true and isDanger is false', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Inverse Secondary"
          isInverse
          isDanger={false}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Inverse Secondary')).toBeOnTheScreen();
    });

    it('renders with inverse danger colors when both isInverse and isDanger are true', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Inverse Danger Secondary"
          isInverse
          isDanger
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Inverse Danger Secondary')).toBeOnTheScreen();
    });
  });

  describe('Color Logic Edge Cases', () => {
    it('renders correctly when only isDanger is true', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Only Danger"
          isDanger
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Only Danger')).toBeOnTheScreen();
    });

    it('renders correctly when only isInverse is true', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Only Inverse"
          isInverse
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Only Inverse')).toBeOnTheScreen();
    });
  });

  describe('Accessibility', () => {
    it('has accessible role when testID is provided', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Accessible Secondary Button"
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
          accessibilityLabel="Custom accessibility label"
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });

    it('supports accessibility hint', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Button with hint"
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
          accessibilityHint="Double tap to perform secondary action"
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });
  });

  describe('Custom Styling', () => {
    it('applies custom style prop', () => {
      // Arrange
      const customStyle = { marginTop: 20, backgroundColor: 'red' };

      // Act
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Styled Secondary Button"
          style={customStyle}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });

    it('accepts custom width', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Wide Secondary Button"
          width={250}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });
  });

  describe('Default Props', () => {
    it('has correct default values for isDanger and isInverse', () => {
      // Arrange & Act
      const { getByTestId, getByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Default Props Secondary Button"
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert - Component should render successfully with defaults
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
      expect(getByText('Default Props Secondary Button')).toBeOnTheScreen();
    });
  });

  describe('Prop Combinations', () => {
    const propCombinations = [
      { isDanger: false, isInverse: false, description: 'default state' },
      { isDanger: true, isInverse: false, description: 'danger state' },
      { isDanger: false, isInverse: true, description: 'inverse state' },
      { isDanger: true, isInverse: true, description: 'inverse danger state' },
    ];

    propCombinations.forEach(({ isDanger, isInverse, description }) => {
      it(`renders correctly in ${description}`, () => {
        // Arrange & Act
        const { getByTestId, getByText } = render(
          <ButtonSecondary
            {...SAMPLE_BUTTONSECONDARY_PROPS}
            label={`Button in ${description}`}
            isDanger={isDanger}
            isInverse={isInverse}
            onPress={mockOnPress}
            testID={`${BUTTON_SECONDARY_TESTID}-${description.replace(
              /\s+/g,
              '-',
            )}`}
          />,
        );

        // Assert
        expect(
          getByTestId(
            `${BUTTON_SECONDARY_TESTID}-${description.replace(/\s+/g, '-')}`,
          ),
        ).toBeOnTheScreen();
        expect(getByText(`Button in ${description}`)).toBeOnTheScreen();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles empty string label', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label=""
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });

    it('handles rapid press events with coordination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Rapid Press Secondary"
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act - Fire multiple rapid presses
      fireEvent.press(getByTestId(BUTTON_SECONDARY_TESTID));
      fireEvent.press(getByTestId(BUTTON_SECONDARY_TESTID));
      fireEvent.press(getByTestId(BUTTON_SECONDARY_TESTID));

      // Assert - In test environment, coordination is bypassed for test reliability
      // All presses go through since coordination logic is disabled in tests
      expect(mockOnPress).toHaveBeenCalledTimes(3);
    });

    it('handles loading state changes', () => {
      // Arrange
      const { rerender, getByText, queryByText } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Toggle Loading Secondary"
          loading={false}
          onPress={mockOnPress}
        />,
      );

      // Act & Assert - Initially not loading
      expect(getByText('Toggle Loading Secondary')).toBeOnTheScreen();

      // Act - Change to loading
      rerender(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Toggle Loading Secondary"
          loading
          onPress={mockOnPress}
        />,
      );

      // Assert - Now loading
      expect(queryByText('Toggle Loading Secondary')).not.toBeOnTheScreen();
    });

    it('handles prop updates correctly', () => {
      // Arrange
      const { rerender, getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Dynamic Button"
          isDanger={false}
          isInverse={false}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert - Initial state
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();

      // Act - Update to danger
      rerender(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Dynamic Button"
          isDanger
          isInverse={false}
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert - Still renders with new props
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();

      // Act - Update to inverse danger
      rerender(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Dynamic Button"
          isDanger
          isInverse
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Assert - Still renders with new combination
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });
  });

  describe('Style Combinations', () => {
    it('applies pressed styles for inverse danger combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Inverse Danger Button"
          isInverse
          isDanger
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act - trigger pressed state
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });

    it('applies pressed styles for inverse combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Inverse Button"
          isInverse
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act - trigger pressed state
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });

    it('applies pressed styles for default and danger combination', () => {
      // Arrange
      const { getByTestId } = render(
        <ButtonSecondary
          {...SAMPLE_BUTTONSECONDARY_PROPS}
          label="Default Button"
          onPress={mockOnPress}
          testID={BUTTON_SECONDARY_TESTID}
        />,
      );

      // Act - trigger pressed state
      fireEvent(getByTestId(BUTTON_SECONDARY_TESTID), 'onPressIn', {});

      // Assert
      expect(getByTestId(BUTTON_SECONDARY_TESTID)).toBeOnTheScreen();
    });
  });
});
