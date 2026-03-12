/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import TokenListRoutes from './routes';
import LockManagerService from '../../../core/LockManagerService';

jest.mock('@react-navigation/stack', () => {
  const { View, Text } = require('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({
        children,
        screenOptions,
      }: {
        children: React.ReactNode;
        screenOptions?: {
          headerShown?: boolean;
          presentation?: string;
        };
      }) => (
        <View testID="stack-navigator">
          {screenOptions?.headerShown === false && (
            <Text>headerShown: false</Text>
          )}
          {screenOptions?.presentation && (
            <Text>presentation: {screenOptions.presentation}</Text>
          )}
          {children}
        </View>
      ),
      Screen: ({
        name,
        options,
      }: {
        name: string;
        options?: {
          headerShown?: boolean;
          gestureEnabled?: boolean;
        };
      }) => (
        <View testID={`screen-${name}`}>
          <Text>{name}</Text>
          {options?.headerShown === false && <Text>no-header</Text>}
          {options?.gestureEnabled === false && <Text>no-gesture</Text>}
        </View>
      ),
    }),
  };
});

jest.mock('../../../core/LockManagerService', () => ({
  stopListening: jest.fn(),
  startListening: jest.fn(),
}));

jest.mock('./Views/TokenSelection', () => {
  const { View } = require('react-native');
  return () => <View testID="token-selection" />;
});

jest.mock('./Views/BuildQuote', () => {
  const { View } = require('react-native');
  return () => <View testID="build-quote" />;
});

jest.mock('./Views/Checkout', () => {
  const { View } = require('react-native');
  return () => <View testID="checkout" />;
});

jest.mock('./Views/NativeFlow/EnterEmail', () => {
  const { View } = require('react-native');
  return () => <View testID="enter-email" />;
});

jest.mock('./Views/NativeFlow/OtpCode', () => {
  const { View } = require('react-native');
  return () => <View testID="otp-code" />;
});

jest.mock('./Views/NativeFlow/BasicInfo', () => {
  const { View } = require('react-native');
  return () => <View testID="basic-info" />;
});

jest.mock('./Views/NativeFlow/EnterAddress', () => {
  const { View } = require('react-native');
  return () => <View testID="enter-address" />;
});

jest.mock('./Views/NativeFlow/VerifyIdentity', () => {
  const { View } = require('react-native');
  return () => <View testID="verify-identity" />;
});

jest.mock('./Views/NativeFlow/BankDetails', () => {
  const { View } = require('react-native');
  return () => <View testID="bank-details" />;
});

jest.mock('./Views/NativeFlow/OrderProcessing', () => {
  const { View } = require('react-native');
  return () => <View testID="order-processing" />;
});

jest.mock('./Views/NativeFlow/KycProcessing', () => {
  const { View } = require('react-native');
  return () => <View testID="kyc-processing" />;
});

jest.mock('./Views/NativeFlow/AdditionalVerification', () => {
  const { View } = require('react-native');
  return () => <View testID="additional-verification" />;
});

jest.mock('./Views/Modals/UnsupportedTokenModal', () => {
  const { View } = require('react-native');
  return () => <View testID="unsupported-token-modal" />;
});

jest.mock('./Views/Modals/SettingsModal', () => {
  const { View } = require('react-native');
  return () => <View testID="settings-modal" />;
});

jest.mock('./Views/Modals/PaymentSelectionModal', () => {
  const { View } = require('react-native');
  return () => <View testID="payment-selection-modal" />;
});

jest.mock('./Views/Modals/TokenNotAvailableModal', () => {
  const { View } = require('react-native');
  return () => <View testID="token-not-available-modal" />;
});

jest.mock('./Views/Modals/ProviderSelectionModal', () => {
  const { View } = require('react-native');
  return () => <View testID="provider-selection-modal" />;
});

jest.mock('./Views/Modals/ErrorDetailsModal', () => {
  const { View } = require('react-native');
  return () => <View testID="error-details-modal" />;
});

jest.mock('./Views/Modals/ProcessingInfoModal/ProcessingInfoModal', () => {
  const { View } = require('react-native');
  return () => <View testID="processing-info-modal" />;
});

jest.mock('./Deposit/Views/Modals/SsnInfoModal', () => {
  const { View } = require('react-native');
  return () => <View testID="ssn-info-modal" />;
});

jest.mock('./Views/OrderDetails', () => {
  const { View } = require('react-native');
  return () => <View testID="order-details" />;
});

jest.mock('../../../constants/navigation/Routes', () => ({
  RAMP: {
    TOKEN_SELECTION: 'TokenSelection',
    AMOUNT_INPUT: 'AmountInput',
    ENTER_EMAIL: 'EnterEmail',
    OTP_CODE: 'OtpCode',
    BASIC_INFO: 'BasicInfo',
    ENTER_ADDRESS: 'EnterAddress',
    VERIFY_IDENTITY: 'VerifyIdentity',
    BANK_DETAILS: 'BankDetails',
    ORDER_PROCESSING: 'OrderProcessing',
    KYC_PROCESSING: 'KycProcessing',
    ADDITIONAL_VERIFICATION: 'AdditionalVerification',
    CHECKOUT: 'Checkout',
    RAMPS_ORDER_DETAILS: 'RampsOrderDetails',
    MODALS: {
      ID: 'RampModals',
      UNSUPPORTED_TOKEN: 'UnsupportedTokenModal',
      BUILD_QUOTE_SETTINGS: 'BuildQuoteSettingsModal',
      PAYMENT_SELECTION: 'PaymentSelectionModal',
      TOKEN_NOT_AVAILABLE: 'TokenNotAvailableModal',
      PROVIDER_SELECTION: 'ProviderSelectionModal',
      ERROR_DETAILS: 'ErrorDetailsModal',
      PROCESSING_INFO: 'ProcessingInfoModal',
      SSN_INFO: 'SsnInfoModal',
    },
  },
}));

describe('TokenListRoutes (Ramp routes)', () => {
  const renderWithNavigation = (component: React.ReactElement) =>
    render(<NavigationContainer>{component}</NavigationContainer>);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('LockManagerService integration', () => {
    it('stops listening to lock manager on mount', () => {
      renderWithNavigation(<TokenListRoutes />);

      expect(LockManagerService.stopListening).toHaveBeenCalled();
    });

    it('starts listening to lock manager on unmount', () => {
      const { unmount } = renderWithNavigation(<TokenListRoutes />);

      unmount();

      expect(LockManagerService.startListening).toHaveBeenCalled();
    });

    it('calls stopListening only once on mount', () => {
      renderWithNavigation(<TokenListRoutes />);

      expect(LockManagerService.stopListening).toHaveBeenCalledTimes(1);
    });
  });

  describe('Main routes', () => {
    it('renders successfully', () => {
      const { getByTestId } = renderWithNavigation(<TokenListRoutes />);

      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders nested stack navigators', () => {
      const { getAllByTestId } = renderWithNavigation(<TokenListRoutes />);

      expect(getAllByTestId('stack-navigator').length).toBeGreaterThan(0);
    });

    it('includes TokenSelection screen', () => {
      const { getByTestId } = renderWithNavigation(<TokenListRoutes />);

      expect(getByTestId('screen-TokenSelection')).toBeTruthy();
    });

    it('includes RampModals navigator', () => {
      const { getByTestId } = renderWithNavigation(<TokenListRoutes />);

      expect(getByTestId('screen-RampModals')).toBeTruthy();
    });
  });

  describe('Navigator configuration', () => {
    it('has header hidden for main navigator', () => {
      const { getByText } = renderWithNavigation(<TokenListRoutes />);

      expect(getByText('headerShown: false')).toBeTruthy();
    });

    it('includes modals navigator with no-header option', () => {
      const { getByTestId, getByText } = renderWithNavigation(
        <TokenListRoutes />,
      );

      expect(getByTestId('screen-RampModals')).toBeTruthy();
      expect(getByText('no-header')).toBeTruthy();
    });
  });
});
