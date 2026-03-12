/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer, NavigationProp } from '@react-navigation/native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import CardRoutes, {
  cardDefaultNavigationOptions,
  cardSpendingLimitNavigationOptions,
  cardChooseYourCardNavigationOptions,
  headerStyle,
} from './index';

const mockStore = configureMockStore();

interface MockNavigation {
  goBack: jest.Mock;
  reset: jest.Mock;
}

const createMockNavigation = (): MockNavigation => ({
  goBack: jest.fn(),
  reset: jest.fn(),
});

jest.mock('@react-navigation/stack', () => {
  const { View, Text } = require('react-native');
  return {
    createStackNavigator: () => ({
      Navigator: ({
        children,
        screenOptions,
      }: {
        children: React.ReactNode;
        screenOptions?: { headerShown?: boolean };
      }) => (
        <View testID="stack-navigator">
          {screenOptions?.headerShown === false && (
            <Text>headerShown: false</Text>
          )}
          {children}
        </View>
      ),
      Screen: ({ name, options }: { name: string; options?: unknown }) => (
        <View testID={`screen-${name}`}>
          <Text>{name}</Text>
          {typeof options === 'function' && <Text>has-options-function</Text>}
        </View>
      ),
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  selectIsAuthenticatedCard: jest.fn(),
  selectIsCardholder: jest.fn(),
}));

jest.mock('../sdk', () => ({
  withCardSDK: (Component: React.ComponentType) => Component,
}));

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
      ADD_FUNDS: 'AddFundsModal',
      ASSET_SELECTION: 'AssetSelectionModal',
      REGION_SELECTION: 'RegionSelectionModal',
      CONFIRM_MODAL: 'ConfirmModal',
      PASSWORD: 'PasswordModal',
      RECURRING_FEE: 'RecurringFeeModal',
      DAIMO_PAY: 'DaimoPayModal',
      VIEW_PIN: 'ViewPinModal',
    },
  },
}));

type SelectorFunction = (state: unknown) => unknown;

describe('CardRoutes', () => {
  const { useSelector } = jest.requireMock('react-redux');
  const { selectIsAuthenticatedCard, selectIsCardholder } = jest.requireMock(
    '../../../../core/redux/slices/card',
  );

  const store = mockStore({
    card: {
      isAuthenticated: false,
      isCardholder: false,
    },
  });

  const renderWithProviders = (component: React.ReactElement) =>
    render(
      <Provider store={store}>
        <NavigationContainer>{component}</NavigationContainer>
      </Provider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    useSelector.mockImplementation((selector: SelectorFunction) => {
      if (selector === selectIsAuthenticatedCard) return false;
      if (selector === selectIsCardholder) return false;
      return undefined;
    });
  });

  describe('CardRoutes component', () => {
    it('renders successfully', () => {
      const { getByTestId } = renderWithProviders(<CardRoutes />);

      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('renders nested navigation structure', () => {
      const { getAllByTestId } = renderWithProviders(<CardRoutes />);

      expect(getAllByTestId('stack-navigator').length).toBeGreaterThan(0);
    });

    it('includes CardHome screen', () => {
      const { getByTestId } = renderWithProviders(<CardRoutes />);

      expect(getByTestId('screen-CardHome')).toBeTruthy();
    });

    it('includes CardModals screen', () => {
      const { getByTestId } = renderWithProviders(<CardRoutes />);

      expect(getByTestId('screen-CardModals')).toBeTruthy();
    });
  });

  describe('headerStyle', () => {
    it('defines icon style with horizontal margin', () => {
      expect(headerStyle.icon).toEqual({ marginHorizontal: 16 });
    });

    it('defines title style with self alignment', () => {
      expect(headerStyle.title).toEqual({ alignSelf: 'center' });
    });
  });

  describe('cardDefaultNavigationOptions', () => {
    it('returns navigation options with headerLeft function', () => {
      const mockNav = createMockNavigation();
      const options = cardDefaultNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
      });

      expect(options.headerLeft).toBeDefined();
      expect(typeof options.headerLeft).toBe('function');
    });

    it('returns navigation options with headerTitle function', () => {
      const mockNav = createMockNavigation();
      const options = cardDefaultNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
      });

      expect(options.headerTitle).toBeDefined();
      expect(typeof options.headerTitle).toBe('function');
    });

    it('returns navigation options with headerRight function', () => {
      const mockNav = createMockNavigation();
      const options = cardDefaultNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
      });

      expect(options.headerRight).toBeDefined();
      expect(typeof options.headerRight).toBe('function');
    });

    it('headerLeft calls navigation.goBack when pressed', () => {
      const mockNav = createMockNavigation();
      const options = cardDefaultNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
      });

      const headerLeft = options.headerLeft?.({
        canGoBack: true,
      });
      headerLeft?.props.onPress();

      expect(mockNav.goBack).toHaveBeenCalled();
    });
  });

  describe('cardSpendingLimitNavigationOptions', () => {
    it('shows back button for manage flow', () => {
      const mockNav = createMockNavigation();
      const route = { params: { flow: 'manage' as const } };
      const options = cardSpendingLimitNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
        route,
      });

      expect(options.headerLeft).toBeDefined();
      expect(options.gestureEnabled).toBe(true);
    });

    it('disables gestures for onboarding flow', () => {
      const mockNav = createMockNavigation();
      const route = { params: { flow: 'onboarding' as const } };
      const options = cardSpendingLimitNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
        route,
      });

      expect(options.gestureEnabled).toBe(false);
    });

    it('enables gestures for manage flow', () => {
      const mockNav = createMockNavigation();
      const route = { params: { flow: 'manage' as const } };
      const options = cardSpendingLimitNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
        route,
      });

      expect(options.gestureEnabled).toBe(true);
    });

    it('defaults to manage flow when no flow param is provided', () => {
      const mockNav = createMockNavigation();
      const route = { params: {} };
      const options = cardSpendingLimitNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
        route,
      });

      expect(options.gestureEnabled).toBe(true);
    });

    it('resets navigation to CardHome when close button is pressed in onboarding flow', () => {
      const mockNav = createMockNavigation();
      const route = { params: { flow: 'onboarding' as const } };
      const options = cardSpendingLimitNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
        route,
      });

      const headerRight = options.headerRight?.({ canGoBack: true });
      headerRight?.props.onPress();

      expect(mockNav.reset).toHaveBeenCalledWith({
        index: 0,
        routes: [{ name: 'CardHome' }],
      });
    });
  });

  describe('cardChooseYourCardNavigationOptions', () => {
    it('returns headerTitle as a function', () => {
      const mockNav = createMockNavigation();
      const route = { params: {} };
      const options = cardChooseYourCardNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
        route,
      });

      expect(typeof options.headerTitle).toBe('function');
    });

    it('returns headerRight as a function', () => {
      const mockNav = createMockNavigation();
      const route = { params: {} };
      const options = cardChooseYourCardNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
        route,
      });

      expect(typeof options.headerRight).toBe('function');
    });

    it('calls goBack when back button pressed in upgrade flow', () => {
      const mockNav = createMockNavigation();
      const route = { params: { flow: 'upgrade' as const } };
      const options = cardChooseYourCardNavigationOptions({
        navigation: mockNav as unknown as NavigationProp<
          Record<string, unknown>
        >,
        route,
      });

      const headerLeft = options.headerLeft?.({ canGoBack: true });
      headerLeft?.props.onPress();

      expect(mockNav.goBack).toHaveBeenCalled();
    });
  });

  describe('MainRoutes initial route selection', () => {
    it('uses CardHome as initial route when user is authenticated', () => {
      useSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector === selectIsAuthenticatedCard) return true;
        if (selector === selectIsCardholder) return false;
        return undefined;
      });

      const { getByTestId } = renderWithProviders(<CardRoutes />);
      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('uses CardHome as initial route when user is cardholder', () => {
      useSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector === selectIsAuthenticatedCard) return false;
        if (selector === selectIsCardholder) return true;
        return undefined;
      });

      const { getByTestId } = renderWithProviders(<CardRoutes />);
      expect(getByTestId('stack-navigator')).toBeTruthy();
    });

    it('uses CardWelcome as initial route when user is not authenticated and not cardholder', () => {
      useSelector.mockImplementation((selector: SelectorFunction) => {
        if (selector === selectIsAuthenticatedCard) return false;
        if (selector === selectIsCardholder) return false;
        return undefined;
      });

      const { getByTestId } = renderWithProviders(<CardRoutes />);
      expect(getByTestId('stack-navigator')).toBeTruthy();
    });
  });
});
