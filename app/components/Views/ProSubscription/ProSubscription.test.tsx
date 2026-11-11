import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import type { NavigationState } from '@react-navigation/native';
import ProSubscription from './ProSubscription';
import { ProSubscriptionTestIds } from './ProSubscription.testIds';
import { MoneyAccountPlusAccess } from '../../../hooks/useMoneyAccountPlusAccess';
import { selectIsMoneyAccountGeoEligible } from '../../UI/Money/selectors/eligibility';
import { getDetectedGeolocation } from '../../../reducers/fiatOrders';
import Routes from '../../../constants/navigation/Routes';

const mockUseSelector = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockSetParams = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  dispatch: mockDispatch,
  setParams: mockSetParams,
};

const subscriptionModalState = {
  key: 'app',
  index: 1,
  routeNames: ['Home', Routes.PRO_SUBSCRIPTION.ROOT, Routes.PRO_HUB.ROOT],
  routes: [
    { key: 'home', name: 'Home' },
    { key: 'pro-sub', name: Routes.PRO_SUBSCRIPTION.ROOT },
  ],
  type: 'stack',
  stale: false,
} as NavigationState;

const expectProHubReplacesSubscriptionModal = () => {
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  const update = mockDispatch.mock.calls[0][0] as (state: NavigationState) => {
    type: string;
    payload: NavigationState;
  };

  expect(update(subscriptionModalState)).toEqual(
    expect.objectContaining({
      type: 'RESET',
      payload: expect.objectContaining({
        index: 1,
        routes: [{ key: 'home', name: 'Home' }, { name: Routes.PRO_HUB.ROOT }],
      }),
    }),
  );
};
const mockRoute = { params: {} };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

const mockUseMoneyAccountPlusAccess = jest.fn();
jest.mock('../../../hooks/useMoneyAccountPlusAccess', () => ({
  ...jest.requireActual('../../../hooks/useMoneyAccountPlusAccess'),
  useMoneyAccountPlusAccess: () => mockUseMoneyAccountPlusAccess(),
}));

const mockUseHasProMembership = jest.fn(() => false);
jest.mock('../../../hooks/useHasProMembership', () => ({
  useHasProMembership: () => mockUseHasProMembership(),
}));

const mockGetSubscriptions = jest.fn().mockResolvedValue([]);
jest.mock('../../../core/Engine', () => ({
  context: {
    SubscriptionController: {
      getSubscriptions: () => mockGetSubscriptions(),
    },
  },
}));

/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('./screens/Benefits', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({
    onSuccess,
    onProcessing,
    onCheckoutStart,
    onCheckoutError,
    onPlanChange,
    initialPlan,
  }: {
    onSuccess: (plan: { planId: string }) => void;
    onProcessing: () => void;
    onCheckoutStart: () => void;
    onCheckoutError: () => void;
    onPlanChange?: (planId: string) => void;
    initialPlan?: string;
  }) => (
    <>
      <TouchableOpacity
        testID="mock-benefits"
        onPress={() => onSuccess({ planId: initialPlan ?? 'annual' })}
      >
        <Text testID="mock-benefits-plan">{initialPlan ?? 'none'}</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="mock-processing" onPress={onProcessing} />
      <TouchableOpacity
        testID="mock-checkout-start"
        onPress={onCheckoutStart}
      />
      <TouchableOpacity
        testID="mock-checkout-error"
        onPress={onCheckoutError}
      />
      <TouchableOpacity
        testID="mock-select-monthly"
        onPress={() => onPlanChange?.('monthly')}
      />
    </>
  );
});

jest.mock('./screens/Success', () => {
  const { TouchableOpacity } = require('react-native');
  return ({ onSuccess }: { onSuccess: () => void }) => (
    <TouchableOpacity testID="mock-success" onPress={onSuccess} />
  );
});
/* eslint-enable @typescript-eslint/no-require-imports */

const mockShowProcessingToast = jest.fn();
jest.mock('./hooks/useProSubscriptionPaymentToasts', () => ({
  useProSubscriptionPaymentToasts: () => ({
    showProcessingToast: mockShowProcessingToast,
    showActiveToast: jest.fn(),
    dismissPaymentToast: jest.fn(),
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ProSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.params = {};
    mockGetSubscriptions.mockResolvedValue([]);
    mockUseSelector.mockImplementation((selector: unknown) => {
      if (selector === selectIsMoneyAccountGeoEligible) {
        return true;
      }
      if (selector === getDetectedGeolocation) {
        return 'US';
      }
      return undefined;
    });
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Eligible,
    );
    mockUseHasProMembership.mockReturnValue(false);
  });

  describe('access guard', () => {
    it('navigates back when Pro subscription is disabled', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Disabled,
      );

      render(<ProSubscription />);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not navigate back for an eligible non-subscriber', () => {
      render(<ProSubscription />);

      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('navigates back when a resolved country is geo-blocked', () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectIsMoneyAccountGeoEligible) {
          return false;
        }
        if (selector === getDetectedGeolocation) {
          return 'GB';
        }
        return undefined;
      });

      render(<ProSubscription />);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('keeps Benefits visible while geolocation is still unknown', () => {
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectIsMoneyAccountGeoEligible) {
          return false;
        }
        if (selector === getDetectedGeolocation) {
          return undefined;
        }
        return undefined;
      });

      const { getByTestId } = render(<ProSubscription />);

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getByTestId('mock-benefits')).toBeOnTheScreen();
    });

    it('sends a geo-blocked member to the hub', () => {
      mockUseHasProMembership.mockReturnValue(true);
      mockUseSelector.mockImplementation((selector: unknown) => {
        if (selector === selectIsMoneyAccountGeoEligible) {
          return false;
        }
        if (selector === getDetectedGeolocation) {
          return 'GB';
        }
        return undefined;
      });

      render(<ProSubscription />);

      expect(mockGoBack).not.toHaveBeenCalled();
      expectProHubReplacesSubscriptionModal();
    });

    it('sends an existing member straight to the hub', () => {
      mockUseHasProMembership.mockReturnValue(true);

      render(<ProSubscription />);

      expectProHubReplacesSubscriptionModal();
    });

    it('keeps Benefits visible when the user becomes a subscriber during checkout', () => {
      const { getByTestId, rerender } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-checkout-start'));
      mockUseHasProMembership.mockReturnValue(true);
      rerender(<ProSubscription />);

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(getByTestId('mock-benefits')).toBeOnTheScreen();
    });

    it('sends the user to the hub if they subscribe after a failed checkout', () => {
      const { getByTestId, rerender } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-checkout-start'));
      fireEvent.press(getByTestId('mock-checkout-error'));
      mockUseHasProMembership.mockReturnValue(true);
      rerender(<ProSubscription />);

      expectProHubReplacesSubscriptionModal();
    });

    it('shows Benefits while Plus access is unresolved', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Unknown,
      );

      const { getByTestId } = render(<ProSubscription />);

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(getByTestId('mock-benefits')).toBeOnTheScreen();
    });

    it('sends the user to the hub once unresolved access becomes a membership', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Unknown,
      );

      const { rerender } = render(<ProSubscription />);

      mockUseHasProMembership.mockReturnValue(true);
      rerender(<ProSubscription />);

      expectProHubReplacesSubscriptionModal();
    });

    it('keeps Benefits open for a canceled membership', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Subscriber,
      );

      const { getByTestId } = render(<ProSubscription />);

      expect(mockDispatch).not.toHaveBeenCalled();
      expect(getByTestId('mock-benefits')).toBeOnTheScreen();
    });
  });

  describe('screen rendering', () => {
    it('renders Benefits screen by default', () => {
      const { getByTestId, queryByTestId } = render(<ProSubscription />);

      expect(getByTestId('mock-benefits')).toBeOnTheScreen();
      expect(queryByTestId('mock-success')).not.toBeOnTheScreen();
    });

    it('renders Success screen after onSuccess callback fires', () => {
      const { getByTestId, queryByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-benefits'));

      expect(getByTestId('mock-success')).toBeOnTheScreen();
      expect(queryByTestId('mock-benefits')).not.toBeOnTheScreen();
    });

    it('shows the processing toast and opens Pro Hub when funding is still in progress', () => {
      const { getByTestId, queryByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-processing'));

      expect(mockShowProcessingToast).toHaveBeenCalledTimes(1);
      expectProHubReplacesSubscriptionModal();
      expect(queryByTestId('mock-success')).toBeNull();
    });
  });

  describe('navigation callbacks', () => {
    it('renders the close button with the correct testID', () => {
      const { getByTestId } = render(<ProSubscription />);

      expect(
        getByTestId(ProSubscriptionTestIds.CLOSE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('calls goBack when the close button is pressed', () => {
      const { getByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId(ProSubscriptionTestIds.CLOSE_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('refreshes subscriptions before replacing the screen with ProHub', async () => {
      const { getByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-benefits'));
      await act(async () => {
        fireEvent.press(getByTestId('mock-success'));
      });

      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
      expectProHubReplacesSubscriptionModal();
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('keeps the success screen when the post-checkout refresh fails', async () => {
      mockGetSubscriptions.mockRejectedValue(new Error('request failed'));
      const { getByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-benefits'));
      await act(async () => {
        fireEvent.press(getByTestId('mock-success'));
      });

      expect(getByTestId('mock-success')).toBeOnTheScreen();
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('keeps the success screen visible once the user becomes a subscriber', () => {
      const { getByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-benefits'));
      mockUseHasProMembership.mockReturnValue(true);
      fireEvent.press(getByTestId(ProSubscriptionTestIds.CLOSE_BUTTON));

      expect(getByTestId('mock-success')).toBeOnTheScreen();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });

  describe('route params', () => {
    it('passes initialPlan from route params to Benefits', () => {
      mockRoute.params = { initialPlan: 'monthly' };

      const { getByTestId } = render(<ProSubscription />);

      expect(getByTestId('mock-benefits-plan')).toHaveTextContent('monthly');
    });

    it('passes the default annual plan when route params are empty', () => {
      mockRoute.params = {};

      const { getByTestId } = render(<ProSubscription />);

      expect(getByTestId('mock-benefits-plan')).toHaveTextContent('annual');
    });

    it('writes the selected plan to route params', () => {
      const { getByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-select-monthly'));

      expect(mockSetParams).toHaveBeenCalledWith({ initialPlan: 'monthly' });
    });
  });
});
