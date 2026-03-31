import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import TokenListRoutes from './routes';
import Routes from '../../../constants/navigation/Routes';
import { backgroundState } from '../../../util/test/initial-root-state';

jest.mock('./Views/TokenSelection', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="token-selection">
        <Text>Token Selection</Text>
      </View>
    );
  };
  MockView.displayName = 'MockTokenSelection';
  return MockView;
});

jest.mock('./Views/BuildQuote', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="build-quote">
        <Text>Build Quote</Text>
      </View>
    );
  };
  MockView.displayName = 'MockBuildQuote';
  return MockView;
});

jest.mock('./Views/Checkout', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="checkout">
        <Text>Checkout</Text>
      </View>
    );
  };
  MockView.displayName = 'MockCheckout';
  return MockView;
});

jest.mock('./Views/NativeFlow/EnterEmail', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="enter-email">
        <Text>Enter Email</Text>
      </View>
    );
  };
  MockView.displayName = 'MockEnterEmail';
  return MockView;
});

jest.mock('./Views/NativeFlow/OtpCode', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="otp-code">
        <Text>OTP Code</Text>
      </View>
    );
  };
  MockView.displayName = 'MockOtpCode';
  return MockView;
});

jest.mock('./Views/NativeFlow/BasicInfo', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="basic-info">
        <Text>Basic Info</Text>
      </View>
    );
  };
  MockView.displayName = 'MockBasicInfo';
  return MockView;
});

jest.mock('./Views/NativeFlow/EnterAddress', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="enter-address">
        <Text>Enter Address</Text>
      </View>
    );
  };
  MockView.displayName = 'MockEnterAddress';
  return MockView;
});

jest.mock('./Views/NativeFlow/VerifyIdentity', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="verify-identity">
        <Text>Verify Identity</Text>
      </View>
    );
  };
  MockView.displayName = 'MockVerifyIdentity';
  return MockView;
});

jest.mock('./Views/NativeFlow/BankDetails', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="bank-details">
        <Text>Bank Details</Text>
      </View>
    );
  };
  MockView.displayName = 'MockBankDetails';
  return MockView;
});

jest.mock('./Views/NativeFlow/OrderProcessing', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="order-processing">
        <Text>Order Processing</Text>
      </View>
    );
  };
  MockView.displayName = 'MockOrderProcessing';
  return MockView;
});

jest.mock('./Views/NativeFlow/KycProcessing', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="kyc-processing">
        <Text>KYC Processing</Text>
      </View>
    );
  };
  MockView.displayName = 'MockKycProcessing';
  return MockView;
});

jest.mock('./Views/NativeFlow/AdditionalVerification', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="additional-verification">
        <Text>Additional Verification</Text>
      </View>
    );
  };
  MockView.displayName = 'MockAdditionalVerification';
  return MockView;
});

jest.mock('./Views/Modals/UnsupportedTokenModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="unsupported-token-modal">
        <Text>Unsupported Token Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockUnsupportedTokenModal';
  return MockModal;
});

jest.mock('./Views/Modals/SettingsModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="settings-modal">
        <Text>Settings Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockSettingsModal';
  return MockModal;
});

jest.mock('./Views/Modals/PaymentSelectionModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="payment-selection-modal">
        <Text>Payment Selection Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockPaymentSelectionModal';
  return MockModal;
});

jest.mock('./Views/Modals/TokenNotAvailableModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="token-not-available-modal">
        <Text>Token Not Available Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockTokenNotAvailableModal';
  return MockModal;
});

jest.mock('./Views/Modals/ProviderSelectionModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="provider-selection-modal">
        <Text>Provider Selection Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockProviderSelectionModal';
  return MockModal;
});

jest.mock('./Views/Modals/ErrorDetailsModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="error-details-modal">
        <Text>Error Details Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockErrorDetailsModal';
  return MockModal;
});

jest.mock('./Views/Modals/ProcessingInfoModal/ProcessingInfoModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="processing-info-modal">
        <Text>Processing Info Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockProcessingInfoModal';
  return MockModal;
});

jest.mock('./Deposit/Views/Modals/SsnInfoModal', () => {
  const MockModal = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="ssn-info-modal">
        <Text>SSN Info Modal</Text>
      </View>
    );
  };
  MockModal.displayName = 'MockSsnInfoModal';
  return MockModal;
});

jest.mock('./Views/OrderDetails', () => {
  const MockView = () => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="ramps-order-details">
        <Text>Ramps Order Details</Text>
      </View>
    );
  };
  MockView.displayName = 'MockRampsOrderDetails';
  return MockView;
});

const mockStartListening = jest.fn();
const mockStopListening = jest.fn();

jest.mock('../../../core/LockManagerService', () => ({
  startListening: () => mockStartListening(),
  stopListening: () => mockStopListening(),
}));

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};

const renderWithProviders = () => {
  const store = mockStore(initialState);
  return render(
    <Provider store={store}>
      <NavigationContainer>
        <TokenListRoutes />
      </NavigationContainer>
    </Provider>,
  );
};

describe('TokenListRoutes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProviders();
    expect(toJSON()).toBeTruthy();
  });

  it('stops lock manager listening on mount', () => {
    renderWithProviders();
    expect(mockStopListening).toHaveBeenCalled();
  });

  it('starts lock manager listening on unmount', () => {
    const { unmount } = renderWithProviders();
    unmount();
    expect(mockStartListening).toHaveBeenCalled();
  });
});

describe('Ramp Route Constants', () => {
  it('has token selection route defined', () => {
    expect(Routes.RAMP.TOKEN_SELECTION).toBeDefined();
  });

  it('has amount input route defined', () => {
    expect(Routes.RAMP.AMOUNT_INPUT).toBeDefined();
  });

  it('has checkout route defined', () => {
    expect(Routes.RAMP.CHECKOUT).toBeDefined();
  });

  it('has native flow routes defined', () => {
    expect(Routes.RAMP.ENTER_EMAIL).toBeDefined();
    expect(Routes.RAMP.OTP_CODE).toBeDefined();
    expect(Routes.RAMP.BASIC_INFO).toBeDefined();
    expect(Routes.RAMP.ENTER_ADDRESS).toBeDefined();
    expect(Routes.RAMP.VERIFY_IDENTITY).toBeDefined();
    expect(Routes.RAMP.BANK_DETAILS).toBeDefined();
    expect(Routes.RAMP.ORDER_PROCESSING).toBeDefined();
    expect(Routes.RAMP.KYC_PROCESSING).toBeDefined();
    expect(Routes.RAMP.ADDITIONAL_VERIFICATION).toBeDefined();
  });

  it('has ramps order details route defined', () => {
    expect(Routes.RAMP.RAMPS_ORDER_DETAILS).toBeDefined();
  });

  it('has modals routes defined', () => {
    expect(Routes.RAMP.MODALS.ID).toBeDefined();
    expect(Routes.RAMP.MODALS.UNSUPPORTED_TOKEN).toBeDefined();
    expect(Routes.RAMP.MODALS.BUILD_QUOTE_SETTINGS).toBeDefined();
    expect(Routes.RAMP.MODALS.PAYMENT_SELECTION).toBeDefined();
    expect(Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE).toBeDefined();
    expect(Routes.RAMP.MODALS.PROVIDER_SELECTION).toBeDefined();
    expect(Routes.RAMP.MODALS.ERROR_DETAILS).toBeDefined();
    expect(Routes.RAMP.MODALS.PROCESSING_INFO).toBeDefined();
    expect(Routes.RAMP.MODALS.SSN_INFO).toBeDefined();
  });
});

describe('Navigation Structure', () => {
  it('has main routes stack', () => {
    const { getByTestId } = renderWithProviders();
    expect(getByTestId('token-selection')).toBeTruthy();
  });
});
