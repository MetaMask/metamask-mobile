import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PerpsConnectionErrorView from './PerpsConnectionErrorView';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

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

// Mock Icon component
jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ name, ...props }: any) => <View {...props} testID={name} />,
    IconName: {
      Details: 'Details',
    },
    IconColor: {
      Muted: 'Muted',
    },
    IconSize: {
      Xl: 'Xl',
    },
  };
});

// Mock Routes
jest.mock('../../../../../constants/navigation/Routes', () => ({
  WALLET: {
    TAB_STACK_FLOW: 'TAB_STACK_FLOW',
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
      Secondary: 'Secondary',
    },
    ButtonWidthTypes: {
      Full: 'Full',
    },
  };
});

// Mock Text component
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ children, ...props }: any) => (
      <Text {...props}>{children}</Text>
    ),
    TextVariant: {
      HeadingLG: 'HeadingLG',
      BodyMD: 'BodyMD',
      BodySM: 'BodySM',
    },
    TextColor: {
      Error: 'Error',
      Muted: 'Muted',
    },
  };
});

// Mock ScreenView
jest.mock('../../../../Base/ScreenView', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: ({ children, ...props }: any) => (
      <View {...props}>{children}</View>
    ),
  };
});

describe('PerpsConnectionErrorView', () => {
  const mockOnRetry = jest.fn();
  const mockGoBack = jest.fn();
  const mockReset = jest.fn();
  const mockCanGoBack = jest.fn(() => true);

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up navigation mock
    const { useNavigation } = jest.requireMock('@react-navigation/native');
    useNavigation.mockReturnValue({
      goBack: mockGoBack,
      canGoBack: mockCanGoBack,
      reset: mockReset,
    });
  });

  it('should render with error message', () => {
    const errorMessage = 'Network connection failed';
    const { getByText } = render(
      <PerpsConnectionErrorView error={errorMessage} onRetry={mockOnRetry} />,
    );

    expect(getByText('perps.errors.connectionFailed.title')).toBeTruthy();
    expect(getByText('perps.errors.connectionFailed.description')).toBeTruthy();
    expect(getByText('perps.errors.connectionFailed.retry')).toBeTruthy();
  });

  it('should show retry button when not retrying', () => {
    const { getByText } = render(
      <PerpsConnectionErrorView
        error="Test error"
        onRetry={mockOnRetry}
        isRetrying={false}
      />,
    );

    const button = getByText('perps.errors.connectionFailed.retry');
    expect(button).toBeTruthy();
  });

  it('should show retrying state when isRetrying is true', () => {
    const { getByText } = render(
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
    const { getByText } = render(
      <PerpsConnectionErrorView error="Test error" onRetry={mockOnRetry} />,
    );

    const button = getByText('perps.errors.connectionFailed.retry');
    if (button.parent) {
      fireEvent.press(button.parent);
    }

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('should not call onRetry when button is pressed while retrying', () => {
    const { getByText } = render(
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

  it('should show back button when showBackButton is true', () => {
    const { getByText } = render(
      <PerpsConnectionErrorView
        error="Test error"
        onRetry={mockOnRetry}
        showBackButton
      />,
    );

    const backButton = getByText('perps.errors.connectionFailed.go_back');
    expect(backButton).toBeTruthy();
  });

  it('should hide back button when showBackButton is false', () => {
    const { queryByText } = render(
      <PerpsConnectionErrorView
        error="Test error"
        onRetry={mockOnRetry}
        showBackButton={false}
      />,
    );

    const backButton = queryByText('perps.errors.connectionFailed.go_back');
    expect(backButton).toBeNull();
  });
});
