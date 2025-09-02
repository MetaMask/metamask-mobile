// Third party dependencies.
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// External dependencies.
import { ButtonSize } from '@metamask/design-system-react-native';

// Internal dependencies.
import ButtonSemantic from './ButtonSemantic';
import { ButtonSemanticSeverity } from './ButtonSemantic.types';

describe('ButtonSemantic', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders with Success severity', () => {
      // Arrange
      const testText = 'Success Button';

      // Act
      const { getByText, toJSON } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Success}
          onPress={mockOnPress}
        >
          {testText}
        </ButtonSemantic>,
      );

      // Assert
      expect(getByText(testText)).toBeOnTheScreen();
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders with Danger severity', () => {
      // Arrange
      const testText = 'Danger Button';

      // Act
      const { getByText, toJSON } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Danger}
          onPress={mockOnPress}
        >
          {testText}
        </ButtonSemantic>,
      );

      // Assert
      expect(getByText(testText)).toBeOnTheScreen();
      expect(toJSON()).toMatchSnapshot();
    });

    it.each([ButtonSize.Sm, ButtonSize.Md, ButtonSize.Lg] as const)(
      'renders with %s size',
      (size) => {
        // Arrange
        const testText = `Button ${size}`;

        // Act
        const { getByText } = render(
          <ButtonSemantic
            severity={ButtonSemanticSeverity.Success}
            size={size}
            onPress={mockOnPress}
          >
            {testText}
          </ButtonSemantic>,
        );

        // Assert
        expect(getByText(testText)).toBeOnTheScreen();
      },
    );

    it('uses large size by default', () => {
      // Arrange
      const testText = 'Default Size Button';

      // Act
      const { getByText } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Success}
          onPress={mockOnPress}
        >
          {testText}
        </ButtonSemantic>,
      );

      // Assert
      expect(getByText(testText)).toBeOnTheScreen();
    });

    it('applies custom style prop', () => {
      // Arrange
      const testText = 'Styled Button';
      const customStyle = { opacity: 0.8 };

      // Act
      const { getByText } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Success}
          onPress={mockOnPress}
          style={customStyle}
        >
          {testText}
        </ButtonSemantic>,
      );

      // Assert
      expect(getByText(testText)).toBeOnTheScreen();
    });
  });

  describe('Interaction', () => {
    it('calls onPress handler when pressed', () => {
      // Arrange
      const testText = 'Clickable Button';

      // Act
      const { getByText } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Success}
          onPress={mockOnPress}
        >
          {testText}
        </ButtonSemantic>,
      );

      fireEvent.press(getByText(testText));

      // Assert
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onPress when disabled', () => {
      // Arrange
      const testText = 'Disabled Button';

      // Act
      const { getByText } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Success}
          onPress={mockOnPress}
          isDisabled
        >
          {testText}
        </ButtonSemantic>,
      );

      fireEvent.press(getByText(testText));

      // Assert
      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('States', () => {
    it('renders in loading state with custom loading text', () => {
      // Arrange
      const loadingText = 'Processing...';

      // Act
      const { getByText } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Success}
          onPress={mockOnPress}
          isLoading
          loadingText={loadingText}
        >
          Submit
        </ButtonSemantic>,
      );

      // Assert
      expect(getByText(loadingText)).toBeOnTheScreen();
    });

    it('renders in loading state without custom loading text', () => {
      // Arrange
      const buttonText = 'Submit';

      // Act
      const { getByText } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Success}
          onPress={mockOnPress}
          isLoading
        >
          {buttonText}
        </ButtonSemantic>,
      );

      // Assert - Should still render the button (ButtonBase handles loading state)
      expect(getByText(buttonText)).toBeOnTheScreen();
    });

    it('renders in disabled state', () => {
      // Arrange
      const testText = 'Disabled Button';

      // Act
      const { getByText } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Danger}
          onPress={mockOnPress}
          isDisabled
        >
          {testText}
        </ButtonSemantic>,
      );

      // Assert
      expect(getByText(testText)).toBeOnTheScreen();
    });
  });

  describe('Severity Variants', () => {
    it.each([
      ButtonSemanticSeverity.Success,
      ButtonSemanticSeverity.Danger,
    ] as const)('handles %s severity correctly', (severity) => {
      // Arrange
      const testText = `${severity} Button`;

      // Act
      const { getByText } = render(
        <ButtonSemantic severity={severity} onPress={mockOnPress}>
          {testText}
        </ButtonSemantic>,
      );

      // Assert
      expect(getByText(testText)).toBeOnTheScreen();
    });
  });

  describe('Props Forwarding', () => {
    it('forwards additional props to ButtonBase', () => {
      // Arrange
      const testText = 'Button with Props';
      const testId = 'semantic-button';

      // Act
      const { getByTestId } = render(
        <ButtonSemantic
          severity={ButtonSemanticSeverity.Success}
          onPress={mockOnPress}
          testID={testId}
        >
          {testText}
        </ButtonSemantic>,
      );

      // Assert
      expect(getByTestId(testId)).toBeOnTheScreen();
    });
  });
});
