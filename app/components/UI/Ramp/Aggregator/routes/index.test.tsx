/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import RampRoutes from './index';
import { RampType } from '../types';

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
          cardStyle?: { backgroundColor?: string };
        };
      }) => (
        <View testID="stack-navigator">
          {screenOptions?.headerShown === false && (
            <Text>headerShown: false</Text>
          )}
          {screenOptions?.presentation === 'modal' && (
            <Text testID="presentation-modal">presentation: modal</Text>
          )}
          {screenOptions?.cardStyle?.backgroundColor && (
            <Text testID="card-style">
              cardStyle: {screenOptions.cardStyle.backgroundColor}
            </Text>
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
          animationEnabled?: boolean;
          gestureEnabled?: boolean;
        };
      }) => (
        <View testID={`screen-${name}`}>
          <Text>{name}</Text>
          {options?.headerShown === false && <Text>no-header</Text>}
          {options?.animationEnabled === false && <Text>no-animation</Text>}
          {options?.gestureEnabled === false && <Text>no-gesture</Text>}
        </View>
      ),
    }),
  };
});

jest.mock('../Views/Quotes', () => {
  const { View } = require('react-native');
  return () => <View testID="quotes-component" />;
});

jest.mock('../Views/Checkout', () => {
  const { View } = require('react-native');
  return () => <View testID="checkout-component" />;
});

jest.mock('../Views/BuildQuote', () => {
  const { View } = require('react-native');
  return () => <View testID="build-quote-component" />;
});

jest.mock('../components/TokenSelectModal/TokenSelectModal', () => {
  const { View } = require('react-native');
  return () => <View testID="token-select-modal" />;
});

jest.mock('../components/PaymentMethodSelectorModal', () => {
  const { View } = require('react-native');
  return () => <View testID="payment-method-selector-modal" />;
});

jest.mock('../components/FiatSelectorModal', () => {
  const { View } = require('react-native');
  return () => <View testID="fiat-selector-modal" />;
});

jest.mock('../components/IncompatibleAccountTokenModal', () => {
  const { View } = require('react-native');
  return () => <View testID="incompatible-account-token-modal" />;
});

jest.mock('../components/RegionSelectorModal', () => {
  const { View } = require('react-native');
  return () => <View testID="region-selector-modal" />;
});

jest.mock('../components/UnsupportedRegionModal', () => {
  const { View } = require('react-native');
  return () => <View testID="unsupported-region-modal" />;
});

jest.mock('../Views/Modals/Settings', () => {
  const { View } = require('react-native');
  return () => <View testID="settings-modal" />;
});

jest.mock('../sdk', () => {
  const { View, Text } = require('react-native');
  return {
    RampSDKProvider: ({
      children,
      rampType,
    }: {
      children: React.ReactNode;
      rampType: string;
    }) => (
      <View testID="ramp-sdk-provider">
        <Text testID="ramp-type">{rampType}</Text>
        {children}
      </View>
    ),
  };
});

jest.mock('../../../../../constants/navigation/Routes', () => ({
  RAMP: {
    ID: 'Ramp',
    BUILD_QUOTE: 'BuildQuote',
    BUILD_QUOTE_HAS_STARTED: 'BuildQuoteHasStarted',
    QUOTES: 'Quotes',
    CHECKOUT: 'Checkout',
    MODALS: {
      ID: 'RampModals',
      TOKEN_SELECTOR: 'TokenSelectorModal',
      PAYMENT_METHOD_SELECTOR: 'PaymentMethodSelectorModal',
      FIAT_SELECTOR: 'FiatSelectorModal',
      INCOMPATIBLE_ACCOUNT_TOKEN: 'IncompatibleAccountTokenModal',
      REGION_SELECTOR: 'RegionSelectorModal',
      UNSUPPORTED_REGION: 'UnsupportedRegionModal',
      SETTINGS: 'SettingsModal',
    },
  },
}));

describe('RampRoutes', () => {
  const renderWithNavigation = (component: React.ReactElement) =>
    render(<NavigationContainer>{component}</NavigationContainer>);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RampRoutes component', () => {
    it('renders with BUY ramp type', () => {
      const { getByTestId, getByText } = renderWithNavigation(
        <RampRoutes rampType={RampType.BUY} />,
      );

      expect(getByTestId('ramp-sdk-provider')).toBeTruthy();
      expect(getByText(RampType.BUY)).toBeTruthy();
    });

    it('renders with SELL ramp type', () => {
      const { getByTestId, getByText } = renderWithNavigation(
        <RampRoutes rampType={RampType.SELL} />,
      );

      expect(getByTestId('ramp-sdk-provider')).toBeTruthy();
      expect(getByText(RampType.SELL)).toBeTruthy();
    });

    it('renders main routes stackNav', () => {
      const { getByTestId } = renderWithNavigation(
        <RampRoutes rampType={RampType.BUY} />,
      );

      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders nested navigation structure', () => {
      const { getAllByTestId } = renderWithNavigation(
        <RampRoutes rampType={RampType.BUY} />,
      );

      expect(getAllByTestId('stack-navigator').length).toBeGreaterThan(0);
    });

    it('includes Ramp main screen', () => {
      const { getByTestId } = renderWithNavigation(
        <RampRoutes rampType={RampType.BUY} />,
      );

      expect(getByTestId('screen-Ramp')).toBeTruthy();
    });

    it('includes modals stackNav screen', () => {
      const { getByTestId } = renderWithNavigation(
        <RampRoutes rampType={RampType.BUY} />,
      );

      expect(getByTestId('screen-RampModals')).toBeTruthy();
    });
  });

  describe('RampSDKProvider', () => {
    it('wraps routes with RampSDKProvider', () => {
      const { getByTestId } = renderWithNavigation(
        <RampRoutes rampType={RampType.BUY} />,
      );

      const provider = getByTestId('ramp-sdk-provider');
      const stackNav = getByTestId('stack-navigator');

      expect(provider).toBeTruthy();
      expect(stackNav).toBeTruthy();
    });

    it('passes BUY ramp type to provider', () => {
      const { getByTestId } = renderWithNavigation(
        <RampRoutes rampType={RampType.BUY} />,
      );

      expect(getByTestId('ramp-type').children[0]).toBe(RampType.BUY);
    });

    it('passes SELL ramp type to provider', () => {
      const { getByTestId } = renderWithNavigation(
        <RampRoutes rampType={RampType.SELL} />,
      );

      expect(getByTestId('ramp-type').children[0]).toBe(RampType.SELL);
    });
  });

  describe('Navigator configuration', () => {
    it('renders with header hidden configuration', () => {
      const { getByText } = renderWithNavigation(
        <RampRoutes rampType={RampType.BUY} />,
      );

      expect(getByText('headerShown: false')).toBeTruthy();
    });
  });
});
