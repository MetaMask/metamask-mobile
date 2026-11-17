import React from 'react';
import { Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import ManageCardOptions from './ManageCardOptions';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType, type CardFundingToken } from '../../../types';
import { strings } from '../../../../../../../locales/i18n';
import { IconName, TextColor } from '@metamask/design-system-react-native';
import {
  CardStatus,
  type CardDetails,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

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
}

const renderComponent = (
  capabilities: CardProviderCapabilities,
  overrides: {
    card?: CardDetails;
    hasSetupActions?: boolean;
    hasSetupAlerts?: boolean;
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
    currentFundingToken?: Partial<CardFundingToken> | null;
    onChangeAsset?: () => void;
    isSpendingLimitActive?: boolean;
    showLimitedSpendingAmounts?: boolean;
    spendingLimitRemaining?: string;
    spendingLimitTotal?: string;
    spendingLimitSymbol?: string;
    privacyMode?: boolean;
  } = {},
) =>
  render(
    <ManageCardOptions
      card={overrides.card === undefined ? CARD : overrides.card}
      account={{ verificationStatus: 'VERIFIED' } as never}
      capabilities={capabilities}
      isMetalCardCheckoutEnabled={false}
      isAuthenticated={overrides.isAuthenticated ?? true}
      isLoading={false}
      hasSetupActions={overrides.hasSetupActions ?? false}
      hasAlertOnlyState={overrides.hasAlertOnlyState ?? false}
      hasSetupAlerts={overrides.hasSetupAlerts ?? false}
      userLocation="gb"
      onSetPin={jest.fn()}
      onManageSpendingLimit={jest.fn()}
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
      isSpendingLimitActive={overrides.isSpendingLimitActive ?? true}
      showLimitedSpendingAmounts={overrides.showLimitedSpendingAmounts}
      spendingLimitRemaining={overrides.spendingLimitRemaining}
      spendingLimitTotal={overrides.spendingLimitTotal}
      spendingLimitSymbol={overrides.spendingLimitSymbol}
      privacyMode={overrides.privacyMode}
      onChangeAsset={overrides.onChangeAsset ?? jest.fn()}
      currentFundingToken={overrides.currentFundingToken as never}
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
    ).toHaveTextContent(/^Unlink card/);
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
        onSetPin={jest.fn()}
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
        onSetPin={jest.fn()}
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
      { card: frozenCard },
    );

    expect(queryByTestId(CardHomeSelectors.SET_PIN_BUTTON)).toBeNull();
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
});

describe('ManageCardOptions change asset row', () => {
  const capabilities = buildCapabilities({ supportsFundingLimits: true });

  it('shows the current funding asset and chain with its token icon', () => {
    const { getByText, getByTestId } = renderComponent(capabilities, {
      currentFundingToken: {
        symbol: 'USDC',
        address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
        caipChainId: 'eip155:59144',
      },
    });

    expect(
      getByText(strings('card.card_home.manage_card_options.paying_with')),
    ).toBeOnTheScreen();
    expect(getByText('USDC on Linea')).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.CHANGE_ASSET_TOKEN_AVATAR),
    ).toBeOnTheScreen();
  });

  it('opens the asset picker from both the row and the Change button', () => {
    const onChangeAsset = jest.fn();
    const { getByTestId, getByText } = renderComponent(capabilities, {
      onChangeAsset,
      currentFundingToken: {
        symbol: 'USDC',
        address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
        caipChainId: 'eip155:59144',
      },
    });

    expect(
      getByText(
        strings('card.card_home.manage_card_options.change_asset_action'),
      ),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(CardHomeSelectors.CHANGE_ASSET_ACTION_BUTTON));
    fireEvent.press(getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON));

    expect(onChangeAsset).toHaveBeenCalledTimes(2);
  });

  it('labels a Money account funding source as the Money account', () => {
    const { getByText, getByTestId } = renderComponent(capabilities, {
      currentFundingToken: {
        symbol: 'mUSD',
        caipChainId: 'eip155:59144',
        isMoneyAccountEntry: true,
      },
    });

    expect(
      getByText(strings('card.card_spending_limit.money_account_label')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.CHANGE_ASSET_TOKEN_AVATAR),
    ).toBeOnTheScreen();
  });

  it('falls back to the generic description when there is no funding asset', () => {
    const { getByText, queryByText, queryByTestId } = renderComponent(
      capabilities,
      {
        currentFundingToken: null,
      },
    );

    expect(
      getByText(
        strings('card.card_home.manage_card_options.change_asset_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(CardHomeSelectors.CHANGE_ASSET_TOKEN_AVATAR),
    ).toBeNull();
    expect(
      getByText(strings('card.card_home.manage_card_options.change_asset')),
    ).toBeOnTheScreen();
    expect(
      queryByText(strings('card.card_home.manage_card_options.paying_with')),
    ).toBeNull();
  });
});

describe('ManageCardOptions row icons', () => {
  it('renders a leading icon for each list row', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true, supportsTravel: true }),
    );

    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM).findByProps({
        name: IconName.Speedometer,
      }),
    ).toBeTruthy();
    expect(
      getByTestId(CardHomeSelectors.TRAVEL_ITEM).findByProps({
        name: IconName.Global,
      }),
    ).toBeTruthy();
  });

  it('shows a trailing chevron on navigation rows but not on Change asset', () => {
    const { getByTestId } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
      {
        currentFundingToken: {
          symbol: 'USDC',
          address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',
          caipChainId: 'eip155:59144',
        },
      },
    );

    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM).findAllByProps({
        name: IconName.ArrowRight,
      }).length,
    ).toBeGreaterThan(0);
    expect(
      getByTestId(CardHomeSelectors.CHANGE_ASSET_BUTTON).findAllByProps({
        name: IconName.ArrowRight,
      }),
    ).toHaveLength(0);
  });
});

describe('ManageCardOptions digital wallet instructions copy', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  const renderInstructions = (): ReturnType<typeof render> =>
    render(
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
        onSetPin={jest.fn()}
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

  it('shows Add to Apple Wallet copy and the Apple logo on iOS', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });

    const { getByTestId, getByText } = renderInstructions();

    expect(
      getByText(
        strings('card.card_home.manage_card_options.add_to_apple_wallet'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('card.card_home.manage_card_options.add_to_wallet_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
      ).findByProps({
        name: IconName.AppleLogo,
      }),
    ).toBeTruthy();
  });

  it('shows Add to Google Wallet copy and the wallet icon on Android', () => {
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });

    const { getByTestId, getByText } = renderInstructions();

    expect(
      getByText(
        strings('card.card_home.manage_card_options.add_to_google_wallet'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings('card.card_home.manage_card_options.add_to_wallet_description'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM,
      ).findByProps({
        name: IconName.Wallet,
      }),
    ).toBeTruthy();
  });
});

describe('ManageCardOptions spending limit description', () => {
  const remainingDescription = (
    remaining: string,
    total = '100',
    symbol = 'USDC',
  ) =>
    strings(
      'card.card_home.manage_card_options.manage_spending_limit_description_remaining',
      { remaining, total, symbol },
    );

  const renderLimited = (
    overrides: {
      spendingLimitRemaining?: string;
      spendingLimitTotal?: string;
      spendingLimitSymbol?: string;
      privacyMode?: boolean;
      showLimitedSpendingAmounts?: boolean;
    } = {},
  ) =>
    renderComponent(buildCapabilities({ supportsFundingLimits: true }), {
      isSpendingLimitActive: false,
      showLimitedSpendingAmounts: true,
      spendingLimitRemaining: '75',
      spendingLimitTotal: '100',
      spendingLimitSymbol: 'USDC',
      ...overrides,
    });

  it('shows Full access is on when spending is unrestricted', () => {
    const { getByTestId, getByText } = renderComponent(
      buildCapabilities({ supportsFundingLimits: true }),
      { isSpendingLimitActive: true },
    );

    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM),
    ).toBeOnTheScreen();
    expect(
      getByText(
        strings(
          'card.card_home.manage_card_options.manage_spending_limit_description_full',
        ),
      ),
    ).toBeOnTheScreen();
  });

  it('uses the neutral sublabel colour when less than 80% is consumed', () => {
    const { getByTestId, getByText } = renderLimited({
      spendingLimitRemaining: '75',
    });

    expect(getByText(remainingDescription('75'))).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM).findByProps({
        color: TextColor.TextAlternative,
      }),
    ).toBeTruthy();
  });

  it('uses the warning colour when 15 of 100 is left', () => {
    const { getByTestId, getByText } = renderLimited({
      spendingLimitRemaining: '15',
    });

    expect(getByText(remainingDescription('15'))).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM).findByProps({
        color: TextColor.WarningDefault,
      }),
    ).toBeTruthy();
  });

  it('uses the error colour when 5 of 100 is left', () => {
    const { getByTestId, getByText } = renderLimited({
      spendingLimitRemaining: '5',
    });

    expect(getByText(remainingDescription('5'))).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM).findByProps({
        color: TextColor.ErrorDefault,
      }),
    ).toBeTruthy();
  });

  it('uses the error colour and remaining string when nothing is left', () => {
    const { getByTestId, getByText } = renderLimited({
      spendingLimitRemaining: '0',
    });

    expect(getByText(remainingDescription('0'))).toBeOnTheScreen();
    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM).findByProps({
        color: TextColor.ErrorDefault,
      }),
    ).toBeTruthy();
  });

  it('keeps the neutral colour when the remaining amount is hidden', () => {
    const { getByTestId, queryByText } = renderLimited({
      spendingLimitRemaining: '5',
      privacyMode: true,
    });

    expect(queryByText(remainingDescription('5'))).toBeNull();
    expect(
      getByTestId(CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM).findByProps({
        isHidden: true,
        color: TextColor.TextAlternative,
      }),
    ).toBeTruthy();
  });

  it('falls back to Limited spending is on when limited amounts are missing', () => {
    const { getByText, queryByText } = renderLimited({
      spendingLimitRemaining: undefined,
      spendingLimitTotal: undefined,
      spendingLimitSymbol: undefined,
    });

    expect(
      getByText(
        strings(
          'card.card_home.manage_card_options.manage_spending_limit_description_restricted',
        ),
      ),
    ).toBeOnTheScreen();
    expect(queryByText(remainingDescription('75'))).toBeNull();
  });
});
