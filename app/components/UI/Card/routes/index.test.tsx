/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CardRoutes from './index';

jest.mock('@react-navigation/stack', () => {
  const { View, Text } = require('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({
        children,
        screenOptions,
        initialRouteName,
      }: {
        children: React.ReactNode;
        screenOptions?: { headerShown?: boolean };
        initialRouteName?: string;
      }) => (
        <View testID="stack-navigator">
          {screenOptions?.headerShown === false && (
            <Text>headerShown: false</Text>
          )}
          {initialRouteName && (
            <Text testID="initial-route">{initialRouteName}</Text>
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
        };
      }) => (
        <View testID={`screen-${name}`}>
          <Text>{name}</Text>
          {options?.headerShown === false && <Text>no-header</Text>}
        </View>
      ),
    }),
  };
});

jest.mock('../Views/CardHome/CardHome', () => {
  const { View } = require('react-native');
  return () => <View testID="card-home" />;
});

jest.mock('../Views/CardWelcome/CardWelcome', () => {
  const { View } = require('react-native');
  return () => <View testID="card-welcome" />;
});

jest.mock('../Views/CardAuthentication/CardAuthentication', () => {
  const { View } = require('react-native');
  return () => <View testID="card-authentication" />;
});

jest.mock('../Views/SpendingLimit/SpendingLimit', () => {
  const { View } = require('react-native');
  return () => <View testID="spending-limit" />;
});

jest.mock('../Views/ChooseYourCard/ChooseYourCard', () => {
  const { View } = require('react-native');
  return () => <View testID="choose-your-card" />;
});

jest.mock('../Views/ReviewOrder/ReviewOrder', () => {
  const { View } = require('react-native');
  return () => <View testID="review-order" />;
});

jest.mock('./OnboardingNavigator', () => {
  const { View } = require('react-native');
  return () => <View testID="onboarding-navigator" />;
});

jest.mock('../components/AddFundsBottomSheet/AddFundsBottomSheet', () => {
  const { View } = require('react-native');
  return () => <View testID="add-funds-bottom-sheet" />;
});

jest.mock(
  '../components/AssetSelectionBottomSheet/AssetSelectionBottomSheet',
  () => {
    const { View } = require('react-native');
    return () => <View testID="asset-selection-bottom-sheet" />;
  },
);

jest.mock('../components/PasswordBottomSheet', () => {
  const { View } = require('react-native');
  return () => <View testID="password-bottom-sheet" />;
});

jest.mock('../components/Onboarding/RegionSelectorModal', () => {
  const { View } = require('react-native');
  return () => <View testID="region-selector-modal" />;
});

jest.mock('../components/Onboarding/ConfirmModal', () => {
  const { View } = require('react-native');
  return () => <View testID="confirm-modal" />;
});

jest.mock('../components/RecurringFeeModal/RecurringFeeModal', () => {
  const { View } = require('react-native');
  return () => <View testID="recurring-fee-modal" />;
});

jest.mock('../components/DaimoPayModal/DaimoPayModal', () => {
  const { View } = require('react-native');
  return () => <View testID="daimo-pay-modal" />;
});

jest.mock('../components/ViewPinBottomSheet', () => {
  const { View } = require('react-native');
  return () => <View testID="view-pin-bottom-sheet" />;
});

jest.mock('../Views/OrderCompleted/OrderCompleted', () => {
  const { View } = require('react-native');
  return () => <View testID="order-completed" />;
});

jest.mock('../Views/Cashback/Cashback', () => {
  const { View } = require('react-native');
  return () => <View testID="cashback" />;
});

jest.mock('../sdk', () => ({
  withCardSDK: (Component: React.ComponentType) => Component,
}));

jest.mock('../../../../constants/navigation/Routes', () => ({
  CARD: {
    HOME: 'CardHome',
    WELCOME: 'CardWelcome',
    CHOOSE_YOUR_CARD: 'ChooseYourCard',
    REVIEW_ORDER: 'ReviewOrder',
    ORDER_COMPLETED: 'OrderCompleted',
    CASHBACK: 'Cashback',
    AUTHENTICATION: 'CardAuthentication',
    SPENDING_LIMIT: 'SpendingLimit',
    ONBOARDING: {
      ROOT: 'CardOnboarding',
    },
    MODALS: {
      ID: 'CardModals',
      ADD_FUNDS: 'AddFunds',
      ASSET_SELECTION: 'AssetSelection',
      REGION_SELECTION: 'RegionSelection',
      CONFIRM_MODAL: 'ConfirmModal',
      PASSWORD: 'Password',
      RECURRING_FEE: 'RecurringFee',
      DAIMO_PAY: 'DaimoPay',
      VIEW_PIN: 'ViewPin',
    },
  },
}));

const createMockStore = (isAuthenticated = false, isCardholder = false) =>
  configureStore({
    reducer: {
      card: () => ({
        isAuthenticatedCard: isAuthenticated,
        isCardholder,
      }),
    },
  });

describe('CardRoutes', () => {
  const renderWithProviders = (
    component: React.ReactElement,
    store = createMockStore(),
  ) =>
    render(
      <Provider store={store}>
        <NavigationContainer>{component}</NavigationContainer>
      </Provider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CardRoutes component', () => {
    it('renders successfully', () => {
      const { getByTestId } = renderWithProviders(<CardRoutes />);

      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders nested stack navigators', () => {
      const { getAllByTestId } = renderWithProviders(<CardRoutes />);

      expect(getAllByTestId('stack-navigator').length).toBeGreaterThan(0);
    });

    it('includes CardHome screen', () => {
      const { getByTestId } = renderWithProviders(<CardRoutes />);

      expect(getByTestId('screen-CardHome')).toBeTruthy();
    });

    it('includes CardModals navigator', () => {
      const { getByTestId } = renderWithProviders(<CardRoutes />);

      expect(getByTestId('screen-CardModals')).toBeTruthy();
    });
  });

  describe('Initial route selection', () => {
    it('navigates to Home when authenticated', () => {
      const store = createMockStore(true, false);
      const { getAllByTestId } = renderWithProviders(<CardRoutes />, store);

      const initialRoutes = getAllByTestId('initial-route');
      expect(initialRoutes.some((el) => el.children[0] === 'CardHome')).toBe(
        true,
      );
    });

    it('navigates to Home when is cardholder', () => {
      const store = createMockStore(false, true);
      const { getAllByTestId } = renderWithProviders(<CardRoutes />, store);

      const initialRoutes = getAllByTestId('initial-route');
      expect(initialRoutes.some((el) => el.children[0] === 'CardHome')).toBe(
        true,
      );
    });
  });

  describe('Navigator configuration', () => {
    it('renders with header hidden configuration', () => {
      const { getByText } = renderWithProviders(<CardRoutes />);

      expect(getByText('headerShown: false')).toBeTruthy();
    });
  });
});
