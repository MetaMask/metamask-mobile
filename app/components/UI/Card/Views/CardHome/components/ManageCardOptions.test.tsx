import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import ManageCardOptions from './ManageCardOptions';
import type { CardHomeActionVisibility } from './CardHomeActionButtonRow';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType } from '../../../types';
import {
  CardStatus,
  type CardDetails,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('../../../components/ManageCardListItem', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return (props: {
    testID?: string;
    title?: string;
    description?: React.ReactNode;
    onPress?: () => void;
  }) => (
    <>
      <Pressable testID={props.testID} onPress={props.onPress}>
        <Text>{props.title}</Text>
      </Pressable>
      {props.description}
    </>
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
    isAuthenticated?: boolean;
    showHowToUseApplePay?: boolean;
    providerId?: string;
    account?: { verificationStatus: string | null };
    hiddenQuickActionRows?: CardHomeActionVisibility;
    spendingLimitReadOnly?: boolean;
    spendingLimitOnly?: boolean;
    privacyMode?: boolean;
    isSpendingLimitActive?: boolean;
    showLimitedSpendingAmounts?: boolean;
    spendingLimitRemaining?: string;
    spendingLimitTotal?: string;
    spendingLimitSymbol?: string;
    onManageSpendingLimit?: () => void;
  } = {},
) =>
  render(
    <ManageCardOptions
      card={overrides.card === undefined ? CARD : overrides.card}
      account={
        (overrides.account ?? { verificationStatus: 'VERIFIED' }) as never
      }
      capabilities={capabilities}
      isMetalCardCheckoutEnabled={false}
      isAuthenticated={overrides.isAuthenticated ?? true}
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
      onManageSpendingLimit={overrides.onManageSpendingLimit ?? jest.fn()}
      spendingLimitReadOnly={overrides.spendingLimitReadOnly}
      spendingLimitOnly={overrides.spendingLimitOnly}
      privacyMode={overrides.privacyMode}
      isSpendingLimitActive={overrides.isSpendingLimitActive ?? true}
      showLimitedSpendingAmounts={overrides.showLimitedSpendingAmounts}
      spendingLimitRemaining={overrides.spendingLimitRemaining}
      spendingLimitTotal={overrides.spendingLimitTotal}
      spendingLimitSymbol={overrides.spendingLimitSymbol}
      onContactDetails={jest.fn()}
      showDigitalWalletInstructions={false}
      onDigitalWalletInstructions={jest.fn()}
      showHowToUseApplePay={overrides.showHowToUseApplePay}
      showUnlinkMoneyAccount={overrides.showUnlinkMoneyAccount ?? false}
      onUnlinkMoneyAccount={jest.fn()}
      showRevokeAllowance={overrides.showRevokeAllowance ?? false}
      onRevokeAllowance={overrides.onRevokeAllowance}
      fundingAccountName={overrides.fundingAccountName}
      onOrderMetalCard={jest.fn()}
      onChangeAsset={jest.fn()}
      hasPriorityTokenBalance={overrides.hasPriorityTokenBalance ?? true}
      hiddenQuickActionRows={overrides.hiddenQuickActionRows}
      onCashback={jest.fn()}
      providerId={overrides.providerId}
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
  it('shows a blocked card spending limit without opening the limit screen', () => {
    const onManageSpendingLimit = jest.fn();
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
      {
        spendingLimitReadOnly: true,
        spendingLimitOnly: true,
        onManageSpendingLimit,
      },
    );

    fireEvent.press(getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM));
    expect(onManageSpendingLimit).not.toHaveBeenCalled();
  });

  it('hides spending limit amounts in privacy mode', () => {
    const amountProps = {
      isSpendingLimitActive: false,
      showLimitedSpendingAmounts: true,
      spendingLimitRemaining: '40',
      spendingLimitTotal: '100',
      spendingLimitSymbol: 'USDC',
      spendingLimitOnly: true,
    };
    const amounts = strings(
      'card.card_home.manage_card_options.manage_spending_limit_description_remaining',
      { remaining: '40', total: '100', symbol: 'USDC' },
    );

    const shown = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
      amountProps,
    );
    expect(shown.getByText(amounts)).toBeOnTheScreen();

    const hidden = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
      { ...amountProps, privacyMode: true },
    );
    expect(hidden.queryByText(amounts)).toBeNull();
    expect(hidden.getByText('••••••')).toBeOnTheScreen();
  });

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

  it('shows How to use Apple Pay first when the card is on every device', () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
    const onHowToUseApplePay = jest.fn();
    const { getByTestId, toJSON } = render(
      <ManageCardOptions
        card={CARD}
        account={{ verificationStatus: 'VERIFIED' } as never}
        capabilities={buildCapabilities({ supportsFundingLimits: true })}
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
        showDigitalWalletInstructions={false}
        onDigitalWalletInstructions={jest.fn()}
        showHowToUseApplePay
        onHowToUseApplePay={onHowToUseApplePay}
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

    const rendered = JSON.stringify(toJSON());
    expect(
      rendered.indexOf(CardHomeSelectors.APPLE_PAY_USAGE_ITEM),
    ).toBeLessThan(rendered.indexOf(CardHomeSelectors.CHANGE_ASSET_BUTTON));
    fireEvent.press(getByTestId(CardHomeSelectors.APPLE_PAY_USAGE_ITEM));
    expect(onHowToUseApplePay).toHaveBeenCalledTimes(1);
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  it('hides how to use Apple Wallet when the card is not in the wallet', () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
      { showHowToUseApplePay: false },
    );

    expect(queryByTestId(CardHomeSelectors.APPLE_PAY_USAGE_ITEM)).toBeNull();
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  it('hides how to use Apple Wallet on Android', () => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
      { showHowToUseApplePay: true },
    );

    expect(queryByTestId(CardHomeSelectors.APPLE_PAY_USAGE_ITEM)).toBeNull();
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  it.each([
    ['setup is still in progress', { hasSetupActions: true }],
    ['the user is unauthenticated', { isAuthenticated: false }],
  ])('hides how to use Apple Wallet when %s', (_label, overrides) => {
    const originalPlatform = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
      { showHowToUseApplePay: true, ...overrides },
    );

    expect(queryByTestId(CardHomeSelectors.APPLE_PAY_USAGE_ITEM)).toBeNull();
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
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

describe('ManageCardOptions quick-action row seam', () => {
  it('hides the View details, View PIN and Freeze rows when the quick-action row covers them', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsPinView: true }),
      { hiddenQuickActionRows: { details: true, pin: true, freeze: true } },
    );

    expect(
      queryByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
    ).toBeNull();
    expect(queryByTestId(CardHomeSelectors.VIEW_PIN_BUTTON)).toBeNull();
    // The freeze row mock drops the toggle's rightElement, so assert the row.
    expect(queryByTestId('freeze-card-list-item')).toBeNull();
  });

  it('hides only the rows whose tile is showing', () => {
    const { getByTestId, queryByTestId } = renderComponent(
      buildCapabilities({ supportsPinView: true }),
      { hiddenQuickActionRows: { details: true, pin: true, freeze: false } },
    );

    expect(
      queryByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
    ).toBeNull();
    expect(queryByTestId(CardHomeSelectors.VIEW_PIN_BUTTON)).toBeNull();
    expect(getByTestId('freeze-card-list-item')).toBeOnTheScreen();
  });

  it('keeps the rows when the quick-action row is not showing them', () => {
    const { getByTestId, queryByTestId } = renderComponent(
      buildCapabilities({ supportsPinView: true }),
      { hiddenQuickActionRows: { details: false, pin: false, freeze: false } },
    );

    expect(
      getByTestId(CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON),
    ).toBeOnTheScreen();
    expect(getByTestId(CardHomeSelectors.VIEW_PIN_BUTTON)).toBeOnTheScreen();
    // The toggle testID is not exposed by the row mock; assert the row.
    expect(queryByTestId('freeze-card-list-item')).toBeOnTheScreen();
  });
});

describe('ManageCardOptions transaction history gating', () => {
  it('hides transaction history when fully set up because history lives in the Activity segment', () => {
    const onTransactionHistory = jest.fn();

    const { queryByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: false }),
      { onTransactionHistory },
    );

    expect(
      queryByTestId(CardHomeSelectors.TRANSACTION_HISTORY_ITEM),
    ).toBeNull();
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

  it('shows mUSD Back for Immersve without a Baanx verified status', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({
        supportsCashback: false,
        supportsFundingLimits: false,
      }),
      {
        providerId: 'immersve',
        account: { verificationStatus: null },
      },
    );

    expect(getByTestId(CardHomeSelectors.CASHBACK_ITEM)).toBeOnTheScreen();
  });

  it('shows 3% mUSD Back for Immersve', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({
        supportsCashback: false,
        supportsFundingLimits: false,
      }),
      { providerId: 'immersve', account: { verificationStatus: null } },
    );

    expect(getByTestId(CardHomeSelectors.CASHBACK_ITEM)).toHaveTextContent(
      strings('card.card_home.manage_card_options.cashback', {
        cashbackPercentage: '3',
      }),
    );
  });

  it.each([
    ['virtual', CardType.VIRTUAL],
    ['metal', CardType.METAL],
  ])(
    'hides the mUSD Back row for a verified Baanx %s card (the Card home panel replaces it)',
    (_label, type) => {
      const { queryByTestId } = renderComponent(
        buildCapabilities({
          supportsCashback: true,
          supportsFundingLimits: false,
        }),
        {
          providerId: 'baanx',
          card: { ...CARD, type },
          account: { verificationStatus: 'VERIFIED' },
        },
      );

      expect(queryByTestId(CardHomeSelectors.CASHBACK_ITEM)).toBeNull();
    },
  );

  it('hides cashback for an unverified Baanx account', () => {
    const { queryByTestId } = renderComponent(
      buildCapabilities({
        supportsCashback: true,
        supportsFundingLimits: false,
      }),
      { providerId: 'baanx', account: { verificationStatus: null } },
    );

    expect(queryByTestId(CardHomeSelectors.CASHBACK_ITEM)).toBeNull();
  });
});

describe('ManageCardOptions cashback prototypes', () => {
  it('shows no auto payout row (it lives in the More sheet)', () => {
    const { queryByTestId } = renderComponent(buildCapabilities({}));

    expect(
      queryByTestId(CardHomeSelectors.CASHBACK_AUTO_PAYOUT_ITEM),
    ).toBeNull();
  });
});
