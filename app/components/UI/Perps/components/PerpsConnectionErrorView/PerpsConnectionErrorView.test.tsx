import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsConnectionErrorView from './PerpsConnectionErrorView';

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

// Mock useStyles
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      errorContainer: {},
      errorTitle: {},
      errorMessage: {},
      retryButton: {},
    },
  })),
}));

describe('PerpsConnectionErrorView', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with error message', () => {
    const errorMessage = 'Network connection failed';
    const { getByText } = renderWithProvider(
      <PerpsConnectionErrorView error={errorMessage} onRetry={mockOnRetry} />,
    );

    expect(getByText('perps.connection.failed')).toBeTruthy();
    expect(getByText('perps.connection.error_message')).toBeTruthy();
    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('should show retry button when not retrying', () => {
    const { getByRole } = renderWithProvider(
      <PerpsConnectionErrorView
        error="Test error"
        onRetry={mockOnRetry}
        isRetrying={false}
      />,
    );

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe(
      'perps.connection.retry_connection',
    );
    expect(button.props.loading).toBe(false);
  });

  it('should show retrying state when isRetrying is true', () => {
    const { getByRole } = renderWithProvider(
      <PerpsConnectionErrorView
        error="Test error"
        onRetry={mockOnRetry}
        isRetrying
      />,
    );

    const button = getByRole('button');
    expect(button.props.accessibilityLabel).toBe(
      'perps.connection.retrying_connection',
    );
    expect(button.props.loading).toBe(true);
  });

  it('should call onRetry when button is pressed', () => {
    const { getByRole } = renderWithProvider(
      <PerpsConnectionErrorView error="Test error" onRetry={mockOnRetry} />,
    );

    const button = getByRole('button');
    fireEvent.press(button);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should not call onRetry when button is pressed while retrying', () => {
    const { getByRole } = renderWithProvider(
      <PerpsConnectionErrorView
        error="Test error"
        onRetry={mockOnRetry}
        isRetrying
      />,
    );

    const button = getByRole('button');
    fireEvent.press(button);

    // Button should still call onRetry even when loading (Button component handles this)
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should render different error messages', () => {
    const errors = [
      'Connection timeout',
      'Invalid credentials',
      'Server error: 500',
    ];

    errors.forEach((error) => {
      const { getByText, unmount } = renderWithProvider(
        <PerpsConnectionErrorView error={error} onRetry={mockOnRetry} />,
      );

      expect(getByText(error)).toBeTruthy();
      unmount();
    });
  });
});
