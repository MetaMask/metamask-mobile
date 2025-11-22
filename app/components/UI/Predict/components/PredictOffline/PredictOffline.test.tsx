import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import PredictOffline from './PredictOffline';
import renderWithProvider from '../../../../../util/test/renderWithProvider';

// Mock dependencies
jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID} {...props}>
        {children}
      </View>
    ),
    Text: ({
      children,
      variant,
      ...props
    }: {
      children: React.ReactNode;
      variant?: string;
      [key: string]: unknown;
    }) => (
      <Text testID={props.testID} {...props}>
        {children}
      </Text>
    ),
    TextVariant: {
      HeadingMd: 'heading-md',
      BodyMd: 'body-md',
    },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      name,
      size,
      color,
      testID,
      ...props
    }: {
      name: string;
      size: string;
      color: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <View testID={testID || 'icon'} {...props}>
        {name}
      </View>
    ),
    IconName: {
      Warning: 'warning',
    },
    IconSize: {
      XXL: 'xxl',
    },
    IconColor: {
      Error: 'error',
    },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onPress,
      label,
      testID,
      ...props
    }: {
      onPress: () => void;
      label: string;
      testID?: string;
      [key: string]: unknown;
    }) => (
      <TouchableOpacity
        testID={testID || 'button'}
        onPress={onPress}
        {...props}
      >
        <Text>{label}</Text>
      </TouchableOpacity>
    ),
    ButtonSize: {
      Lg: 'lg',
    },
    ButtonVariants: {
      Primary: 'primary',
    },
  };
});

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      errorState: {},
      errorStateIcon: {},
      errorStateTitle: {},
      errorStateDescription: {},
      errorStateButton: {},
    },
  })),
}));

describe('PredictOffline', () => {
  describe('Component Rendering', () => {
    it('renders the error state with default message', () => {
      renderWithProvider(<PredictOffline />);

      expect(
        screen.getByText('Unable to connect to predictions'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Prediction markets are temporarily offline. Please check you have a stable connection and try again.',
        ),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('icon')).toBeOnTheScreen();
    });

    it('renders with custom test ID', () => {
      renderWithProvider(<PredictOffline testID="custom-error-state" />);

      expect(screen.getByTestId('custom-error-state')).toBeOnTheScreen();
    });

    it('renders with default test ID when not provided', () => {
      renderWithProvider(<PredictOffline />);

      expect(screen.getByTestId('predict-error-state')).toBeOnTheScreen();
    });
  });

  describe('Message Display', () => {
    it('displays error description', () => {
      renderWithProvider(<PredictOffline />);

      expect(
        screen.getByText(
          'Prediction markets are temporarily offline. Please check you have a stable connection and try again.',
        ),
      ).toBeOnTheScreen();
    });

    it('displays error title', () => {
      renderWithProvider(<PredictOffline />);

      expect(
        screen.getByText('Unable to connect to predictions'),
      ).toBeOnTheScreen();
    });
  });

  describe('Retry Button', () => {
    it('renders retry button when onRetry callback is provided', () => {
      const onRetry = jest.fn();

      renderWithProvider(<PredictOffline onRetry={onRetry} />);

      expect(screen.getByText('Retry')).toBeOnTheScreen();
    });

    it('calls onRetry callback when retry button is pressed', () => {
      const onRetry = jest.fn();

      renderWithProvider(<PredictOffline onRetry={onRetry} />);

      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not render retry button when onRetry callback is not provided', () => {
      renderWithProvider(<PredictOffline />);

      expect(screen.queryByText('Retry')).not.toBeOnTheScreen();
    });
  });

  describe('Icon Display', () => {
    it('displays warning icon', () => {
      renderWithProvider(<PredictOffline />);

      const icon = screen.getByTestId('icon');

      expect(icon).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('renders without retry button when onRetry is undefined', () => {
      renderWithProvider(<PredictOffline onRetry={undefined} />);

      expect(screen.queryByText('Retry')).not.toBeOnTheScreen();
    });
  });

  describe('Integration', () => {
    it('renders all elements together with retry callback', () => {
      const onRetry = jest.fn();

      renderWithProvider(
        <PredictOffline onRetry={onRetry} testID="network-error" />,
      );

      expect(screen.getByTestId('network-error')).toBeOnTheScreen();
      expect(
        screen.getByText('Unable to connect to predictions'),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Prediction markets are temporarily offline. Please check you have a stable connection and try again.',
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('Retry')).toBeOnTheScreen();
      expect(screen.getByTestId('icon')).toBeOnTheScreen();
    });
  });
});
