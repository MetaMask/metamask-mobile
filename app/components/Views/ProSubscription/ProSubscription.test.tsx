import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import ProSubscription from './ProSubscription';
import { ProSubscriptionTestIds } from './ProSubscription.testIds';
import { MoneyAccountPlusAccess } from '../../../hooks/useMoneyAccountPlusAccess';

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockSetParams = jest.fn();
const mockNavigation = {
  goBack: mockGoBack,
  replace: mockReplace,
  setParams: mockSetParams,
};
const mockRoute = { params: {} };

jest.mock('@react-navigation/native', () => ({
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

const mockRefreshEntitlements = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../core/Subscription/entitlementResolution', () => ({
  refresh: () => mockRefreshEntitlements(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('./screens/Benefits', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({
    onSuccess,
    onPlanChange,
    initialPlan,
  }: {
    onSuccess: (plan: { planId: string }) => void;
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

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ProSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.params = {};
    mockRefreshEntitlements.mockResolvedValue(undefined);
    mockUseMoneyAccountPlusAccess.mockReturnValue(
      MoneyAccountPlusAccess.Eligible,
    );
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

    it('sends an existing subscriber straight to the hub', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Subscriber,
      );

      render(<ProSubscription />);

      expect(mockReplace).toHaveBeenCalledWith('ProHub', {
        source: 'pro_subscription_already_subscribed',
      });
    });

    it('holds back the upsell while entitlements are loading', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Loading,
      );

      const { queryByTestId, getByTestId } = render(<ProSubscription />);

      expect(queryByTestId('mock-benefits')).not.toBeOnTheScreen();
      expect(mockGoBack).not.toHaveBeenCalled();
      // The close button stays available so the modal is never a dead end.
      expect(
        getByTestId(ProSubscriptionTestIds.CLOSE_BUTTON),
      ).toBeOnTheScreen();
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

    it('refreshes entitlements before replacing the screen with ProHub', async () => {
      const { getByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-benefits'));
      await act(async () => {
        fireEvent.press(getByTestId('mock-success'));
      });

      expect(mockRefreshEntitlements).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith('ProHub', {
        source: 'pro_subscription_success',
      });
      expect(mockGoBack).not.toHaveBeenCalled();
    });

    it('keeps the success screen visible once the user becomes a subscriber', () => {
      const { getByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-benefits'));
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Subscriber,
      );
      fireEvent.press(getByTestId(ProSubscriptionTestIds.CLOSE_BUTTON));

      expect(getByTestId('mock-success')).toBeOnTheScreen();
      expect(mockReplace).not.toHaveBeenCalled();
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
