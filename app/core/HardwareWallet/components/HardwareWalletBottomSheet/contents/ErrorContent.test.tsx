import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import {
  HardwareWalletError,
  HardwareWalletType,
  ErrorCode,
  Severity,
  Category,
} from '@metamask/hw-wallet-sdk';

import {
  ErrorContent,
  ERROR_CONTENT_TEST_ID,
  ERROR_CONTENT_ICON_TEST_ID,
  ERROR_CONTENT_TITLE_TEST_ID,
  ERROR_CONTENT_MESSAGE_TEST_ID,
  ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID,
} from './ErrorContent';

// Mock dependencies
jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#FFFFFF', alternative: '#F2F4F6' },
      text: { default: '#24272A', alternative: '#6A737D' },
      primary: { default: '#037DD6', inverse: '#FFFFFF' },
      error: { default: '#D73A49' },
    },
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../errors', () => ({
  getIconForErrorCode: jest.fn().mockReturnValue('Danger'),
  getIconColorForErrorCode: jest.fn().mockReturnValue('Error'),
  getTitleForErrorCode: jest.fn().mockReturnValue('Error Title'),
  getRecoveryActionForErrorCode: jest.fn().mockReturnValue('retry'),
  RecoveryAction: {
    RETRY: 'retry',
    ACKNOWLEDGE: 'acknowledge',
  },
}));

// Mock component library
jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => <Text testID={testID}>{children}</Text>,
    TextVariant: { HeadingMD: 'HeadingMD', BodyMD: 'BodyMD' },
    TextColor: { Default: 'Default', Alternative: 'Alternative' },
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      label,
      onPress,
      testID,
      isDisabled,
    }: {
      label: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      isDisabled?: boolean;
    }) => (
      <TouchableOpacity
        testID={testID}
        onPress={isDisabled ? undefined : onPress}
        disabled={isDisabled}
      >
        {typeof label === 'string' ? (
          <Text>{label}</Text>
        ) : (
          <View>{label}</View>
        )}
      </TouchableOpacity>
    ),
    ButtonVariants: { Primary: 'Primary', Secondary: 'Secondary' },
    ButtonSize: { Lg: 'Lg' },
    ButtonWidthTypes: { Full: 'Full' },
  };
});

jest.mock(
  '../../../../../component-library/components/Sheet/SheetHeader',
  () => {
    const { Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ title }: { title: string }) => <Text>{title}</Text>,
    };
  },
);

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID }: { testID?: string }) => <View testID={testID} />,
    IconSize: { Xl: 'Xl' },
  };
});

describe('ErrorContent', () => {
  const createError = (
    message: string,
    code: ErrorCode = ErrorCode.Unknown,
    userMessage?: string,
  ): HardwareWalletError =>
    new HardwareWalletError(message, {
      code,
      severity: Severity.Err,
      category: Category.Unknown,
      userMessage: userMessage ?? message,
    });

  it('renders with test ID', () => {
    const error = createError('Test error');
    const { getByTestId } = render(
      <ErrorContent error={error} deviceType={HardwareWalletType.Ledger} />,
    );

    expect(getByTestId(ERROR_CONTENT_TEST_ID)).toBeOnTheScreen();
  });

  it('renders error icon', () => {
    const error = createError('Test error');
    const { getByTestId } = render(
      <ErrorContent error={error} deviceType={HardwareWalletType.Ledger} />,
    );

    expect(getByTestId(ERROR_CONTENT_ICON_TEST_ID)).toBeOnTheScreen();
  });

  it('renders error title', () => {
    const error = createError('Test error');
    const { getByTestId } = render(
      <ErrorContent error={error} deviceType={HardwareWalletType.Ledger} />,
    );

    expect(getByTestId(ERROR_CONTENT_TITLE_TEST_ID)).toBeOnTheScreen();
  });

  it('renders error message when available', () => {
    const error = createError(
      'Test error',
      ErrorCode.Unknown,
      'User-friendly error message',
    );
    const { getByTestId } = render(
      <ErrorContent error={error} deviceType={HardwareWalletType.Ledger} />,
    );

    expect(getByTestId(ERROR_CONTENT_MESSAGE_TEST_ID)).toBeOnTheScreen();
  });

  it('does not render message when not available', () => {
    // Create error without userMessage by setting it to empty string
    const error = new HardwareWalletError('Test error', {
      code: ErrorCode.Unknown,
      severity: Severity.Err,
      category: Category.Unknown,
      userMessage: '',
    });
    const { queryByTestId } = render(
      <ErrorContent error={error} deviceType={HardwareWalletType.Ledger} />,
    );

    expect(queryByTestId(ERROR_CONTENT_MESSAGE_TEST_ID)).toBeNull();
  });

  it('returns null when error is null', () => {
    const { queryByTestId } = render(
      <ErrorContent error={null} deviceType={HardwareWalletType.Ledger} />,
    );

    expect(queryByTestId(ERROR_CONTENT_TEST_ID)).toBeNull();
  });

  it('renders Continue button', () => {
    const error = createError('Test error');
    const { getByTestId } = render(
      <ErrorContent error={error} deviceType={HardwareWalletType.Ledger} />,
    );

    expect(
      getByTestId(ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID),
    ).toBeOnTheScreen();
  });

  it('calls onContinue when continue button pressed', async () => {
    const onContinue = jest.fn().mockResolvedValue(undefined);
    const error = createError('Test error');
    const { getByTestId } = render(
      <ErrorContent
        error={error}
        onContinue={onContinue}
        deviceType={HardwareWalletType.Ledger}
      />,
    );

    fireEvent.press(getByTestId(ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID));

    await waitFor(() => {
      expect(onContinue).toHaveBeenCalled();
    });
  });

  it('disables button when isLoading is true', () => {
    const onContinue = jest.fn();
    const error = createError('Test error');
    const { getByTestId } = render(
      <ErrorContent
        error={error}
        onContinue={onContinue}
        isLoading
        deviceType={HardwareWalletType.Ledger}
      />,
    );

    const button = getByTestId(ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID);
    fireEvent.press(button);

    expect(onContinue).not.toHaveBeenCalled();
  });

  it('prevents double-tap while retrying', async () => {
    // eslint-disable-next-line no-empty-function
    let resolveRetry: () => void = () => {};
    const retryPromise = new Promise<void>((resolve) => {
      resolveRetry = resolve;
    });
    const onContinue = jest.fn().mockReturnValue(retryPromise);
    const error = createError('Test error');
    const { getByTestId } = render(
      <ErrorContent
        error={error}
        onContinue={onContinue}
        deviceType={HardwareWalletType.Ledger}
      />,
    );

    const button = getByTestId(ERROR_CONTENT_CONTINUE_BUTTON_TEST_ID);

    // First press
    fireEvent.press(button);
    expect(onContinue).toHaveBeenCalledTimes(1);

    // Second press while still loading - should be ignored
    fireEvent.press(button);
    expect(onContinue).toHaveBeenCalledTimes(1);

    // Resolve the promise - resolveRetry should be defined at this point
    if (resolveRetry) {
      resolveRetry();
    }
    await waitFor(() => {
      expect(onContinue).toHaveBeenCalledTimes(1);
    });
  });
});
