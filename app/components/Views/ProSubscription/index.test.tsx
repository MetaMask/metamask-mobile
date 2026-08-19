import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProSubscription from './index';
import { ProSubscriptionTestIds } from './ProSubscription.testIds';

const mockGoBack = jest.fn();
const mockReplace = jest.fn();
const mockNavigation = { goBack: mockGoBack, replace: mockReplace };
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

const mockUseProSubscriptionEnabled = jest.fn();
jest.mock('../../../hooks/useProSubscriptionEnabled', () => ({
  useProSubscriptionEnabled: () => mockUseProSubscriptionEnabled(),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('./screens/Benefits', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({
    onSuccess,
    initialPlan,
  }: {
    onSuccess: () => void;
    initialPlan?: string;
  }) => (
    <TouchableOpacity testID="mock-benefits" onPress={onSuccess}>
      <Text testID="mock-benefits-plan">{initialPlan ?? 'none'}</Text>
    </TouchableOpacity>
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
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
      variantName: 'treatment',
      isActive: true,
    });
  });

  describe('feature flag guard', () => {
    it('navigates back when Pro subscription is disabled', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: false,
        variantName: 'control',
        isActive: true,
      });

      render(<ProSubscription />);

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not navigate back when Pro subscription is enabled', () => {
      render(<ProSubscription />);

      expect(mockGoBack).not.toHaveBeenCalled();
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

    it('replaces the current screen with ProHub when Success onSuccess fires', () => {
      const { getByTestId } = render(<ProSubscription />);

      fireEvent.press(getByTestId('mock-benefits'));
      fireEvent.press(getByTestId('mock-success'));

      expect(mockReplace).toHaveBeenCalledWith('ProHub', {
        source: 'pro_subscription_success',
      });
      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  describe('route params', () => {
    it('passes initialPlan from route params to Benefits', () => {
      mockRoute.params = { initialPlan: 'monthly' };

      const { getByTestId } = render(<ProSubscription />);

      expect(getByTestId('mock-benefits-plan')).toHaveTextContent('monthly');
    });

    it('passes undefined initialPlan when route params are empty', () => {
      mockRoute.params = {};

      const { getByTestId } = render(<ProSubscription />);

      expect(getByTestId('mock-benefits-plan')).toHaveTextContent('none');
    });
  });
});
