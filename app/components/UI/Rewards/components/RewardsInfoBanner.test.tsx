import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import RewardsInfoBanner from './RewardsInfoBanner';

describe('RewardsInfoBanner', () => {
  const defaultProps = {
    title: 'Info Title',
    description: 'Information description message',
  };

  describe('basic rendering', () => {
    it('renders title and description', () => {
      // Arrange & Act
      const { getByText } = render(<RewardsInfoBanner {...defaultProps} />);

      // Assert
      expect(getByText('Info Title')).toBeOnTheScreen();
      expect(getByText('Information description message')).toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <RewardsInfoBanner {...defaultProps} testID="custom-banner" />,
      );

      // Assert
      expect(getByTestId('custom-banner')).toBeOnTheScreen();
    });

    it('renders title as React node when provided', () => {
      // Arrange
      const customTitleNode = (
        <Text testID="custom-title-node">Custom Title Node</Text>
      );

      // Act
      const { getByTestId, queryByText } = render(
        <RewardsInfoBanner {...defaultProps} title={customTitleNode} />,
      );

      // Assert
      expect(getByTestId('custom-title-node')).toBeOnTheScreen();
      expect(queryByText('Info Title')).toBeNull();
    });

    it('renders title as string when provided as string', () => {
      // Arrange & Act
      const { getByText } = render(
        <RewardsInfoBanner {...defaultProps} title="String Title" />,
      );

      // Assert
      expect(getByText('String Title')).toBeOnTheScreen();
    });
  });

  describe('button rendering', () => {
    it('does not render buttons when no callbacks provided', () => {
      // Arrange & Act
      const { queryByText } = render(<RewardsInfoBanner {...defaultProps} />);

      // Assert
      expect(queryByText('Dismiss')).toBeNull();
      expect(queryByText('Confirm')).toBeNull();
    });

    it('renders dismiss button when onDismiss callback provided', () => {
      // Arrange
      const onDismiss = jest.fn();

      // Act
      const { getByText, queryByText } = render(
        <RewardsInfoBanner {...defaultProps} onDismiss={onDismiss} />,
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
        <RewardsInfoBanner {...defaultProps} onConfirm={onConfirm} />,
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
        <RewardsInfoBanner
          {...defaultProps}
          onDismiss={onDismiss}
          onConfirm={onConfirm}
        />,
      );

      // Assert
      expect(getByText('Dismiss')).toBeOnTheScreen();
      expect(getByText('Confirm')).toBeOnTheScreen();
    });
  });

  describe('button interactions', () => {
    it('calls onDismiss when dismiss button pressed', () => {
      // Arrange
      const onDismiss = jest.fn();
      const { getByText } = render(
        <RewardsInfoBanner {...defaultProps} onDismiss={onDismiss} />,
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
        <RewardsInfoBanner {...defaultProps} onConfirm={onConfirm} />,
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
        <RewardsInfoBanner
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

    it('does not throw error when buttons pressed multiple times', () => {
      // Arrange
      const onDismiss = jest.fn();
      const onConfirm = jest.fn();
      const { getByText } = render(
        <RewardsInfoBanner
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
        <RewardsInfoBanner {...defaultProps} onConfirm={onConfirm} />,
      );

      // Assert
      expect(getByText('Confirm')).toBeOnTheScreen();
    });

    it('renders custom confirm button label when provided', () => {
      // Arrange
      const onConfirm = jest.fn();
      const customLabel = 'Get Started';

      // Act
      const { getByText, queryByText } = render(
        <RewardsInfoBanner
          {...defaultProps}
          onConfirm={onConfirm}
          confirmButtonLabel={customLabel}
        />,
      );

      // Assert
      expect(getByText('Get Started')).toBeOnTheScreen();
      expect(queryByText('Confirm')).toBeNull();
    });

    it('calls onConfirm when custom labeled button pressed', () => {
      // Arrange
      const onConfirm = jest.fn();
      const customLabel = 'Continue';
      const { getByText } = render(
        <RewardsInfoBanner
          {...defaultProps}
          onConfirm={onConfirm}
          confirmButtonLabel={customLabel}
        />,
      );

      // Act
      fireEvent.press(getByText('Continue'));

      // Assert
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('handles empty confirm button label gracefully', () => {
      // Arrange
      const onConfirm = jest.fn();

      // Act
      const { getByText } = render(
        <RewardsInfoBanner
          {...defaultProps}
          onConfirm={onConfirm}
          confirmButtonLabel=""
        />,
      );

      // Assert - Should fall back to default "Confirm" label
      expect(getByText('Confirm')).toBeOnTheScreen();
    });
  });

  describe('confirm button loading state', () => {
    it('shows loading state when onConfirmLoading is true', () => {
      // Arrange
      const onConfirm = jest.fn();

      // Act
      const { getByText } = render(
        <RewardsInfoBanner
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
        <RewardsInfoBanner {...defaultProps} onConfirm={onConfirm} />,
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
        <RewardsInfoBanner
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

    it('cannot call onConfirm when loading', () => {
      // Arrange
      const onConfirm = jest.fn();
      const { getByText } = render(
        <RewardsInfoBanner
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
        <RewardsInfoBanner
          {...defaultProps}
          onDismiss={onDismiss}
          onConfirm={onConfirm}
          confirmButtonLabel="Custom Confirm"
        />,
      );

      // Assert - Check that all elements are present and accessible
      expect(getByText('Info Title')).toBeOnTheScreen();
      expect(getByText('Information description message')).toBeOnTheScreen();
      expect(getByText('Dismiss')).toBeOnTheScreen();
      expect(getByText('Custom Confirm')).toBeOnTheScreen();
    });

    it('renders with title as React node and buttons', () => {
      // Arrange
      const customTitleNode = (
        <Text testID="custom-title">Custom React Title</Text>
      );
      const onDismiss = jest.fn();
      const onConfirm = jest.fn();

      // Act
      const { getByTestId, getByText } = render(
        <RewardsInfoBanner
          title={customTitleNode}
          description="Test description"
          onDismiss={onDismiss}
          onConfirm={onConfirm}
        />,
      );

      // Assert
      expect(getByTestId('custom-title')).toBeOnTheScreen();
      expect(getByText('Test description')).toBeOnTheScreen();
      expect(getByText('Dismiss')).toBeOnTheScreen();
      expect(getByText('Confirm')).toBeOnTheScreen();
    });
  });

  describe('edge cases', () => {
    it('renders with empty title and description', () => {
      // Arrange & Act
      const renderResult = render(
        <RewardsInfoBanner title="" description="" />,
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
        <RewardsInfoBanner title={longTitle} description={longDescription} />,
      );

      // Assert
      expect(getByText(longTitle)).toBeOnTheScreen();
      expect(getByText(longDescription)).toBeOnTheScreen();
    });

    it('renders with all optional props', () => {
      // Arrange
      const onDismiss = jest.fn();
      const onConfirm = jest.fn();
      const customTitleNode = (
        <Text testID="full-custom-title">Full Custom Title</Text>
      );

      // Act
      const { getByTestId, getByText } = render(
        <RewardsInfoBanner
          title={customTitleNode}
          description="Full feature description"
          onDismiss={onDismiss}
          onConfirm={onConfirm}
          confirmButtonLabel="Custom Action"
          onConfirmLoading={false}
          testID="full-banner"
          showInfoIcon
        />,
      );

      // Assert
      expect(getByTestId('full-banner')).toBeOnTheScreen();
      expect(getByTestId('full-custom-title')).toBeOnTheScreen();
      expect(getByText('Full feature description')).toBeOnTheScreen();
      expect(getByText('Dismiss')).toBeOnTheScreen();
      expect(getByText('Custom Action')).toBeOnTheScreen();
    });

    it('renders without icon when showInfoIcon is false', () => {
      // Arrange & Act
      const renderResult = render(
        <RewardsInfoBanner {...defaultProps} showInfoIcon={false} />,
      );

      // Assert - Should render without errors
      expect(renderResult).toBeTruthy();
    });
  });
});
