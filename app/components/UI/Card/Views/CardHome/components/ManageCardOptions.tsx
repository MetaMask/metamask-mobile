import React from 'react';
import { Image, Platform, StyleSheet } from 'react-native';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  ListItemVariant,
  SensitiveText,
  SensitiveTextLength,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import applePayMark from '../../../components/ApplePayUsageSheet/assets/apple-pay-mark.png';

const APPLE_PAY_MARK_ASPECT_RATIO = 170 / 109;

const styles = StyleSheet.create({
  applePayMark: {
    width: 38,
    height: 38 / APPLE_PAY_MARK_ASPECT_RATIO,
  },
});
import { strings } from '../../../../../../../locales/i18n';
import { getWalletTypeForPlatform } from '../../../pushProvisioning/constants';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CardType, type CardFundingToken } from '../../../types';
import { getCardTokenDisplay } from '../../../util/getCardTokenDisplay';
import {
  formatSpendingLimitDisplayValue,
  SPENDING_LIMIT_ERROR_THRESHOLD,
  SPENDING_LIMIT_WARNING_THRESHOLD,
} from '../../../util/formatSpendingLimitDisplayValue';
import { mapCaipChainIdToChainName } from '../../../util/mapCaipChainIdToChainName';
import { safeFormatChainIdToHex } from '../../../util/safeFormatChainIdToHex';
import { getNetworkImageSource } from '../../../../../../util/networks';
import MoneyBalanceIcon from '../../../../../../images/money-balance.svg';
import {
  CardStatus,
  type CardDetails,
  type CardAccountStatus,
  type CardProviderCapabilities,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

// Set PIN row hidden in the Card home redesign.
const SHOW_SET_PIN_ROW = false;

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
  onSetPin: () => void;
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
  spendingLimitRemaining?: string;
  spendingLimitTotal?: string;
  spendingLimitSymbol?: string;
  privacyMode?: boolean;
  onChangeAsset: () => void;
  /** The asset the card spends from, shown on the Change asset row. */
  currentFundingToken?: Pick<
    CardFundingToken,
    | 'address'
    | 'caipChainId'
    | 'symbol'
    | 'displaySymbol'
    | 'isMoneyAccountEntry'
  > | null;
  hasPriorityTokenBalance: boolean;
  onCashback: () => void;
  onTravel: () => void;
  onTransactionHistory?: () => void;
  showTransactionHistoryDuringSetup?: boolean;
}

type FundingTokenDisplayInput = NonNullable<
  ManageCardOptionsProps['currentFundingToken']
>;

const getFundingTokenLabel = (token: FundingTokenDisplayInput): string => {
  if (token.isMoneyAccountEntry) {
    return strings('card.card_spending_limit.money_account_label');
  }
  return strings('card.card_home.manage_card_options.change_asset_current', {
    symbol: getCardTokenDisplay(token).symbol,
    network: mapCaipChainIdToChainName(token.caipChainId),
  });
};

// Same avatar as the asset picker rows (AssetSelectionRow).
const FundingTokenAvatar = ({ token }: { token: FundingTokenDisplayInput }) => {
  if (token.isMoneyAccountEntry) {
    return (
      <MoneyBalanceIcon
        width={40}
        height={40}
        name="money-balance"
        testID={CardHomeSelectors.CHANGE_ASSET_TOKEN_AVATAR}
      />
    );
  }
  const { symbol, iconSource } = getCardTokenDisplay(token);
  return (
    <BadgeWrapper
      position={BadgeWrapperPosition.BottomRight}
      badge={
        token.caipChainId ? (
          <BadgeNetwork
            src={getNetworkImageSource({
              chainId: safeFormatChainIdToHex(
                token.caipChainId,
              ) as `0x${string}`,
            })}
          />
        ) : null
      }
      testID={CardHomeSelectors.CHANGE_ASSET_TOKEN_AVATAR}
    >
      <AvatarToken
        name={symbol}
        src={iconSource as { uri?: string } | number}
        size={AvatarTokenSize.Lg}
      />
    </BadgeWrapper>
  );
};

// Leading icon for the option rows, copied from the Wallet home Predict list
// rows (Predict/homeSection/components/HomepagePredictDiscovery/BtcLiveRow.tsx):
// a 40px muted circle with the icon centred in the default icon colour. The
// Change asset token avatar uses the same 40px size so all row text lines up.
const RowIcon = ({ name }: { name: IconName }) => (
  <Box twClassName="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
    <Icon name={name} size={IconSize.Md} color={IconColor.IconDefault} />
  </Box>
);

// Trailing chevron, same as the Wallet home Predict rows
// (Predict/components/PredictMarketRowItem/PredictMarketRowItem.tsx).
const RowChevron = ({ name }: { name: IconName }) => (
  <Icon name={name} size={IconSize.Sm} color={IconColor.IconAlternative} />
);

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
  onSetPin,
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
  spendingLimitRemaining,
  spendingLimitTotal,
  spendingLimitSymbol,
  privacyMode = false,
  onChangeAsset,
  currentFundingToken,
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

  const spendingLimitRemainingValue = parseFloat(spendingLimitRemaining ?? '');
  const spendingLimitTotalValue = parseFloat(spendingLimitTotal ?? '');
  const hasValidRemaining =
    spendingLimitRemaining != null &&
    spendingLimitRemaining !== '' &&
    Number.isFinite(spendingLimitRemainingValue);
  const hasValidTotal =
    spendingLimitTotal != null &&
    spendingLimitTotal !== '' &&
    Number.isFinite(spendingLimitTotalValue) &&
    spendingLimitTotalValue > 0;
  const hasSpendingLimitAmounts =
    showLimitedSpendingAmounts &&
    Boolean(spendingLimitSymbol) &&
    hasValidRemaining &&
    hasValidTotal;

  const spendingLimitConsumed =
    hasSpendingLimitAmounts && spendingLimitTotalValue > 0
      ? Math.min(
          1,
          Math.max(
            0,
            (spendingLimitTotalValue - spendingLimitRemainingValue) /
              spendingLimitTotalValue,
          ),
        )
      : 0;
  const spendingLimitDescriptionColor = privacyMode
    ? TextColor.TextAlternative
    : spendingLimitConsumed >= SPENDING_LIMIT_ERROR_THRESHOLD
      ? TextColor.ErrorDefault
      : spendingLimitConsumed >= SPENDING_LIMIT_WARNING_THRESHOLD
        ? TextColor.WarningDefault
        : TextColor.TextAlternative;

  const spendingLimitDescription = isSpendingLimitActive ? (
    strings(
      'card.card_home.manage_card_options.manage_spending_limit_description_full',
    )
  ) : hasSpendingLimitAmounts ? (
    <SensitiveText
      variant={TextVariant.BodySm}
      color={spendingLimitDescriptionColor}
      isHidden={privacyMode}
      length={SensitiveTextLength.Short}
    >
      {strings(
        'card.card_home.manage_card_options.manage_spending_limit_description_remaining',
        {
          remaining: formatSpendingLimitDisplayValue(
            spendingLimitRemainingValue,
          ),
          total: formatSpendingLimitDisplayValue(spendingLimitTotalValue),
          symbol: spendingLimitSymbol,
        },
      )}
    </SensitiveText>
  ) : (
    strings(
      'card.card_home.manage_card_options.manage_spending_limit_description_restricted',
    )
  );

  // Once the card is fully set up, transaction history lives in Card home's
  // Recent activity panel (with its own "See all"). This row only remains for
  // the setup override (Immersve while setup actions are pending), where the
  // panel is not shown.
  const showTransactionHistory =
    Boolean(onTransactionHistory) &&
    !isLoading &&
    isAuthenticated &&
    Boolean(card) &&
    !hideManageOptions &&
    showTransactionHistoryDuringSetup &&
    !isFullySetUp;

  return (
    <>
      <Box style={tw.style((hasSetupActions || hasAlertOnlyState) && 'hidden')}>
        {isFullySetUp && showHowToUseApplePay && Platform.OS === 'ios' && (
          <ListItem
            isInteractive
            variant={ListItemVariant.OneLine}
            accessoryGap={4}
            title={strings('card.apple_pay_usage.row_title')}
            startAccessory={
              <Image
                source={applePayMark}
                resizeMode="contain"
                accessible={false}
                style={styles.applePayMark}
              />
            }
            endAccessory={<RowChevron name={IconName.ArrowRight} />}
            onPress={onHowToUseApplePay}
            testID={CardHomeSelectors.APPLE_PAY_USAGE_ITEM}
          />
        )}
        {isEligibleForMetalCard && !hideManageOptions && (
          <ListItem
            isInteractive
            variant={ListItemVariant.TwoLines}
            accessoryGap={4}
            title={strings(
              'card.card_home.manage_card_options.order_metal_card',
            )}
            description={strings(
              'card.card_home.manage_card_options.order_metal_card_description',
            )}
            endAccessory={<RowChevron name={IconName.ArrowRight} />}
            onPress={onOrderMetalCard}
            startAccessory={<RowIcon name={IconName.Card} />}
            testID={CardHomeSelectors.ORDER_METAL_CARD_ITEM}
          />
        )}
        {capabilities?.supportsFundingLimits &&
          !showUnlinkMoneyAccount &&
          ((isAuthenticated && !isLoading && card) || showTeaserOptions) && (
            <ListItem
              isInteractive
              variant={ListItemVariant.TwoLines}
              accessoryGap={4}
              // With a funding asset: a small "Paying with" label above the
              // asset. Without one: the original "Change asset" title and hint.
              title={
                currentFundingToken
                  ? strings('card.card_home.manage_card_options.paying_with')
                  : strings('card.card_home.manage_card_options.change_asset')
              }
              titleProps={
                currentFundingToken
                  ? {
                      variant: TextVariant.BodySm,
                      color: TextColor.TextAlternative,
                    }
                  : undefined
              }
              description={
                currentFundingToken
                  ? getFundingTokenLabel(currentFundingToken)
                  : strings(
                      'card.card_home.manage_card_options.change_asset_description',
                    )
              }
              descriptionProps={
                currentFundingToken
                  ? {
                      variant: TextVariant.BodyMd,
                      color: TextColor.TextDefault,
                    }
                  : undefined
              }
              startAccessory={
                currentFundingToken ? (
                  <FundingTokenAvatar token={currentFundingToken} />
                ) : undefined
              }
              // Same pill as the Wallet home "Buy" button
              // (Homepage/Sections/Tokens/components/PopularTokenRow.tsx).
              endAccessory={
                <Box twClassName="self-center">
                  <Button
                    variant={ButtonVariant.Secondary}
                    size={ButtonSize.Md}
                    onPress={onChangeAsset}
                    testID={CardHomeSelectors.CHANGE_ASSET_ACTION_BUTTON}
                  >
                    {strings(
                      'card.card_home.manage_card_options.change_asset_action',
                    )}
                  </Button>
                </Box>
              }
              onPress={onChangeAsset}
              testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
            />
          )}
        {((isFullySetUp && !hideManageOptions) || showTeaserOptions) &&
          ((isAuthenticated &&
            capabilities?.supportsCashback &&
            account?.verificationStatus === 'VERIFIED') ||
            (showTeaserOptions && capabilities?.supportsCashback)) && (
            <ListItem
              isInteractive
              variant={ListItemVariant.TwoLines}
              accessoryGap={4}
              title={strings('card.card_home.manage_card_options.cashback', {
                cashbackPercentage: card?.type === CardType.METAL ? '3' : '1',
              })}
              description={strings(
                'card.card_home.manage_card_options.cashback_description',
              )}
              endAccessory={<RowChevron name={IconName.ArrowRight} />}
              onPress={onCashback}
              startAccessory={<RowIcon name={IconName.Gift} />}
              testID={CardHomeSelectors.CASHBACK_ITEM}
            />
          )}
        {isFullySetUp &&
          !hideManageOptions &&
          showDigitalWalletInstructions && (
            <ListItem
              isInteractive
              variant={ListItemVariant.TwoLines}
              accessoryGap={4}
              title={strings(
                getWalletTypeForPlatform() === 'apple_wallet'
                  ? 'card.card_home.manage_card_options.add_to_apple_wallet'
                  : 'card.card_home.manage_card_options.add_to_google_wallet',
              )}
              description={strings(
                'card.card_home.manage_card_options.add_to_wallet_description',
              )}
              endAccessory={<RowChevron name={IconName.ArrowRight} />}
              onPress={onDigitalWalletInstructions}
              startAccessory={
                <RowIcon
                  name={
                    getWalletTypeForPlatform() === 'apple_wallet'
                      ? IconName.AppleLogo
                      : IconName.Wallet
                  }
                />
              }
              testID={CardHomeSelectors.DIGITAL_WALLET_INSTRUCTIONS_ITEM}
            />
          )}
        {SHOW_SET_PIN_ROW &&
          ((isAuthenticated &&
            !isLoading &&
            card &&
            card.status === CardStatus.ACTIVE &&
            capabilities?.supportsPinSet &&
            cardHasPin &&
            !hideManageOptions) ||
            (showTeaserOptions && capabilities?.supportsPinSet)) && (
            <ListItem
              isInteractive
              variant={ListItemVariant.TwoLines}
              accessoryGap={4}
              title={strings('card.card_home.manage_card_options.set_pin')}
              description={strings(
                'card.card_home.manage_card_options.set_pin_description',
              )}
              onPress={onSetPin}
              startAccessory={<RowIcon name={IconName.Key} />}
              testID={CardHomeSelectors.SET_PIN_BUTTON}
            />
          )}
        {capabilities?.supportsFundingLimits &&
          !isLoading &&
          !hideManageOptions && (
            <ListItem
              isInteractive
              variant={ListItemVariant.TwoLines}
              accessoryGap={4}
              title={strings(
                'card.card_home.manage_card_options.manage_spending_limit',
              )}
              description={spendingLimitDescription}
              endAccessory={<RowChevron name={IconName.ArrowRight} />}
              onPress={onManageSpendingLimit}
              startAccessory={<RowIcon name={IconName.Speedometer} />}
              testID={CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM}
            />
          )}
        {isFullySetUp &&
          capabilities?.supportsContactDetails &&
          !hideManageOptions && (
            <ListItem
              isInteractive
              variant={ListItemVariant.TwoLines}
              accessoryGap={4}
              title={strings(
                'card.card_home.manage_card_options.contact_details',
              )}
              description={strings(
                'card.card_home.manage_card_options.contact_details_description',
              )}
              endAccessory={<RowChevron name={IconName.ArrowRight} />}
              onPress={onContactDetails}
              startAccessory={<RowIcon name={IconName.UserCircle} />}
              testID={CardHomeSelectors.CONTACT_DETAILS_ITEM}
            />
          )}
        {isFullySetUp && showUnlinkMoneyAccount && (
          <ListItem
            isInteractive
            variant={ListItemVariant.TwoLines}
            accessoryGap={4}
            title={strings(
              'card.card_home.manage_card_options.unlink_money_account',
            )}
            description={strings(
              'card.card_home.manage_card_options.unlink_money_account_description',
            )}
            endAccessory={<RowChevron name={IconName.ArrowRight} />}
            onPress={onUnlinkMoneyAccount}
            startAccessory={<RowIcon name={IconName.Link} />}
            testID={CardHomeSelectors.UNLINK_MONEY_ACCOUNT_ITEM}
          />
        )}
        {isFullySetUp && showRevokeAllowance && onRevokeAllowance && (
          <ListItem
            isInteractive
            variant={ListItemVariant.TwoLines}
            accessoryGap={4}
            title={strings(
              'card.card_home.manage_card_options.unlink_funding_account',
            )}
            description={strings(
              'card.card_home.manage_card_options.unlink_funding_account_description',
              { accountName: fundingAccountName },
            )}
            endAccessory={<RowChevron name={IconName.ArrowRight} />}
            onPress={onRevokeAllowance}
            startAccessory={<RowIcon name={IconName.SecuritySlash} />}
            testID={CardHomeSelectors.REVOKE_ALLOWANCE_ITEM}
          />
        )}
      </Box>
      {showTransactionHistory ? (
        <ListItem
          isInteractive
          variant={ListItemVariant.TwoLines}
          accessoryGap={4}
          title={strings('card.transactions.manage_entry_title')}
          description={strings('card.transactions.manage_entry_description')}
          endAccessory={<RowChevron name={IconName.ArrowRight} />}
          onPress={onTransactionHistory}
          startAccessory={<RowIcon name={IconName.Clock} />}
          testID={CardHomeSelectors.TRANSACTION_HISTORY_ITEM}
        />
      ) : null}
      {capabilities?.supportsTravel &&
        ((isFullySetUp && !hideManageOptions) || showTeaserOptions) && (
          <ListItem
            isInteractive
            variant={ListItemVariant.TwoLines}
            accessoryGap={4}
            title={strings('card.card_home.manage_card_options.travel_title')}
            description={strings(
              'card.card_home.manage_card_options.travel_description',
            )}
            endAccessory={<RowChevron name={IconName.ArrowSquareOut} />}
            onPress={onTravel}
            startAccessory={<RowIcon name={IconName.Global} />}
            testID={CardHomeSelectors.TRAVEL_ITEM}
          />
        )}
    </>
  );
};

export default ManageCardOptions;
