import React from 'react';
import { Image, Platform, StyleSheet, Switch } from 'react-native';
import {
  Box,
  IconName,
  SensitiveText,
  SensitiveTextLength,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ManageCardListItem from '../../../components/ManageCardListItem';
import { formatSpendingLimitDisplayValue } from '../../../util/formatSpendingLimitDisplayValue';
import applePayMark from '../../../components/ApplePayUsageSheet/assets/apple-pay-mark.png';

const APPLE_PAY_MARK_ASPECT_RATIO = 170 / 109;

const styles = StyleSheet.create({
  applePayMark: {
    width: 38,
    height: 38 / APPLE_PAY_MARK_ASPECT_RATIO,
  },
});
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import type { CardHomeActionVisibility } from './CardHomeActionButtonRow';
import { CardType } from '../../../types';
import {
  CardStatus,
  type CardDetails,
  type CardAccountStatus,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

function cashbackRateLabel(
  providerId: string | null | undefined,
  cardType: CardType | undefined,
): string {
  if (providerId === 'immersve' || cardType === CardType.METAL) {
    return '3';
  }
  return '1';
}

function showCashbackRow(
  isFullySetUp: boolean,
  hideManageOptions: boolean,
  providerId: string | null | undefined,
  supportsCashback: boolean | undefined,
  verificationStatus: string | null | undefined,
): boolean {
  if (!isFullySetUp || hideManageOptions) {
    return false;
  }
  if (providerId === 'immersve') {
    return true;
  }
  return supportsCashback === true && verificationStatus === 'VERIFIED';
}

interface ManageCardOptionsProps {
  card: CardDetails | null | undefined;
  account: CardAccountStatus | null | undefined;
  capabilities: CardProviderCapabilities | null;
  isMetalCardCheckoutEnabled: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasSetupActions: boolean;
  hasAlertOnlyState: boolean;
  hasSetupAlerts: boolean;
  userLocation: string | null;
  isFrozen: boolean;
  isFreezeLoading: boolean;
  isPinLoading: boolean;
  cardDetailsVisible: boolean;
  onViewCardDetails: () => void;
  onViewPin: () => void;
  onSetPin: () => void;
  onToggleFreeze: () => void;
  onManageSpendingLimit: () => void;
  onContactDetails: () => void;
  showDigitalWalletInstructions: boolean;
  onDigitalWalletInstructions: () => void;
  showHowToUseApplePay?: boolean;
  onHowToUseApplePay?: () => void;
  showUnlinkMoneyAccount: boolean;
  onUnlinkMoneyAccount: () => void;
  showRevokeAllowance?: boolean;
  onRevokeAllowance?: () => void;
  fundingAccountName?: string;
  onOrderMetalCard: () => void;
  isSpendingLimitActive: boolean;
  /**
   * When true (authenticated, Limited, supported token), the Manage limit
   * row shows the remaining/total amounts when they are present and the
   * total is greater than zero (including none left).
   */
  showLimitedSpendingAmounts?: boolean;
  /** Blocked cards still show the amounts, without a way to change them. */
  spendingLimitReadOnly?: boolean;
  /** Hides the remaining and total amounts, matching the balance privacy mode. */
  privacyMode?: boolean;
  spendingLimitRemaining?: string;
  spendingLimitTotal?: string;
  spendingLimitSymbol?: string;
  onChangeAsset: () => void;
  hasPriorityTokenBalance: boolean;
  /**
   * Quick-action tiles the Card home row is showing. Each matching row is
   * hidden so the same action does not appear twice. Omitted: rows unchanged.
   */
  hiddenQuickActionRows?: CardHomeActionVisibility;
  onCashback: () => void;
  providerId?: string | null;
  onTravel: () => void;
  onTransactionHistory?: () => void;
  showTransactionHistoryDuringSetup?: boolean;
  /**
   * Render only the spending-limit row. Card home uses this on the Activity
   * tab, and for a blocked card, so the amounts stay visible where the old
   * progress bar was.
   */
  spendingLimitOnly?: boolean;
  /**
   * Keeps the history row for a fully set-up card whose history has no
   * Activity panel on Card home (history lives in Money activity).
   */
  showTransactionHistoryRow?: boolean;
}

const ManageCardOptions = ({
  card,
  account,
  capabilities,
  isMetalCardCheckoutEnabled,
  isAuthenticated,
  isLoading,
  hasSetupActions,
  hasAlertOnlyState,
  hasSetupAlerts,
  userLocation,
  isFrozen,
  isFreezeLoading,
  isPinLoading,
  cardDetailsVisible,
  onViewCardDetails,
  onViewPin,
  onSetPin,
  onToggleFreeze,
  onManageSpendingLimit,
  onContactDetails,
  showDigitalWalletInstructions,
  onDigitalWalletInstructions,
  showHowToUseApplePay = false,
  onHowToUseApplePay,
  showUnlinkMoneyAccount,
  onUnlinkMoneyAccount,
  showRevokeAllowance = false,
  onRevokeAllowance,
  fundingAccountName,
  onOrderMetalCard,
  isSpendingLimitActive,
  showLimitedSpendingAmounts = false,
  spendingLimitReadOnly = false,
  privacyMode = false,
  spendingLimitRemaining,
  spendingLimitTotal,
  spendingLimitSymbol,
  onChangeAsset,
  hasPriorityTokenBalance,
  hiddenQuickActionRows,
  onCashback,
  providerId,
  onTravel,
  onTransactionHistory,
  showTransactionHistoryDuringSetup = false,
  spendingLimitOnly = false,
  showTransactionHistoryRow = false,
}: ManageCardOptionsProps) => {
  const tw = useTailwind();

  const isFullySetUp =
    !isLoading &&
    !hasSetupActions &&
    !hasSetupAlerts &&
    isAuthenticated &&
    card;

  const isEligibleForMetalCard =
    isMetalCardCheckoutEnabled &&
    isAuthenticated &&
    userLocation === 'us' &&
    !!account?.shippingAddress &&
    card?.type === CardType.VIRTUAL &&
    isFullySetUp;

  // Providers set hasPin on CardDetails; absent means treat as true.
  const cardHasPin = card?.hasPin !== false;

  // Providers without funding limits (e.g. Immersve) expose manage options as
  // soon as a card exists; balance-gating only applies to funding-limit
  // providers (Baanx), which hide them until the user has a spendable balance.
  const hideManageOptions =
    isAuthenticated &&
    !hasPriorityTokenBalance &&
    (capabilities?.supportsFundingLimits ?? true);

  const spendingLimitRemainingValue = parseFloat(spendingLimitRemaining ?? '');
  const spendingLimitTotalValue = parseFloat(spendingLimitTotal ?? '');
  const hasSpendingLimitAmounts =
    showLimitedSpendingAmounts &&
    Boolean(spendingLimitSymbol) &&
    spendingLimitRemaining != null &&
    spendingLimitRemaining !== '' &&
    Number.isFinite(spendingLimitRemainingValue) &&
    Number.isFinite(spendingLimitTotalValue) &&
    spendingLimitTotalValue > 0;

  const showSpendingLimitDescription = isSpendingLimitActive
    ? 'card.card_home.manage_card_options.manage_spending_limit_description_full'
    : hasSpendingLimitAmounts
      ? 'card.card_home.manage_card_options.manage_spending_limit_description_remaining'
      : 'card.card_home.manage_card_options.manage_spending_limit_description_restricted';

  // Recent activity panel (with its own "See all"). This row only remains for
  // the setup override (Immersve while setup actions are pending) and for
  // Money-history users, where the panel is not shown.
  const showTransactionHistory =
    Boolean(onTransactionHistory) &&
    !isLoading &&
    isAuthenticated &&
    Boolean(card) &&
    !hideManageOptions &&
    ((showTransactionHistoryDuringSetup && !isFullySetUp) ||
      (showTransactionHistoryRow && isFullySetUp));

  // Amounts follow the old progress bar: a limited, supported allowance stays
  // visible at a zero balance. The other manage rows still wait for funds.
  const showSpendingLimitRow =
    isAuthenticated &&
    Boolean(capabilities?.supportsFundingLimits) &&
    !isLoading &&
    (!hideManageOptions || showLimitedSpendingAmounts);

  const spendingLimitRow = showSpendingLimitRow ? (
    <ManageCardListItem
      title={strings(
        'card.card_home.manage_card_options.manage_spending_limit',
      )}
      description={
        hasSpendingLimitAmounts ? (
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Short}
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
          >
            {strings(showSpendingLimitDescription, {
              remaining: formatSpendingLimitDisplayValue(
                spendingLimitRemainingValue,
              ),
              total: formatSpendingLimitDisplayValue(spendingLimitTotalValue),
              symbol: spendingLimitSymbol ?? '',
            })}
          </SensitiveText>
        ) : (
          strings(showSpendingLimitDescription)
        )
      }
      rightIcon={spendingLimitReadOnly ? undefined : IconName.ArrowRight}
      onPress={spendingLimitReadOnly ? undefined : onManageSpendingLimit}
      testID={CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM}
    />
  ) : null;

  if (spendingLimitOnly) {
    return spendingLimitRow;
  }

  return (
    <>
      <Box style={tw.style((hasSetupActions || hasAlertOnlyState) && 'hidden')}>
        {isFullySetUp && showHowToUseApplePay && Platform.OS === 'ios' && (
          <ManageCardListItem
            title={strings('card.apple_pay_usage.row_title')}
            startAccessory={
              <Image
                source={applePayMark}
                resizeMode="contain"
                accessible={false}
                style={styles.applePayMark}
              />
            }
            rightIcon={IconName.ArrowRight}
            onPress={onHowToUseApplePay}
            testID={CardHomeSelectors.APPLE_PAY_USAGE_ITEM}
          />
        )}
        {isEligibleForMetalCard && !hideManageOptions && (
          <ManageCardListItem
            title={strings(
              'card.card_home.manage_card_options.order_metal_card',
            )}
            description={strings(
              'card.card_home.manage_card_options.order_metal_card_description',
            )}
            rightIcon={IconName.ArrowRight}
            onPress={onOrderMetalCard}
            testID={CardHomeSelectors.ORDER_METAL_CARD_ITEM}
          />
        )}
        {capabilities?.supportsFundingLimits &&
          !showUnlinkMoneyAccount &&
          isAuthenticated &&
          !isLoading &&
          card && (
            <ManageCardListItem
              title={strings('card.card_home.manage_card_options.change_asset')}
              description={strings(
                'card.card_home.manage_card_options.change_asset_description',
              )}
              onPress={onChangeAsset}
              testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
            />
          )}
        {showCashbackRow(
          Boolean(isFullySetUp),
          hideManageOptions,
          providerId,
          capabilities?.supportsCashback,
          account?.verificationStatus,
        ) && (
          <ManageCardListItem
            title={strings('card.card_home.manage_card_options.cashback', {
              cashbackPercentage: cashbackRateLabel(providerId, card?.type),
            })}
            description={strings(
              'card.card_home.manage_card_options.cashback_description',
            )}
            rightIcon={IconName.ArrowRight}
            onPress={onCashback}
            testID={CardHomeSelectors.CASHBACK_ITEM}
          />
        )}
        {!hiddenQuickActionRows?.details &&
          isAuthenticated &&
          !isLoading &&
          card &&
          !hideManageOptions && (
            <ManageCardListItem
              title={strings(
                cardDetailsVisible
                  ? 'card.card_home.manage_card_options.hide_card_details'
                  : 'card.card_home.manage_card_options.view_card_details',
              )}
              description={strings(
                'card.card_home.manage_card_options.view_card_details_description',
              )}
              onPress={onViewCardDetails}
              testID={CardHomeSelectors.VIEW_CARD_DETAILS_BUTTON}
            />
          )}
        {isFullySetUp &&
          !hideManageOptions &&
          showDigitalWalletInstructions && (
            <ManageCardListItem
              title={strings(
                'card.card_home.manage_card_options.add_to_digital_wallet',
              )}
              description={strings(
                'card.card_home.manage_card_options.add_to_digital_wallet_description',
              )}
              rightIcon={IconName.ArrowRight}
              onPress={onDigitalWalletInstructions}
              testID={CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM}
            />
          )}
        {!hiddenQuickActionRows?.pin &&
          isAuthenticated &&
          !isLoading &&
          card &&
          capabilities?.supportsPinView &&
          cardHasPin &&
          !hideManageOptions && (
            <ManageCardListItem
              title={strings('card.card_home.manage_card_options.view_pin')}
              description={strings(
                'card.card_home.manage_card_options.view_pin_description',
              )}
              onPress={onViewPin}
              isLoading={isPinLoading}
              testID={CardHomeSelectors.VIEW_PIN_BUTTON}
            />
          )}
        {isAuthenticated &&
          !isLoading &&
          card &&
          card.status === CardStatus.ACTIVE &&
          capabilities?.supportsPinSet &&
          cardHasPin &&
          !hideManageOptions && (
            <ManageCardListItem
              title={strings('card.card_home.manage_card_options.set_pin')}
              description={strings(
                'card.card_home.manage_card_options.set_pin_description',
              )}
              onPress={onSetPin}
              testID={CardHomeSelectors.SET_PIN_BUTTON}
            />
          )}
        {!hiddenQuickActionRows?.freeze &&
          isAuthenticated &&
          !isLoading &&
          card?.isFreezable &&
          card?.status !== CardStatus.BLOCKED &&
          !hideManageOptions && (
            <ManageCardListItem
              title={strings(
                isFrozen
                  ? 'card.card_home.manage_card_options.unfreeze_card'
                  : 'card.card_home.manage_card_options.freeze_card',
              )}
              description={strings(
                isFrozen
                  ? 'card.card_home.manage_card_options.unfreeze_card_description'
                  : 'card.card_home.manage_card_options.freeze_card_description',
              )}
              rightElement={
                <Switch
                  value={isFrozen}
                  onValueChange={isFreezeLoading ? undefined : onToggleFreeze}
                  disabled={isFreezeLoading}
                  style={tw.style(Platform.OS === 'ios' ? 'mr-2' : '')}
                  testID={CardHomeSelectors.FREEZE_CARD_TOGGLE}
                />
              }
              testID="freeze-card-list-item"
            />
          )}
        {spendingLimitRow}
        {isFullySetUp &&
          capabilities?.supportsContactDetails &&
          !hideManageOptions && (
            <ManageCardListItem
              title={strings(
                'card.card_home.manage_card_options.contact_details',
              )}
              description={strings(
                'card.card_home.manage_card_options.contact_details_description',
              )}
              rightIcon={IconName.ArrowRight}
              onPress={onContactDetails}
              testID={CardHomeSelectors.CONTACT_DETAILS_ITEM}
            />
          )}
        {isFullySetUp && showUnlinkMoneyAccount && (
          <ManageCardListItem
            title={strings(
              'card.card_home.manage_card_options.unlink_money_account',
            )}
            description={strings(
              'card.card_home.manage_card_options.unlink_money_account_description',
            )}
            rightIcon={IconName.ArrowRight}
            onPress={onUnlinkMoneyAccount}
            testID={CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM}
          />
        )}
        {isFullySetUp && showRevokeAllowance && onRevokeAllowance && (
          <ManageCardListItem
            title={strings(
              'card.card_home.manage_card_options.unlink_funding_account',
            )}
            description={strings(
              'card.card_home.manage_card_options.unlink_funding_account_description',
              { accountName: fundingAccountName },
            )}
            rightIcon={IconName.ArrowRight}
            onPress={onRevokeAllowance}
            testID={CardHomeSelectors.REVOKE_ALLOWANCE_ITEM}
          />
        )}
      </Box>
      {showTransactionHistory ? (
        <ManageCardListItem
          title={strings('card.transactions.manage_entry_title')}
          description={strings('card.transactions.manage_entry_description')}
          rightIcon={IconName.ArrowRight}
          onPress={onTransactionHistory}
          testID={CardHomeSelectors.TRANSACTION_HISTORY_ITEM}
        />
      ) : null}
      {capabilities?.supportsTravel && isFullySetUp && !hideManageOptions && (
        <ManageCardListItem
          title={strings('card.card_home.manage_card_options.travel_title')}
          description={strings(
            'card.card_home.manage_card_options.travel_description',
          )}
          rightIcon={IconName.ArrowSquareOut}
          onPress={onTravel}
          testID={CardHomeSelectors.TRAVEL_ITEM}
        />
      )}
    </>
  );
};

export default ManageCardOptions;
