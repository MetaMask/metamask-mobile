import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ManageCardOptions from './ManageCardOptions';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType } from '../../../types';
import {
  CardStatus,
  type CardDetails,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('../../../components/ManageCardListItem', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return (props: { testID?: string; title?: string; onPress?: () => void }) => (
    <Pressable testID={props.testID} onPress={props.onPress}>
      <Text>{props.title}</Text>
    </Pressable>
  );
});

const CARD: CardDetails = {
  id: 'card-1',
  status: CardStatus.ACTIVE,
  type: CardType.VIRTUAL,
  lastFour: '1234',
  isFreezable: true,
};

const buildCapabilities = (
  overrides: Partial<CardProviderCapabilities>,
): CardProviderCapabilities =>
  ({
    supportsFundingLimits: true,
    supportsPinView: false,
    supportsPinSet: false,
    supportsCashback: false,
    supportsSensitiveDetailsView: false,
    supportsTravel: true,
    supportsContactDetails: false,
    ...overrides,
  }) as CardProviderCapabilities;

interface RenderOverrides {
  card?: CardDetails | null;
  isFrozen?: boolean;
  hasSetupActions?: boolean;
  hasAlertOnlyState?: boolean;
  hasSetupAlerts?: boolean;
  showUnlinkMoneyAccount?: boolean;
  showRevokeAllowance?: boolean;
  onRevokeAllowance?: () => void;
  fundingAccountName?: string;
  onTransactionHistory?: () => void;
  showTransactionHistoryDuringSetup?: boolean;
  hasPriorityTokenBalance?: boolean;
  cardDetailsVisible?: boolean;
}

const renderComponent = (
  capabilities: CardProviderCapabilities,
  overrides: {
    card?: CardDetails;
    isFrozen?: boolean;
    hasSetupActions?: boolean;
    hasSetupAlerts?: boolean;
    cardDetailsVisible?: boolean;
    showUnlinkMoneyAccount?: boolean;
    showRevokeAllowance?: boolean;
    onRevokeAllowance?: () => void;
    fundingAccountName?: string;
    onTransactionHistory?: () => void;
    showTransactionHistoryDuringSetup?: boolean;
    hasPriorityTokenBalance?: boolean;
    hasAlertOnlyState?: boolean;
  } = {},
) =>
  render(
    <ManageCardOptions
      card={overrides.card === undefined ? CARD : overrides.card}
      account={{ verificationStatus: 'VERIFIED' } as never}
      capabilities={capabilities}
      isMetalCardCheckoutEnabled={false}
      isAuthenticated
      isLoading={false}
      hasSetupActions={overrides.hasSetupActions ?? false}
      hasAlertOnlyState={overrides.hasAlertOnlyState ?? false}
      hasSetupAlerts={overrides.hasSetupAlerts ?? false}
      userLocation="gb"
      isFrozen={overrides.isFrozen ?? false}
      isFreezeLoading={false}
      isPinLoading={false}
      cardDetailsVisible={overrides.cardDetailsVisible ?? false}
      onViewCardDetails={jest.fn()}
      onViewPin={jest.fn()}
      onSetPin={jest.fn()}
      onToggleFreeze={jest.fn()}
      onManageSpendingLimit={jest.fn()}
      onContactDetails={jest.fn()}
      showDigitalWalletInstructions={false}
      onDigitalWalletInstructions={jest.fn()}
      showUnlinkMoneyAccount={overrides.showUnlinkMoneyAccount ?? false}
      onUnlinkMoneyAccount={jest.fn()}
      showRevokeAllowance={overrides.showRevokeAllowance ?? false}
      onRevokeAllowance={overrides.onRevokeAllowance}
      fundingAccountName={overrides.fundingAccountName}
      onOrderMetalCard={jest.fn()}
      isSpendingLimitActive
      onChangeAsset={jest.fn()}
      hasPriorityTokenBalance={overrides.hasPriorityTokenBalance ?? true}
      onCashback={jest.fn()}
      onTravel={jest.fn()}
      onTransactionHistory={overrides.onTransactionHistory}
      showTransactionHistoryDuringSetup={
        overrides.showTransactionHistoryDuringSetup
      }
    />,
  );

describe('ManageCardOptions contact details gating', () => {
  it('shows contact details when supported and the card is fully set up', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({
        supportsFundingLimits: false,
        supportsContactDetails: true,
      }),
    );

    expect(
      getByTestId(CardHomeSelectors.CONTACT_DETAILS_ITEM),
    ).toBeOnTheScreen();
  });

  it('hides contact details when the provider does not support them', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
    );

    expect(queryByTestId(CardHomeSelectors.CONTACT_DETAILS_ITEM)).toBeNull();
  });

  it.each([
    { hasSetupActions: true, hasSetupAlerts: false },
    { hasSetupActions: false, hasSetupAlerts: true },
  ])('hides contact details while card setup is incomplete', (setupState) => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({
        supportsFundingLimits: false,
        supportsContactDetails: true,
      }),
      {
        hasSetupActions: setupState.hasSetupActions,
        hasSetupAlerts: setupState.hasSetupAlerts,
      },
    );

    expect(queryByTestId(CardHomeSelectors.CONTACT_DETAILS_ITEM)).toBeNull();
  });
});

describe('ManageCardOptions funding-limit gating', () => {
  it('shows change asset and manage spending limit when supportsFundingLimits is true', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
    );

    expect(
      getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
    ).toBeOnTheScreen();
  });

  it('hides change asset and manage spending limit when supportsFundingLimits is false', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
    );

    expect(queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON)).toBeNull();
    expect(
      queryByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
    ).toBeNull();
  });

  it('hides change asset when the Money Account unlink action is available', () => {
    const { queryByTestId, getByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
      { showUnlinkMoneyAccount: true },
    );

    expect(queryByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON)).toBeNull();
    expect(
      getByTestId(CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
    ).toBeOnTheScreen();
  });

  it('shows revoke allowance when showRevokeAllowance is true', () => {
    const onRevokeAllowance = jest.fn();
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
      {
        showRevokeAllowance: true,
        onRevokeAllowance,
        fundingAccountName: 'Account 1',
      },
    );

    expect(
      getByTestId(CardHomeSelectors.REVOKE_ALLOWANCE_ITEM),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.REVOKE_ALLOWANCE_ITEM),
    ).toHaveTextContent('Unlink card');
  });

  it('hides revoke allowance when showRevokeAllowance is false', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
    );

    expect(queryByTestId(CardHomeSelectors.REVOKE_ALLOWANCE_ITEM)).toBeNull();
  });
});

describe('ManageCardOptions travel gating', () => {
  it('shows the travel option when supportsTravel is true', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsTravel: true }),
    );

    expect(getByTestId(CardHomeSelectors.TRAVEL_ITEM)).toBeOnTheScreen();
  });

  it('hides the travel option when supportsTravel is false', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsTravel: false }),
    );

    expect(queryByTestId(CardHomeSelectors.TRAVEL_ITEM)).toBeNull();
  });
});

describe('ManageCardOptions digital wallet instructions gating', () => {
  it('shows digital wallet instructions for a fully set up card when enabled', () => {
    const { getByTestId } = render(
      <ManageCardOptions
        card={CARD}
        account={{ verificationStatus: 'VERIFIED' } as never}
        capabilities={buildCapabilities({ supportsFundingLimits: false })}
        isMetalCardCheckoutEnabled={false}
        isAuthenticated
        isLoading={false}
        hasSetupActions={false}
        hasAlertOnlyState={false}
        hasSetupAlerts={false}
        userLocation="international"
        isFrozen={false}
        isFreezeLoading={false}
        isPinLoading={false}
        cardDetailsVisible={false}
        onViewCardDetails={jest.fn()}
        onViewPin={jest.fn()}
        onSetPin={jest.fn()}
        onToggleFreeze={jest.fn()}
        onManageSpendingLimit={jest.fn()}
        showDigitalWalletInstructions
        onDigitalWalletInstructions={jest.fn()}
        onContactDetails={jest.fn()}
        showUnlinkMoneyAccount={false}
        onUnlinkMoneyAccount={jest.fn()}
        onOrderMetalCard={jest.fn()}
        isSpendingLimitActive
        onChangeAsset={jest.fn()}
        hasPriorityTokenBalance={false}
        onCashback={jest.fn()}
        onTravel={jest.fn()}
      />,
    );

    expect(
      getByTestId(CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM),
    ).toBeOnTheScreen();
  });

  it('hides digital wallet instructions when the Card Home gate is disabled', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
    );

    expect(
      queryByTestId(CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM),
    ).not.toBeOnTheScreen();
  });
});

describe('ManageCardOptions view/hide card details label', () => {
  it('shows "View card details" when details are not visible', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsSensitiveDetailsView: true }),
      { cardDetailsVisible: false },
    );

    expect(
      getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
    ).toHaveTextContent('View card details');
  });

  it('shows "Hide card details" when details are visible', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsSensitiveDetailsView: true }),
      { cardDetailsVisible: true },
    );

    expect(
      getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
    ).toHaveTextContent('Hide card details');
  });
});

describe('ManageCardOptions set PIN gating', () => {
  it('shows set PIN when supportsPinSet is true and card is ACTIVE', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsPinSet: true }),
    );

    expect(getByTestId(CardHomeSelectors.SET_PIN_BUTTON)).toBeOnTheScreen();
  });

  it('shows set PIN when hasPin is true', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsPinSet: true }),
      { card: { ...CARD, hasPin: true } },
    );

    expect(getByTestId(CardHomeSelectors.SET_PIN_BUTTON)).toBeOnTheScreen();
  });

  it('hides set PIN when hasPin is false', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsPinSet: true }),
      { card: { ...CARD, hasPin: false } },
    );

    expect(queryByTestId(CardHomeSelectors.SET_PIN_BUTTON)).toBeNull();
  });

  it('hides set PIN when supportsPinSet is false', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsPinSet: false }),
    );

    expect(queryByTestId(CardHomeSelectors.SET_PIN_BUTTON)).toBeNull();
  });

  it('hides set PIN when the card is not ACTIVE', () => {
    const frozenCard = { ...CARD, status: CardStatus.FROZEN };
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsPinSet: true }),
      { card: frozenCard, isFrozen: true },
    );

    expect(queryByTestId(CardHomeSelectors.SET_PIN_BUTTON)).toBeNull();
  });
});

describe('ManageCardOptions view PIN gating', () => {
  it('hides view PIN when hasPin is false', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsPinView: true }),
      { card: { ...CARD, hasPin: false } },
    );

    expect(queryByTestId(CardHomeSelectors.VIEW_PIN_BUTTON)).toBeNull();
  });

  it('shows view PIN when hasPin is true', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsPinView: true }),
      { card: { ...CARD, hasPin: true } },
    );

    expect(getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON)).toBeOnTheScreen();
  });

  it('shows view PIN when hasPin is absent', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsPinView: true }),
    );

    expect(getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON)).toBeOnTheScreen();
  });
});

describe('ManageCardOptions transaction history gating', () => {
  it('shows transaction history when fully set up and a destination is available', () => {
    const onTransactionHistory = jest.fn();

    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
      { onTransactionHistory },
    );

    expect(
      getByTestId(CardHomeSelectors.TRANSACTION_HISTORY_ITEM),
    ).toBeOnTheScreen();
  });

  it('hides transaction history during setup without the Immersve override', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
      {
        hasSetupActions: true,
        onTransactionHistory: jest.fn(),
      },
    );

    expect(
      queryByTestId(CardHomeSelectors.TRANSACTION_HISTORY_ITEM),
    ).toBeNull();
  });

  it('shows transaction history during setup when the Immersve override is enabled', () => {
    const onTransactionHistory = jest.fn();

    const { getByTestId, queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false, supportsTravel: true }),
      {
        hasSetupActions: true,
        showTransactionHistoryDuringSetup: true,
        onTransactionHistory,
      },
    );

    expect(
      getByTestId(CardHomeSelectors.TRANSACTION_HISTORY_ITEM),
    ).toBeOnTheScreen();
    // Travel stays gated behind full setup; only history escapes enable_card.
    expect(queryByTestId(CardHomeSelectors.TRAVEL_ITEM)).toBeNull();
  });

  it('invokes onTransactionHistory when the setup override entry is pressed', () => {
    const onTransactionHistory = jest.fn();

    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
      {
        hasSetupActions: true,
        showTransactionHistoryDuringSetup: true,
        onTransactionHistory,
      },
    );

    fireEvent.press(getByTestId(CardHomeSelectors.TRANSACTION_HISTORY_ITEM));

    expect(onTransactionHistory).toHaveBeenCalledTimes(1);
  });

  it('hides transaction history when no destination callback is provided', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
      { showTransactionHistoryDuringSetup: true, hasSetupActions: true },
    );

    expect(
      queryByTestId(CardHomeSelectors.TRANSACTION_HISTORY_ITEM),
    ).toBeNull();
  });
});
