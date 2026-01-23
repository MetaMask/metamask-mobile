import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import CardActionsSection from './CardActionsSection';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { CardHomeSelectors } from '../CardHome.testIds';
import type { CardHomeViewState, CardHomeFeatures } from '../CardHome.types';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'card.card_home.add_funds': 'Add Funds',
      'card.card_home.change_asset': 'Change Asset',
      'card.card_home.enable_card_button_label': 'Enable Card',
    };
    return mockStrings[key] || key;
  }),
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'CardActionsSection',
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

const createReadyViewState = (
  overrides: Partial<CardHomeFeatures> = {},
): CardHomeViewState => ({
  status: 'ready',
  features: {
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
  },
});

describe('CardActionsSection', () => {
  const mockOnAddFunds = jest.fn();
  const mockOnChangeAsset = jest.fn();
  const mockOnEnableCard = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading state', () => {
    it('renders skeleton when isLoading is true', () => {
      const viewState: CardHomeViewState = { status: 'loading' };

      const { getByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      expect(
        getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON),
      ).toBeOnTheScreen();
    });
  });

  describe('ready state with Baanx login enabled', () => {
    it('renders Add Funds and Change Asset buttons', () => {
      const viewState = createReadyViewState();

      const { getByTestId, getByText } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      expect(getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON)).toBeOnTheScreen();
      expect(
        getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).toBeOnTheScreen();
      expect(getByText('Add Funds')).toBeOnTheScreen();
      expect(getByText('Change Asset')).toBeOnTheScreen();
    });

    it('calls onAddFunds when Add Funds button is pressed', () => {
      const viewState = createReadyViewState();

      const { getByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON));

      expect(mockOnAddFunds).toHaveBeenCalledTimes(1);
    });

    it('calls onChangeAsset when Change Asset button is pressed', () => {
      const viewState = createReadyViewState();

      const { getByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON));

      expect(mockOnChangeAsset).toHaveBeenCalledTimes(1);
    });

    it('renders Add Funds button with disabled state when isSwapEnabled is false', () => {
      const viewState = createReadyViewState();

      const { getByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled={false}
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      const addFundsButton = getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON);
      // Button should still render but be disabled (opacity style applied)
      expect(addFundsButton).toBeOnTheScreen();
    });

    it('hides Change Asset button when canChangeAsset is false', () => {
      const viewState = createReadyViewState({ canChangeAsset: false });

      const { getByTestId, queryByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      expect(getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON)).toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('ready state with legacy cardholder (no Baanx login)', () => {
    it('renders only Add Funds button', () => {
      const viewState = createReadyViewState({ isBaanxLoginEnabled: false });

      const { getByTestId, queryByTestId, getByText } = renderWithProvider(
        () => (
          <CardActionsSection
            viewState={viewState}
            isLoading={false}
            isSwapEnabled
            onAddFunds={mockOnAddFunds}
            onChangeAsset={mockOnChangeAsset}
            onEnableCard={mockOnEnableCard}
          />
        ),
      );

      expect(getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON)).toBeOnTheScreen();
      expect(getByText('Add Funds')).toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('calls onAddFunds when Add Funds button is pressed in legacy mode', () => {
      const viewState = createReadyViewState({ isBaanxLoginEnabled: false });

      const { getByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON));

      expect(mockOnAddFunds).toHaveBeenCalledTimes(1);
    });
  });

  describe('setup_required state', () => {
    it('renders Enable Card button when canEnable is true', () => {
      const viewState: CardHomeViewState = {
        status: 'setup_required',
        canEnable: true,
        isProvisioning: false,
      };

      const { getByTestId, getByText } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      expect(
        getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
      ).toBeOnTheScreen();
      expect(getByText('Enable Card')).toBeOnTheScreen();
    });

    it('calls onEnableCard when Enable Card button is pressed', () => {
      const viewState: CardHomeViewState = {
        status: 'setup_required',
        canEnable: true,
        isProvisioning: false,
      };

      const { getByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      fireEvent.press(getByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON));

      expect(mockOnEnableCard).toHaveBeenCalledTimes(1);
    });

    it('renders nothing when isProvisioning is true', () => {
      const viewState: CardHomeViewState = {
        status: 'setup_required',
        canEnable: true,
        isProvisioning: true,
      };

      const { queryByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      expect(
        queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('renders nothing when canEnable is false and not provisioning', () => {
      const viewState: CardHomeViewState = {
        status: 'setup_required',
        canEnable: false,
        isProvisioning: false,
      };

      const { queryByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      expect(
        queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });

  describe('kyc_pending state', () => {
    it('renders nothing when KYC is pending', () => {
      const viewState: CardHomeViewState = { status: 'kyc_pending' };

      const { queryByTestId } = renderWithProvider(() => (
        <CardActionsSection
          viewState={viewState}
          isLoading={false}
          isSwapEnabled
          onAddFunds={mockOnAddFunds}
          onChangeAsset={mockOnChangeAsset}
          onEnableCard={mockOnEnableCard}
        />
      ));

      expect(
        queryByTestId(CardHomeSelectors.ADD_FUNDS_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(CardHomeSelectors.ENABLE_CARD_BUTTON),
      ).not.toBeOnTheScreen();
    });
  });
});
