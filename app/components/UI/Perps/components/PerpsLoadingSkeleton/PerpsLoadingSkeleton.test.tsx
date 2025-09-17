import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, act, fireEvent } from '@testing-library/react-native';
import PerpsLoadingSkeleton from './PerpsLoadingSkeleton';

// Mock the theme hook
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: {
        muted: '#6B7280',
        alternative: '#6B7280',
      },
    },
  }),
}));

// Mock the i18n strings
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'perps.connection.connecting_to_perps': 'Connecting to Perps...',
      'perps.connection.timeout_title': 'Connection timeout',
      'perps.connection.retry_connection': 'Retry Connection',
    };
    return translations[key] || key;
  },
}));

// Mock the PerpsConnectionProvider
const mockReconnect = jest.fn().mockResolvedValue(undefined);
jest.mock('../../providers/PerpsConnectionProvider', () => ({
  usePerpsConnection: () => ({
    reconnectWithNewContext: mockReconnect,
  }),
}));

// Mock the design system components
jest.mock('@metamask/design-system-react-native', () => {
  const {
    View,
    Text: RNText,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  interface MockBoxProps {
    children?: React.ReactNode;
    testID?: string;
    twClassName?: string;
    alignItems?: string;
    justifyContent?: string;
  }

  interface MockTextProps {
    children?: React.ReactNode;
    testID?: string;
    variant?: string;
    twClassName?: string;
  }

  interface MockButtonProps {
    children?: React.ReactNode;
    onPress: () => void;
    testID?: string;
    variant?: string;
    size?: string;
  }

  return {
    Box: ({ children, testID, ...props }: MockBoxProps) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    Text: ({ children, testID, ...props }: MockTextProps) => (
      <RNText testID={testID} {...props}>
        {children}
      </RNText>
    ),
    Button: ({ children, onPress, testID, ...props }: MockButtonProps) => (
      <TouchableOpacity onPress={onPress} testID={testID} {...props}>
        <RNText>{children}</RNText>
      </TouchableOpacity>
    ),
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
    TextColor: {
      TextAlternative: 'TextAlternative',
    },
    BoxAlignItems: {
      Center: 'center',
    },
    BoxJustifyContent: {
      Center: 'center',
      Start: 'start',
    },
    ButtonVariant: {
      Primary: 'primary',
      Secondary: 'secondary',
    },
    ButtonSize: {
      Sm: 'small',
      Md: 'medium',
      Lg: 'large',
    },
  };
});

describe('PerpsLoadingSkeleton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReconnect.mockClear();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('displays loading spinner initially', () => {
    // Arrange & Act
    const { UNSAFE_getByType } = render(<PerpsLoadingSkeleton />);

    // Assert
    const spinner = UNSAFE_getByType(ActivityIndicator);
    expect(spinner).toBeDefined();
    expect(spinner.props.size).toBe('large');
  });

  it('displays connecting message initially', () => {
    // Arrange & Act
    const { getByText } = render(<PerpsLoadingSkeleton />);

    // Assert
    expect(getByText('Connecting to Perps...')).toBeOnTheScreen();
  });

  it('displays timeout message after 10 seconds', () => {
    // Arrange
    const { getByText, queryByText } = render(<PerpsLoadingSkeleton />);

    // Act - advance time to just before timeout
    act(() => {
      jest.advanceTimersByTime(9999);
    });

    // Assert - should still show loading
    expect(getByText('Connecting to Perps...')).toBeOnTheScreen();
    expect(queryByText('Connection timeout')).toBeNull();

    // Act - advance to timeout
    act(() => {
      jest.advanceTimersByTime(1);
    });

    // Assert - should now show timeout
    expect(getByText('Connection timeout')).toBeOnTheScreen();
    expect(queryByText('Connecting to Perps...')).toBeNull();
  });

  it('displays retry button after timeout', () => {
    // Arrange
    const { getByText } = render(<PerpsLoadingSkeleton />);

    // Act
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Assert
    expect(getByText('Retry Connection')).toBeOnTheScreen();
  });

  it('calls reconnectWithNewContext when retry button is pressed', () => {
    // Arrange
    const { getByText } = render(<PerpsLoadingSkeleton />);

    // Act - wait for timeout and press retry
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    const retryButton = getByText('Retry Connection');
    act(() => {
      fireEvent.press(retryButton);
    });

    // Assert
    expect(mockReconnect).toHaveBeenCalledTimes(1);
  });

  it('resets to loading state when retry is pressed', () => {
    // Arrange
    const { getByText, queryByText } = render(<PerpsLoadingSkeleton />);

    // Act - wait for timeout
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(getByText('Connection timeout')).toBeOnTheScreen();

    // Act - press retry
    const retryButton = getByText('Retry Connection');
    act(() => {
      fireEvent.press(retryButton);
    });

    // Assert - should be back to loading state
    expect(getByText('Connecting to Perps...')).toBeOnTheScreen();
    expect(queryByText('Connection timeout')).toBeNull();
  });

  it('renders with custom testID', () => {
    // Arrange
    const customTestId = 'custom-loading-skeleton';

    // Act
    const { getByTestId } = render(
      <PerpsLoadingSkeleton testID={customTestId} />,
    );

    // Assert
    expect(getByTestId(customTestId)).toBeOnTheScreen();
  });

  it('includes retry button testID when in timeout state', () => {
    // Arrange
    const testId = 'perps-loading-skeleton';
    const { getByTestId } = render(<PerpsLoadingSkeleton testID={testId} />);

    // Act
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Assert
    expect(getByTestId(`${testId}-retry-button`)).toBeOnTheScreen();
  });

  it('restarts timeout timer after retry (fixes infinite loading bug)', () => {
    // Arrange
    const { getByText, queryByText } = render(<PerpsLoadingSkeleton />);

    // Act - wait for initial timeout
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(getByText('Connection timeout')).toBeOnTheScreen();

    // Act - press retry (this should restart the timer)
    const retryButton = getByText('Retry Connection');
    act(() => {
      fireEvent.press(retryButton);
    });
    expect(getByText('Connecting to Perps...')).toBeOnTheScreen();
    expect(queryByText('Connection timeout')).toBeNull();

    // Act - advance time just before second timeout
    act(() => {
      jest.advanceTimersByTime(9999);
    });
    expect(getByText('Connecting to Perps...')).toBeOnTheScreen();
    expect(queryByText('Connection timeout')).toBeNull();

    // Act - advance to second timeout (timer should have restarted)
    act(() => {
      jest.advanceTimersByTime(1);
    });

    // Assert - timeout UI should appear again (proving timer restarted)
    expect(getByText('Connection timeout')).toBeOnTheScreen();
    expect(getByText('Retry Connection')).toBeOnTheScreen();
    expect(queryByText('Connecting to Perps...')).toBeNull();
  });
});
