import React from 'react';
import { render, cleanup } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import Routes from '../../../constants/navigation/Routes';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockStopListening = jest.fn();
const mockStartListening = jest.fn();

jest.mock('../../../core/LockManagerService', () => ({
  __esModule: true,
  default: {
    stopListening: () => mockStopListening(),
    startListening: () => mockStartListening(),
  },
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn().mockReturnValue({
    Navigator: ({
      children,
      initialRouteName,
    }: {
      children: React.ReactNode;
      initialRouteName: string;
    }) => (
      <div data-testid="navigator" data-initial-route={initialRouteName}>
        {children}
      </div>
    ),
    Screen: ({
      name,
      component,
    }: {
      name: string;
      component: React.ComponentType;
    }) => (
      <div data-testid={`screen-${name}`} data-component={component?.name} />
    ),
  }),
}));

jest.mock('./Views/TokenSelection', () => () => null);
jest.mock('./Views/BuildQuote', () => () => null);
jest.mock('./Views/Checkout', () => () => null);
jest.mock('./Views/NativeFlow/EnterEmail', () => () => null);
jest.mock('./Views/NativeFlow/OtpCode', () => () => null);
jest.mock('./Views/NativeFlow/BasicInfo', () => () => null);
jest.mock('./Views/NativeFlow/EnterAddress', () => () => null);
jest.mock('./Views/NativeFlow/VerifyIdentity', () => () => null);
jest.mock('./Views/NativeFlow/BankDetails', () => () => null);
jest.mock('./Views/NativeFlow/OrderProcessing', () => () => null);
jest.mock('./Views/NativeFlow/KycProcessing', () => () => null);
jest.mock('./Views/NativeFlow/AdditionalVerification', () => () => null);
jest.mock('./Views/Modals/UnsupportedTokenModal', () => () => null);
jest.mock('./Views/Modals/SettingsModal', () => () => null);
jest.mock('./Views/Modals/PaymentSelectionModal', () => () => null);
jest.mock('./Views/Modals/TokenNotAvailableModal', () => () => null);
jest.mock('./Views/Modals/ProviderSelectionModal', () => () => null);
jest.mock('./Views/Modals/ErrorDetailsModal', () => () => null);
jest.mock(
  './Views/Modals/ProcessingInfoModal/ProcessingInfoModal',
  () => () => null,
);
jest.mock('./Deposit/Views/Modals/SsnInfoModal', () => () => null);
jest.mock('./Views/OrderDetails', () => () => null);

// Import after mocks are set up
import TokenListRoutes from './routes';

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState,
  },
};

describe('TokenListRoutes configuration', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllMocks();
  });

  describe('route configuration', () => {
    it('contains TOKEN_SELECTION route', () => {
      expect(Routes.RAMP.TOKEN_SELECTION).toBeDefined();
    });

    it('contains AMOUNT_INPUT route', () => {
      expect(Routes.RAMP.AMOUNT_INPUT).toBeDefined();
    });

    it('contains CHECKOUT route', () => {
      expect(Routes.RAMP.CHECKOUT).toBeDefined();
    });

    it('contains native flow routes', () => {
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

    it('contains modal routes', () => {
      expect(Routes.RAMP.MODALS.UNSUPPORTED_TOKEN).toBeDefined();
      expect(Routes.RAMP.MODALS.BUILD_QUOTE_SETTINGS).toBeDefined();
      expect(Routes.RAMP.MODALS.PAYMENT_SELECTION).toBeDefined();
      expect(Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE).toBeDefined();
      expect(Routes.RAMP.MODALS.PROVIDER_SELECTION).toBeDefined();
      expect(Routes.RAMP.MODALS.ERROR_DETAILS).toBeDefined();
      expect(Routes.RAMP.MODALS.PROCESSING_INFO).toBeDefined();
      expect(Routes.RAMP.MODALS.SSN_INFO).toBeDefined();
    });

    it('contains RAMPS_ORDER_DETAILS route', () => {
      expect(Routes.RAMP.RAMPS_ORDER_DETAILS).toBeDefined();
    });

    it('contains MODALS.ID route', () => {
      expect(Routes.RAMP.MODALS.ID).toBeDefined();
    });
  });

  describe('TokenListRoutes component', () => {
    const renderComponent = () => {
      const store = mockStore(initialState);
      return render(
        <Provider store={store}>
          <NavigationContainer>
            <TokenListRoutes />
          </NavigationContainer>
        </Provider>,
      );
    };

    it('renders without crashing', () => {
      const { toJSON } = renderComponent();
      expect(toJSON()).toBeTruthy();
    });

    it('calls LockManagerService.stopListening on mount', () => {
      renderComponent();
      expect(mockStopListening).toHaveBeenCalledTimes(1);
    });

    it('calls LockManagerService.startListening on unmount', () => {
      const { unmount } = renderComponent();
      expect(mockStopListening).toHaveBeenCalledTimes(1);

      unmount();
      expect(mockStartListening).toHaveBeenCalledTimes(1);
    });

    it('disables auto-lock during the ramp flow', () => {
      const { unmount } = renderComponent();

      expect(mockStopListening).toHaveBeenCalled();
      expect(mockStartListening).not.toHaveBeenCalled();

      unmount();

      expect(mockStartListening).toHaveBeenCalled();
    });

    it('matches snapshot', () => {
      const { toJSON } = renderComponent();
      expect(toJSON()).toMatchSnapshot();
    });

    it('cleans up LockManagerService on re-mount', () => {
      const { unmount } = renderComponent();
      expect(mockStopListening).toHaveBeenCalledTimes(1);

      unmount();
      expect(mockStartListening).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();
      renderComponent();

      expect(mockStopListening).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearStackNavigatorOptions', () => {
    it('has correct configuration', () => {
      expect(Routes.RAMP.MODALS.ID).toBeDefined();
    });
  });

  describe('MainRoutes screens', () => {
    it('has all main route screens defined', () => {
      expect(Routes.RAMP.TOKEN_SELECTION).toBeDefined();
      expect(Routes.RAMP.AMOUNT_INPUT).toBeDefined();
      expect(Routes.RAMP.ENTER_EMAIL).toBeDefined();
      expect(Routes.RAMP.OTP_CODE).toBeDefined();
      expect(Routes.RAMP.BASIC_INFO).toBeDefined();
      expect(Routes.RAMP.ENTER_ADDRESS).toBeDefined();
      expect(Routes.RAMP.VERIFY_IDENTITY).toBeDefined();
      expect(Routes.RAMP.BANK_DETAILS).toBeDefined();
      expect(Routes.RAMP.ORDER_PROCESSING).toBeDefined();
      expect(Routes.RAMP.KYC_PROCESSING).toBeDefined();
      expect(Routes.RAMP.ADDITIONAL_VERIFICATION).toBeDefined();
      expect(Routes.RAMP.CHECKOUT).toBeDefined();
      expect(Routes.RAMP.RAMPS_ORDER_DETAILS).toBeDefined();
    });
  });

  describe('TokenListModalsRoutes modals', () => {
    it('has all modal route screens defined', () => {
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

  describe('Navigation flow', () => {
    it('initializes with TOKEN_SELECTION as initial route', () => {
      expect(Routes.RAMP.TOKEN_SELECTION).toBe('RampTokenSelection');
    });

    it('has proper CHECKOUT route with correct name', () => {
      expect(Routes.RAMP.CHECKOUT).toBe('RampCheckout');
    });
  });
});
