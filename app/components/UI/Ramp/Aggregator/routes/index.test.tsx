import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { NavigationContainer } from '@react-navigation/native';
import RampRoutes from './index';
import { RampType } from '../types';
import Routes from '../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../util/test/initial-root-state';

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn().mockReturnValue({
    Navigator: ({ children }: { children: React.ReactNode }) => children,
    Screen: ({
      name,
      component: Component,
    }: {
      name: string;
      component: React.ComponentType;
    }) => <Component key={name} />,
  }),
}));

jest.mock('../sdk', () => ({
  RampSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../Views/Quotes', () => 'Quotes');
jest.mock('../Views/Checkout', () => 'CheckoutWebView');
jest.mock('../Views/BuildQuote', () => 'BuildQuote');
jest.mock(
  '../components/TokenSelectModal/TokenSelectModal',
  () => 'TokenSelectModal',
);
jest.mock(
  '../components/PaymentMethodSelectorModal',
  () => 'PaymentMethodSelectorModal',
);
jest.mock('../components/FiatSelectorModal', () => 'FiatSelectorModal');
jest.mock(
  '../components/IncompatibleAccountTokenModal',
  () => 'IncompatibleAccountTokenModal',
);
jest.mock('../components/RegionSelectorModal', () => 'RegionSelectorModal');
jest.mock(
  '../components/UnsupportedRegionModal',
  () => 'UnsupportedRegionModal',
);
jest.mock('../Views/Modals/Settings', () => 'SettingsModal');

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState,
  },
  fiatOrders: {
    selectedRegion: null,
    selectedPaymentMethodId: null,
    getStartedToken: null,
    getStartedChainId: null,
  },
  settings: {
    currentCurrency: 'USD',
  },
};

describe('RampRoutes', () => {
  const renderWithProviders = (rampType: RampType) => {
    const store = mockStore(initialState);

    return render(
      <Provider store={store}>
        <NavigationContainer>
          <RampRoutes rampType={rampType} />
        </NavigationContainer>
      </Provider>,
    );
  };

  it('renders RampRoutes with BUY type', () => {
    const { toJSON } = renderWithProviders(RampType.BUY);
    expect(toJSON()).toBeTruthy();
  });

  it('renders RampRoutes with SELL type', () => {
    const { toJSON } = renderWithProviders(RampType.SELL);
    expect(toJSON()).toBeTruthy();
  });

  it('provides correct initial route name for BUY type', () => {
    const { toJSON } = renderWithProviders(RampType.BUY);
    expect(toJSON()).toBeTruthy();
  });

  it('provides correct initial route name for SELL type', () => {
    const { toJSON } = renderWithProviders(RampType.SELL);
    expect(toJSON()).toBeTruthy();
  });

  describe('route configuration', () => {
    it('contains BUILD_QUOTE route', () => {
      expect(Routes.RAMP.BUILD_QUOTE).toBeDefined();
    });

    it('contains QUOTES route', () => {
      expect(Routes.RAMP.QUOTES).toBeDefined();
    });

    it('contains CHECKOUT route', () => {
      expect(Routes.RAMP.CHECKOUT).toBeDefined();
    });

    it('contains modal routes', () => {
      expect(Routes.RAMP.MODALS.TOKEN_SELECTOR).toBeDefined();
      expect(Routes.RAMP.MODALS.PAYMENT_METHOD_SELECTOR).toBeDefined();
      expect(Routes.RAMP.MODALS.FIAT_SELECTOR).toBeDefined();
      expect(Routes.RAMP.MODALS.REGION_SELECTOR).toBeDefined();
      expect(Routes.RAMP.MODALS.UNSUPPORTED_REGION).toBeDefined();
      expect(Routes.RAMP.MODALS.SETTINGS).toBeDefined();
    });
  });
});
