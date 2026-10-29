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
    onCheckoutStart,
    onCheckoutError,
    onPlanChange,
    initialPlan,
  }: {
    onSuccess: (plan: { planId: string }) => void;
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

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ProSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoute.params = {};
    mockGetSubscriptions.mockResolvedValue([]);
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

    it('sends an existing member straight to the hub', () => {
      mockUseHasProMembership.mockReturnValue(true);

      render(<ProSubscription />);

      expect(mockReplace).toHaveBeenCalledWith('ProHub');
    });

    it('keeps Benefits visible when the user becomes a subscriber during checkout', () => {
      const { getByTestId, rerender } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-checkout-start'));
      mockUseHasProMembership.mockReturnValue(true);
      rerender(<ProSubscription />);

      expect(mockReplace).not.toHaveBeenCalled();
      expect(getByTestId('mock-benefits')).toBeOnTheScreen();
    });

    it('sends the user to the hub if they subscribe after a failed checkout', () => {
      const { getByTestId, rerender } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-checkout-start'));
      fireEvent.press(getByTestId('mock-checkout-error'));
      mockUseHasProMembership.mockReturnValue(true);
      rerender(<ProSubscription />);

      expect(mockReplace).toHaveBeenCalledWith('ProHub');
    });

    it('shows Benefits while Plus access is unresolved', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Unknown,
      );

      const { getByTestId } = render(<ProSubscription />);

      expect(mockReplace).not.toHaveBeenCalled();
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

      expect(mockReplace).toHaveBeenCalledWith('ProHub');
    });

    it('keeps Benefits open for a canceled membership', () => {
      mockUseMoneyAccountPlusAccess.mockReturnValue(
        MoneyAccountPlusAccess.Subscriber,
      );

      const { getByTestId } = render(<ProSubscription />);

      expect(mockReplace).not.toHaveBeenCalled();
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
      expect(mockReplace).toHaveBeenCalledWith('ProHub');
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
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('keeps the success screen visible once the user becomes a subscriber', () => {
      const { getByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-benefits'));
      mockUseHasProMembership.mockReturnValue(true);
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
