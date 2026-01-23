import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardManageSection from './CardManageSection';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { CardHomeSelectors } from '../CardHome.testIds';
import type { CardHomeFeatures } from '../CardHome.types';
import { AllowanceState, CardTokenAllowance } from '../../../types';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'card.card_home.manage_card_options.view_card_details':
        'View Card Details',
      'card.card_home.manage_card_options.hide_card_details':
        'Hide Card Details',
      'card.card_home.manage_card_options.view_card_details_description':
        'View your card number and CVV',
      'card.card_home.manage_card_options.manage_spending_limit':
        'Manage Spending Limit',
      'card.card_home.manage_card_options.manage_spending_limit_description_full':
        'Full spending access enabled',
      'card.card_home.manage_card_options.manage_spending_limit_description_restricted':
        'Limited spending enabled',
      'card.card_home.manage_card_options.manage_card': 'Manage Card',
      'card.card_home.manage_card_options.advanced_card_management_description':
        'Advanced card settings',
      'card.card_home.manage_card_options.travel_title': 'Travel',
      'card.card_home.manage_card_options.travel_description':
        'Set travel notifications',
      'card.card_home.manage_card_options.card_tos_title':
        'Terms and Conditions',
      'card.card_home.logout': 'Log Out',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock('../../../components/ManageCardListItem', () => {
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return function MockManageCardListItem({
    title,
    description,
    onPress,
    testID,
  }: {
    title: string;
    description: string;
    onPress: () => void;
    testID: string;
  }) {
    return (
      <TouchableOpacity onPress={onPress} testID={testID}>
        <Text>{title}</Text>
        <Text>{description}</Text>
      </TouchableOpacity>
    );
  };
});

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'CardManageSection',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

const createFeatures = (
  overrides: Partial<CardHomeFeatures> = {},
): CardHomeFeatures => ({
  isAuthenticated: true,
  isBaanxLoginEnabled: true,
  canViewCardDetails: true,
  canManageSpendingLimit: true,
  canChangeAsset: true,
  showSpendingLimitWarning: false,
  showSpendingLimitProgress: false,
  showAllowanceLimitedWarning: false,
  isSwapEnabled: true,
  ...overrides,
});

const createPriorityToken = (
  overrides: Partial<CardTokenAllowance> = {},
): CardTokenAllowance => ({
  address: '0x123',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
  allowance: '1000000',
  allowanceState: AllowanceState.Enabled,
  caipChainId: 'eip155:59144',
  ...overrides,
});

describe('CardManageSection', () => {
  const mockOnViewCardDetails = jest.fn();
  const mockOnManageSpendingLimit = jest.fn();
  const mockOnNavigateToCardPage = jest.fn();
  const mockOnNavigateToTravelPage = jest.fn();
  const mockOnNavigateToCardTosPage = jest.fn();
  const mockOnLogout = jest.fn();

  const defaultProps = {
    onViewCardDetails: mockOnViewCardDetails,
    onManageSpendingLimit: mockOnManageSpendingLimit,
    onNavigateToCardPage: mockOnNavigateToCardPage,
    onNavigateToTravelPage: mockOnNavigateToTravelPage,
    onNavigateToCardTosPage: mockOnNavigateToCardTosPage,
    onLogout: mockOnLogout,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('KYC pending or setup required state', () => {
    it('renders only ToS and Logout when isKYCPending is true and authenticated', () => {
      const features = createFeatures();

      const { getByTestId, queryByTestId, getByText } = renderWithProvider(
        () => (
          <CardManageSection
            features={features}
            needsSetup={false}
            isKYCPending
            isCardDetailsImageShowing={false}
            priorityToken={null}
            {...defaultProps}
          />
        ),
      );

      expect(getByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeOnTheScreen();
      expect(getByTestId(CardHomeSelectors.LOGOUT_ITEM)).toBeOnTheScreen();
      expect(getByText('Terms and Conditions')).toBeOnTheScreen();
      expect(getByText('Log Out')).toBeOnTheScreen();

      // Other items should not be visible
      expect(
        queryByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM),
      ).not.toBeOnTheScreen();
    });

    it('renders only ToS and Logout when needsSetup is true and authenticated', () => {
      const features = createFeatures();

      const { getByTestId, queryByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      expect(getByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeOnTheScreen();
      expect(getByTestId(CardHomeSelectors.LOGOUT_ITEM)).toBeOnTheScreen();

      expect(
        queryByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM),
      ).not.toBeOnTheScreen();
    });

    it('calls onNavigateToCardTosPage when ToS is pressed in setup state', () => {
      const features = createFeatures();

      const { getByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.CARD_TOS_ITEM));

      expect(mockOnNavigateToCardTosPage).toHaveBeenCalledTimes(1);
    });

    it('calls onLogout when Logout is pressed in setup state', () => {
      const features = createFeatures();

      const { getByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.LOGOUT_ITEM));

      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('ready state (full options)', () => {
    it('renders all management options when authenticated and ready', () => {
      const features = createFeatures();
      const priorityToken = createPriorityToken();

      const { getByTestId, getByText } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={priorityToken}
          {...defaultProps}
        />
      ));

      expect(
        getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
      ).toBeOnTheScreen();
      expect(
        getByTestId(CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM),
      ).toBeOnTheScreen();
      expect(getByTestId(CardHomeSelectors.TRAVEL_ITEM)).toBeOnTheScreen();
      expect(getByTestId(CardHomeSelectors.CARD_TOS_ITEM)).toBeOnTheScreen();
      expect(getByTestId(CardHomeSelectors.LOGOUT_ITEM)).toBeOnTheScreen();

      expect(getByText('View Card Details')).toBeOnTheScreen();
      expect(getByText('Manage Spending Limit')).toBeOnTheScreen();
      expect(getByText('Manage Card')).toBeOnTheScreen();
      expect(getByText('Travel')).toBeOnTheScreen();
    });

    it('renders "Hide Card Details" when isCardDetailsImageShowing is true', () => {
      const features = createFeatures();

      const { getByText } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing
          priorityToken={null}
          {...defaultProps}
        />
      ));

      expect(getByText('Hide Card Details')).toBeOnTheScreen();
    });

    it('hides View Card Details when canViewCardDetails is false', () => {
      const features = createFeatures({ canViewCardDetails: false });

      const { queryByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      expect(
        queryByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('hides Manage Spending Limit when canManageSpendingLimit is false', () => {
      const features = createFeatures({ canManageSpendingLimit: false });

      const { queryByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      expect(
        queryByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
      ).not.toBeOnTheScreen();
    });

    it('calls onViewCardDetails when View Card Details is pressed', () => {
      const features = createFeatures();

      const { getByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON));

      expect(mockOnViewCardDetails).toHaveBeenCalledTimes(1);
    });

    it('calls onManageSpendingLimit when Manage Spending Limit is pressed', () => {
      const features = createFeatures();

      const { getByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      fireEvent.press(
        getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
      );

      expect(mockOnManageSpendingLimit).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigateToCardPage when Manage Card is pressed', () => {
      const features = createFeatures();

      const { getByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      fireEvent.press(
        getByTestId(CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM),
      );

      expect(mockOnNavigateToCardPage).toHaveBeenCalledTimes(1);
    });

    it('calls onNavigateToTravelPage when Travel is pressed', () => {
      const features = createFeatures();

      const { getByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.TRAVEL_ITEM));

      expect(mockOnNavigateToTravelPage).toHaveBeenCalledTimes(1);
    });
  });

  describe('unauthenticated state', () => {
    it('hides ToS and Logout when not authenticated', () => {
      const features = createFeatures({ isAuthenticated: false });

      const { queryByTestId, getByTestId } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={null}
          {...defaultProps}
        />
      ));

      // These should still be visible
      expect(
        getByTestId(CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM),
      ).toBeOnTheScreen();
      expect(getByTestId(CardHomeSelectors.TRAVEL_ITEM)).toBeOnTheScreen();

      // ToS and Logout should not be visible for unauthenticated users
      expect(
        queryByTestId(CardHomeSelectors.CARD_TOS_ITEM),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.LOGOUT_ITEM),
      ).not.toBeOnTheScreen();
    });
  });

  describe('spending limit description', () => {
    it('shows full access description when allowanceState is Enabled', () => {
      const features = createFeatures();
      const priorityToken = createPriorityToken({
        allowanceState: AllowanceState.Enabled,
      });

      const { getByText } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={priorityToken}
          {...defaultProps}
        />
      ));

      expect(getByText('Full spending access enabled')).toBeOnTheScreen();
    });

    it('shows limited description when allowanceState is Limited', () => {
      const features = createFeatures();
      const priorityToken = createPriorityToken({
        allowanceState: AllowanceState.Limited,
      });

      const { getByText } = renderWithProvider(() => (
        <CardManageSection
          features={features}
          needsSetup={false}
          isKYCPending={false}
          isCardDetailsImageShowing={false}
          priorityToken={priorityToken}
          {...defaultProps}
        />
      ));

      expect(getByText('Limited spending enabled')).toBeOnTheScreen();
    });
  });
});
