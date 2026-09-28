import React from 'react';
import { Platform, Switch } from 'react-native';
import { Box, IconName } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ManageCardListItem from '../../../components/ManageCardListItem';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType } from '../../../types';
import {
  CardStatus,
  type CardDetails,
  type CardAccountStatus,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

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
  showUnlinkMoneyAccount: boolean;
  onUnlinkMoneyAccount: () => void;
  showRevokeAllowance?: boolean;
  onRevokeAllowance?: () => void;
  fundingAccountName?: string;
  onOrderMetalCard: () => void;
  isSpendingLimitActive: boolean;
  onChangeAsset: () => void;
  hasPriorityTokenBalance: boolean;
  onCashback: () => void;
  onTravel: () => void;
  onTransactionHistory?: () => void;
  showTransactionHistoryDuringSetup?: boolean;
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
  showUnlinkMoneyAccount,
  onUnlinkMoneyAccount,
  showRevokeAllowance = false,
  onRevokeAllowance,
  fundingAccountName,
  onOrderMetalCard,
  isSpendingLimitActive,
  onChangeAsset,
  hasPriorityTokenBalance,
  onCashback,
  onTravel,
  onTransactionHistory,
  showTransactionHistoryDuringSetup = false,
}: ManageCardOptionsProps) => {
  const tw = useTailwind();

  const isFullySetUp =
    !isLoading &&
    !hasSetupActions &&
    !hasSetupAlerts &&
    isAuthenticated &&
    card;

  const showTeaserOptions =
    !isLoading && !isAuthenticated && !hasSetupActions && !hasAlertOnlyState;

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

  const showSpendingLimitDescription = isSpendingLimitActive
    ? 'card.card_home.manage_card_options.manage_spending_limit_description_full'
    : 'card.card_home.manage_card_options.manage_spending_limit_description_restricted';

  const showTransactionHistory =
    Boolean(onTransactionHistory) &&
    !isLoading &&
    isAuthenticated &&
    Boolean(card) &&
    !hideManageOptions &&
    (isFullySetUp || showTransactionHistoryDuringSetup);

  return (
    <>
      <Box style={tw.style((hasSetupActions || hasAlertOnlyState) && 'hidden')}>
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
          ((isAuthenticated && !isLoading && card) || showTeaserOptions) && (
            <ManageCardListItem
              title={strings('card.card_home.manage_card_options.change_asset')}
              description={strings(
                'card.card_home.manage_card_options.change_asset_description',
              )}
              onPress={onChangeAsset}
              testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
            />
          )}
        {((isFullySetUp && !hideManageOptions) || showTeaserOptions) &&
          ((isAuthenticated &&
            capabilities?.supportsCashback &&
            account?.verificationStatus === 'VERIFIED') ||
            (showTeaserOptions && capabilities?.supportsCashback)) && (
            <ManageCardListItem
              title={strings('card.card_home.manage_card_options.cashback', {
                cashbackPercentage: card?.type === CardType.METAL ? '3' : '1',
              })}
              description={strings(
                'card.card_home.manage_card_options.cashback_description',
              )}
              rightIcon={IconName.ArrowRight}
              onPress={onCashback}
              testID={CardHomeSelectors.CASHBACK_ITEM}
            />
          )}
        {((isAuthenticated && !isLoading && card && !hideManageOptions) ||
          showTeaserOptions) && (
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
        {((isAuthenticated &&
          !isLoading &&
          card &&
          capabilities?.supportsPinView &&
          cardHasPin &&
          !hideManageOptions) ||
          (showTeaserOptions && capabilities?.supportsPinView)) && (
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
        {((isAuthenticated &&
          !isLoading &&
          card &&
          card.status === CardStatus.ACTIVE &&
          capabilities?.supportsPinSet &&
          cardHasPin &&
          !hideManageOptions) ||
          (showTeaserOptions && capabilities?.supportsPinSet)) && (
          <ManageCardListItem
            title={strings('card.card_home.manage_card_options.set_pin')}
            description={strings(
              'card.card_home.manage_card_options.set_pin_description',
            )}
            onPress={onSetPin}
            testID={CardHomeSelectors.SET_PIN_BUTTON}
          />
        )}
        {((isAuthenticated &&
          !isLoading &&
          card?.isFreezable &&
          card?.status !== CardStatus.BLOCKED &&
          !hideManageOptions) ||
          showTeaserOptions) && (
          <ManageCardListItem
            title={
              isFrozen && isAuthenticated
                ? strings('card.card_home.manage_card_options.unfreeze_card')
                : strings('card.card_home.manage_card_options.freeze_card')
            }
            description={strings(
              isFrozen && isAuthenticated
                ? 'card.card_home.manage_card_options.unfreeze_card_description'
                : 'card.card_home.manage_card_options.freeze_card_description',
            )}
            rightElement={
              <Switch
                value={isFrozen && isAuthenticated}
                onValueChange={isFreezeLoading ? undefined : onToggleFreeze}
                disabled={isFreezeLoading}
                style={tw.style(Platform.OS === 'ios' ? 'mr-2' : '')}
                testID={CardHomeSelectors.FREEZE_CARD_TOGGLE}
              />
            }
            testID="freeze-card-list-item"
          />
        )}
        {capabilities?.supportsFundingLimits &&
          !isLoading &&
          !hideManageOptions && (
            <ManageCardListItem
              title={strings(
                'card.card_home.manage_card_options.manage_spending_limit',
              )}
              description={strings(showSpendingLimitDescription)}
              rightIcon={IconName.ArrowRight}
              onPress={onManageSpendingLimit}
              testID={CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM}
            />
          )}
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
      {capabilities?.supportsTravel &&
        ((isFullySetUp && !hideManageOptions) || showTeaserOptions) && (
          <ManageCardListItem
            title={strings('card.card_home.manage_card_options.travel_title')}
            description={strings(
              'card.card_home.manage_card_options.travel_description',
            )}
            rightIcon={IconName.Export}
            onPress={onTravel}
            testID={CardHomeSelectors.TRAVEL_ITEM}
          />
        )}
    </>
  );
};

export default ManageCardOptions;
