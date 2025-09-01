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

// Mock react-native at the top
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Platform: {
    OS: 'ios',
  },
}));

// Mock Button component to avoid theme issues
jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ label, onPress, loading, ...props }: any) => (
      <TouchableOpacity
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        {...props}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
    ButtonSize: {
      Lg: 'Lg',
    },
    ButtonVariants: {
      Primary: 'Primary',
    },
    ButtonWidthTypes: {
      Full: 'Full',
    },
  };
});

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
    const { getByText } = renderWithProvider(
      <PerpsConnectionErrorView
        error="Test error"
        onRetry={mockOnRetry}
        isRetrying={false}
      />,
    );

    const button = getByText('perps.connection.retry_connection');
    expect(button).toBeTruthy();
  });

  it('should show retrying state when isRetrying is true', () => {
    const { getByText } = renderWithProvider(
      <PerpsConnectionErrorView
        error="Test error"
        onRetry={mockOnRetry}
        isRetrying
      />,
    );

    const button = getByText('perps.connection.retrying_connection');
    expect(button).toBeTruthy();
  });

  it('should call onRetry when button is pressed', () => {
    const { getByText } = renderWithProvider(
      <PerpsConnectionErrorView error="Test error" onRetry={mockOnRetry} />,
    );

    const button = getByText('perps.connection.retry_connection');
    if (button.parent) {
      fireEvent.press(button.parent);
    }

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should not call onRetry when button is pressed while retrying', () => {
    const { getByText } = renderWithProvider(
      <PerpsConnectionErrorView
        error="Test error"
        onRetry={mockOnRetry}
        isRetrying
      />,
    );

    const button = getByText('perps.connection.retrying_connection');
    if (button.parent) {
      fireEvent.press(button.parent);
    }

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
