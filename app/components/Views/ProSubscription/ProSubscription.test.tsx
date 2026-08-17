import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ProSubscription from './index';
import { ProSubscriptionTestIds } from './ProSubscription.testIds';
import { useProSubscriptionEnabled } from '../../../hooks/useProSubscriptionEnabled';
import Benefits from './screens/Benefits';
import Success from './screens/Success';

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, replace: mockReplace }),
    useRoute: () => ({ params: {} }),
  };
});

// ─── Tailwind ─────────────────────────────────────────────────────────────────

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

// ─── Feature flag ─────────────────────────────────────────────────────────────

jest.mock('../../../hooks/useProSubscriptionEnabled');

const mockUseProSubscriptionEnabled = jest.mocked(useProSubscriptionEnabled);

// ─── Child screens ────────────────────────────────────────────────────────────

jest.mock('./screens/Benefits');
jest.mock('./screens/Success');

const MockBenefits = Benefits as jest.MockedFunction<typeof Benefits>;
const MockSuccess = Success as jest.MockedFunction<typeof Success>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderProSubscription = () => render(<ProSubscription />);

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ProSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseProSubscriptionEnabled.mockReturnValue({
      isProSubscriptionEnabled: true,
      variantName: 'treatment',
      isActive: true,
    });
    MockBenefits.mockImplementation(({ onSuccess }) => (
      <View testID="mock-benefits-screen">
        <TouchableOpacity
          testID="mock-benefits-success-trigger"
          onPress={onSuccess}
        >
          <Text>Trigger success</Text>
        </TouchableOpacity>
      </View>
    ));
    MockSuccess.mockImplementation(({ onSuccess }) => (
      <View testID="mock-success-screen">
        <TouchableOpacity
          testID="mock-success-subscribe-trigger"
          onPress={onSuccess}
        >
          <Text>Subscribe</Text>
        </TouchableOpacity>
      </View>
    ));
  });

  // ── Close button ──────────────────────────────────────────────────────────

  describe('close button', () => {
    it('renders with the correct testID', () => {
      const { getByTestId } = renderProSubscription();

      expect(
        getByTestId(ProSubscriptionTestIds.CLOSE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('calls navigation.goBack when pressed', () => {
      const { getByTestId } = renderProSubscription();

      fireEvent.press(getByTestId(ProSubscriptionTestIds.CLOSE_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack before the button is pressed', () => {
      renderProSubscription();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  // ── Feature flag guard ─────────────────────────────────────────────────────

  describe('feature flag guard', () => {
    it('calls navigation.goBack on mount when the Pro flag is disabled', () => {
      mockUseProSubscriptionEnabled.mockReturnValue({
        isProSubscriptionEnabled: false,
        variantName: 'control',
        isActive: false,
      });

      renderProSubscription();

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack on mount when the Pro flag is enabled', () => {
      renderProSubscription();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  // ── Screen routing ─────────────────────────────────────────────────────────

  describe('screen routing', () => {
    it('renders the Benefits screen by default', () => {
      const { getByTestId } = renderProSubscription();

      expect(getByTestId('mock-benefits-screen')).toBeOnTheScreen();
    });

    it('does not render the Success screen by default', () => {
      const { queryByTestId } = renderProSubscription();

      expect(queryByTestId('mock-success-screen')).not.toBeOnTheScreen();
    });

    it('renders the Success screen after onSuccess fires', () => {
      const { getByTestId } = renderProSubscription();

      fireEvent.press(getByTestId('mock-benefits-success-trigger'));

      expect(getByTestId('mock-success-screen')).toBeOnTheScreen();
    });

    it('hides the Benefits screen after onSuccess fires', () => {
      const { getByTestId, queryByTestId } = renderProSubscription();

      fireEvent.press(getByTestId('mock-benefits-success-trigger'));

      expect(queryByTestId('mock-benefits-screen')).not.toBeOnTheScreen();
    });
  });

  // ── Hub navigation (Success onSuccess) ────────────────────────────────────

  describe('hub navigation', () => {
    it('replaces the current screen with ProHub when Success onSuccess fires', () => {
      const { getByTestId } = renderProSubscription();

      fireEvent.press(getByTestId('mock-benefits-success-trigger'));
      fireEvent.press(getByTestId('mock-success-subscribe-trigger'));

      expect(mockReplace).toHaveBeenCalledWith('ProHub', {
        source: 'pro_subscription_success',
      });
    });

    it('does not call goBack when Success onSuccess fires', () => {
      const { getByTestId } = renderProSubscription();

      fireEvent.press(getByTestId('mock-benefits-success-trigger'));
      fireEvent.press(getByTestId('mock-success-subscribe-trigger'));

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });
});
