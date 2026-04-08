import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import TokenListRoutes from './routes';

// Mock LockManagerService - must use inline jest.fn() to avoid hoisting issues
jest.mock('../../../core/LockManagerService', () => ({
  __esModule: true,
  default: {
    stopListening: jest.fn(),
    startListening: jest.fn(),
  },
}));

// Get references to the mock functions for assertions
const mockLockManagerService = jest.requireMock(
  '../../../core/LockManagerService',
).default;
const mockStopListening = mockLockManagerService.stopListening;
const mockStartListening = mockLockManagerService.startListening;

// Mock all the view components
jest.mock('./Views/TokenSelection', () => 'TokenSelection');
jest.mock('./Views/BuildQuote', () => 'BuildQuote');
jest.mock('./Views/Checkout', () => 'Checkout');
jest.mock('./Views/NativeFlow/EnterEmail', () => 'V2EnterEmail');
jest.mock('./Views/NativeFlow/OtpCode', () => 'V2OtpCode');
jest.mock('./Views/NativeFlow/BasicInfo', () => 'V2BasicInfo');
jest.mock('./Views/NativeFlow/EnterAddress', () => 'V2EnterAddress');
jest.mock('./Views/NativeFlow/VerifyIdentity', () => 'V2VerifyIdentity');
jest.mock('./Views/NativeFlow/BankDetails', () => 'V2BankDetails');
jest.mock('./Views/NativeFlow/OrderProcessing', () => 'V2OrderProcessing');
jest.mock('./Views/NativeFlow/KycProcessing', () => 'V2KycProcessing');
jest.mock(
  './Views/NativeFlow/AdditionalVerification',
  () => 'V2AdditionalVerification',
);
jest.mock(
  './Views/Modals/UnsupportedTokenModal',
  () => 'UnsupportedTokenModal',
);
jest.mock('./Views/Modals/SettingsModal', () => 'SettingsModal');
jest.mock(
  './Views/Modals/PaymentSelectionModal',
  () => 'PaymentSelectionModal',
);
jest.mock(
  './Views/Modals/TokenNotAvailableModal',
  () => 'TokenNotAvailableModal',
);
jest.mock(
  './Views/Modals/ProviderSelectionModal',
  () => 'ProviderSelectionModal',
);
jest.mock('./Views/Modals/ErrorDetailsModal', () => 'ErrorDetailsModal');
jest.mock(
  './Views/Modals/ProcessingInfoModal/ProcessingInfoModal',
  () => 'ProcessingInfoModal',
);
jest.mock('./Views/OrderDetails', () => 'RampsOrderDetails');

// Mock @react-navigation/stack
jest.mock('@react-navigation/stack', () => {
  const { View } = jest.requireActual('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({
        children,
        ...props
      }: React.PropsWithChildren<Record<string, unknown>>) => (
        <View testID="stack-navigator" {...props}>
          {children}
        </View>
      ),
      Screen: ({
        children,
        ...props
      }: React.PropsWithChildren<{ name: string }>) => (
        <View testID={`screen-${props.name}`} {...props}>
          {children}
        </View>
      ),
    }),
  };
});

const renderWithNavigation = (component: React.ReactElement) =>
  render(<NavigationContainer>{component}</NavigationContainer>);

describe('TokenListRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auto-lock Management', () => {
    it('disables auto-lock when component mounts', () => {
      renderWithNavigation(<TokenListRoutes />);

      expect(mockStopListening).toHaveBeenCalledTimes(1);
    });

    it('re-enables auto-lock when component unmounts', () => {
      const { unmount } = renderWithNavigation(<TokenListRoutes />);

      expect(mockStartListening).not.toHaveBeenCalled();

      unmount();

      expect(mockStartListening).toHaveBeenCalledTimes(1);
    });
  });
});
