import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RewardsErrorBanner from './RewardsErrorBanner';

describe('RewardsErrorBanner', () => {
  const defaultProps = {
    title: 'Error Title',
    description: 'Error description message',
  };

  it('renders title and description', () => {
    // Arrange & Act
    const { getByText } = render(<RewardsErrorBanner {...defaultProps} />);

    // Assert
    expect(getByText('Error Title')).toBeOnTheScreen();
    expect(getByText('Error description message')).toBeOnTheScreen();
  });

  it('does not render buttons when no callbacks provided', () => {
    // Arrange & Act
    const { queryByText } = render(<RewardsErrorBanner {...defaultProps} />);

    // Assert
    expect(queryByText('Dismiss')).toBeNull();
    expect(queryByText('Confirm')).toBeNull();
  });

  it('renders dismiss button when onDismiss callback provided', () => {
    // Arrange
    const onDismiss = jest.fn();

    // Act
    const { getByText, queryByText } = render(
      <RewardsErrorBanner {...defaultProps} onDismiss={onDismiss} />,
    );

    // Assert
    expect(getByText('Dismiss')).toBeOnTheScreen();
    expect(queryByText('Confirm')).toBeNull();
  });

  it('renders confirm button when onConfirm callback provided', () => {
    // Arrange
    const onConfirm = jest.fn();

    // Act
    const { getByText, queryByText } = render(
      <RewardsErrorBanner {...defaultProps} onConfirm={onConfirm} />,
    );

    // Assert
    expect(getByText('Confirm')).toBeOnTheScreen();
    expect(queryByText('Dismiss')).toBeNull();
  });

  it('renders both buttons when both callbacks provided', () => {
    // Arrange
    const onDismiss = jest.fn();
    const onConfirm = jest.fn();

    // Act
    const { getByText } = render(
      <RewardsErrorBanner
        {...defaultProps}
        onDismiss={onDismiss}
        onConfirm={onConfirm}
      />,
    );

    // Assert
    expect(getByText('Dismiss')).toBeOnTheScreen();
    expect(getByText('Confirm')).toBeOnTheScreen();
  });

  it('calls onDismiss when dismiss button pressed', () => {
    // Arrange
    const onDismiss = jest.fn();
    const { getByText } = render(
      <RewardsErrorBanner {...defaultProps} onDismiss={onDismiss} />,
    );

    // Act
    fireEvent.press(getByText('Dismiss'));

    // Assert
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button pressed', () => {
    // Arrange
    const onConfirm = jest.fn();
    const { getByText } = render(
      <RewardsErrorBanner {...defaultProps} onConfirm={onConfirm} />,
    );

    // Act
    fireEvent.press(getByText('Confirm'));

    // Assert
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls respective callbacks when both buttons pressed', () => {
    // Arrange
    const onDismiss = jest.fn();
    const onConfirm = jest.fn();
    const { getByText } = render(
      <RewardsErrorBanner
        {...defaultProps}
        onDismiss={onDismiss}
        onConfirm={onConfirm}
      />,
    );

    // Act
    fireEvent.press(getByText('Dismiss'));
    fireEvent.press(getByText('Confirm'));

    // Assert
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders with custom title and description', () => {
    // Arrange
    const customProps = {
      title: 'Custom Error Title',
      description: 'Custom error description with more details',
    };

    // Act
    const { getByText } = render(<RewardsErrorBanner {...customProps} />);

    // Assert
    expect(getByText('Custom Error Title')).toBeOnTheScreen();
    expect(
      getByText('Custom error description with more details'),
    ).toBeOnTheScreen();
  });

  describe('button interactions', () => {
    it('does not throw error when buttons pressed multiple times', () => {
      // Arrange
      const onDismiss = jest.fn();
      const onConfirm = jest.fn();
      const { getByText } = render(
        <RewardsErrorBanner
          {...defaultProps}
          onDismiss={onDismiss}
          onConfirm={onConfirm}
        />,
      );

      // Act & Assert - Should not throw
      expect(() => {
        fireEvent.press(getByText('Dismiss'));
        fireEvent.press(getByText('Dismiss'));
        fireEvent.press(getByText('Confirm'));
        fireEvent.press(getByText('Confirm'));
      }).not.toThrow();

      expect(onDismiss).toHaveBeenCalledTimes(2);
      expect(onConfirm).toHaveBeenCalledTimes(2);
    });
  });

  describe('custom confirm button label', () => {
    it('renders default "Confirm" label when no custom label provided', () => {
      // Arrange
      const onConfirm = jest.fn();

      // Act
      const { getByText } = render(
        <RewardsErrorBanner {...defaultProps} onConfirm={onConfirm} />,
      );

      // Assert
      expect(getByText('Confirm')).toBeOnTheScreen();
    });

    it('renders custom confirm button label when provided', () => {
      // Arrange
      const onConfirm = jest.fn();
      const customLabel = 'Retry Now';

      // Act
      const { getByText, queryByText } = render(
        <RewardsErrorBanner
          {...defaultProps}
          onConfirm={onConfirm}
          confirmButtonLabel={customLabel}
        />,
      );

      // Assert
      expect(getByText('Retry Now')).toBeOnTheScreen();
      expect(queryByText('Confirm')).toBeNull();
    });

    it('calls onConfirm when custom labeled button pressed', () => {
      // Arrange
      const onConfirm = jest.fn();
      const customLabel = 'Try again';
      const { getByText } = render(
        <RewardsErrorBanner
          {...defaultProps}
          onConfirm={onConfirm}
          confirmButtonLabel={customLabel}
        />,
      );

      // Act
      fireEvent.press(getByText('Try again'));

      // Assert
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirm button loading state', () => {
    it('shows loading state when onConfirmLoading is true', () => {
      // Arrange
      const onConfirm = jest.fn();

      // Act
      const { getByText } = render(
        <RewardsErrorBanner
          {...defaultProps}
          onConfirm={onConfirm}
          onConfirmLoading
        />,
      );

      // Assert
      const confirmButton = getByText('Confirm');
      expect(confirmButton).toBeOnTheScreen();
      // The button should be in loading state (this depends on Button component implementation)
    });

    it('does not show loading state when onConfirmLoading is false', () => {
      // Arrange
      const onConfirm = jest.fn();

      // Act
      const { getByText } = render(
        <RewardsErrorBanner {...defaultProps} onConfirm={onConfirm} />,
      );

      // Assert
      const confirmButton = getByText('Confirm');
      expect(confirmButton).toBeOnTheScreen();
    });

    it('shows loading state with custom button label', () => {
      // Arrange
      const onConfirm = jest.fn();
      const customLabel = 'Processing';

      // Act
      const { getByText } = render(
        <RewardsErrorBanner
          {...defaultProps}
          onConfirm={onConfirm}
          confirmButtonLabel={customLabel}
          onConfirmLoading
        />,
      );

      // Assert
      const confirmButton = getByText('Processing');
      expect(confirmButton).toBeOnTheScreen();
    });

    it('can not call onConfirm when loading', () => {
      // Arrange
      const onConfirm = jest.fn();
      const { getByText } = render(
        <RewardsErrorBanner
          {...defaultProps}
          onConfirm={onConfirm}
          onConfirmLoading
        />,
      );

      // Act
      fireEvent.press(getByText('Confirm'));

      // Assert
      expect(onConfirm).toHaveBeenCalledTimes(0);
    });
  });

  describe('layout and structure', () => {
    it('maintains proper layout with both buttons and custom labels', () => {
      // Arrange
      const onDismiss = jest.fn();
      const onConfirm = jest.fn();

      // Act
      const { getByText } = render(
        <RewardsErrorBanner
          {...defaultProps}
          onDismiss={onDismiss}
          onConfirm={onConfirm}
          confirmButtonLabel="Custom Confirm"
        />,
      );

      // Assert - Check that all elements are present and accessible
      expect(getByText('Error Title')).toBeOnTheScreen();
      expect(getByText('Error description message')).toBeOnTheScreen();
      expect(getByText('Dismiss')).toBeOnTheScreen();
      expect(getByText('Custom Confirm')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders with empty title and description', () => {
      // Arrange & Act
      const renderResult = render(
        <RewardsErrorBanner title="" description="" />,
      );

      // Assert - Should render without errors
      expect(renderResult).toBeTruthy();
    });

    it('renders with very long title and description', () => {
      // Arrange
      const longTitle = 'A'.repeat(100);
      const longDescription = 'B'.repeat(500);

      // Act
      const { getByText } = render(
        <RewardsErrorBanner title={longTitle} description={longDescription} />,
      );

      // Assert
      expect(getByText(longTitle)).toBeOnTheScreen();
      expect(getByText(longDescription)).toBeOnTheScreen();
    });

    it('handles empty confirm button label gracefully', () => {
      // Arrange
      const onConfirm = jest.fn();

      // Act
      const { getByText } = render(
        <RewardsErrorBanner
          {...defaultProps}
          onConfirm={onConfirm}
          confirmButtonLabel=""
        />,
      );

      // Assert - Should fall back to default "Confirm" label
      expect(getByText('Confirm')).toBeOnTheScreen();
    });
  });
});
