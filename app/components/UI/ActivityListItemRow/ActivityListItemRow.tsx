/**
 * Row component that renders a single ActivityListItem from the shared adapter shape.
 * All styling and localization are Mobile-specific; data comes from the shared adapters.
 */
import React, { useCallback } from 'react';
import {
  Image,
  Text,
  TextStyle,
  TouchableHighlight,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { useTheme } from '../../../util/theme';
import { getTransactionIcon } from '../../../util/transaction-icons';
import { toDateFormat } from '../../../util/date';
import { strings } from '../../../../locales/i18n';
import ListItem from '../../Base/ListItem';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import { getNetworkImageSource } from '../../../util/networks';
import { RootState } from '../../../reducers';
import { AppThemeKey } from '../../../util/theme/models';
import {
  getFontFamily,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import {
  applyDisplaySign,
  getDisplaySignPrefix,
  getHumanReadableTokenAmount,
  toMarketRateLookupToken,
  type ActivityListItem,
  type ActivityKind,
  type Status,
  type TokenAmount,
} from '../../../util/activity-adapters';
import {
  selectCurrencyRateForChainId,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../selectors/tokenRatesController';
import { NATIVE_TOKEN_ADDRESS } from '../../../util/activity-adapters/adapters/shims';
import { balanceToFiatNumber, renderFiat } from '../../../util/number/bigint';

type TokenMarketData = ReturnType<typeof selectTokenMarketData>;

type FiatCurrencyCode = Parameters<typeof renderFiat>[1];

// ---------------------------------------------------------------------------
// Chain/token helpers
// ---------------------------------------------------------------------------

function resolveDisplayToken(item: ActivityListItem): TokenAmount | undefined {
  const { data } = item;

  if ('destinationToken' in data && data.destinationToken?.symbol) {
    return data.destinationToken;
  }

  if ('sourceToken' in data && data.sourceToken?.symbol) {
    return data.sourceToken;
  }

  if ('token' in data && data.token?.symbol) {
    return data.token;
  }

  return undefined;
}

const getHexChainId = (chainId: string): Hex | undefined => {
  const decimalChainId = chainId.split(':')[1];
  if (!decimalChainId) {
    return undefined;
  }

  return `0x${Number.parseInt(decimalChainId, 10).toString(16)}` as Hex;
};

function getTokenPrice({
  token,
  hexChainId,
  marketData,
}: {
  token: TokenAmount;
  hexChainId: Hex;
  marketData: TokenMarketData;
}): number | undefined {
  const marketRateToken = toMarketRateLookupToken(token, hexChainId);

  if (!marketRateToken) {
    return undefined;
  }

  const tokenAddress = marketRateToken.address as Hex;

  if (tokenAddress === NATIVE_TOKEN_ADDRESS) {
    return 1;
  }

  const chainMarketData = marketData?.[hexChainId];
  if (!chainMarketData) {
    return undefined;
  }

  const exactPrice = chainMarketData[tokenAddress]?.price;
  if (exactPrice !== undefined) {
    return exactPrice;
  }

  const normalizedTokenAddress = tokenAddress.toLowerCase();
  const marketDataAddress = Object.keys(chainMarketData).find(
    (address) => address.toLowerCase() === normalizedTokenAddress,
  );

  return marketDataAddress
    ? chainMarketData[marketDataAddress as Hex]?.price
    : undefined;
}

function resolveFiatAmount({
  token,
  hexChainId,
  marketData,
  nativeConversionRate,
  currentCurrency,
}: {
  token: TokenAmount | undefined;
  hexChainId: Hex | undefined;
  marketData: TokenMarketData;
  nativeConversionRate: number | undefined;
  currentCurrency: string | undefined;
}): string | undefined {
  if (
    !token ||
    !hexChainId ||
    !nativeConversionRate ||
    !currentCurrency ||
    token.amount === undefined
  ) {
    return undefined;
  }

  const amount = getHumanReadableTokenAmount(token);
  const tokenPrice = getTokenPrice({ token, hexChainId, marketData });

  if (!amount || tokenPrice === undefined) {
    return undefined;
  }

  const fiatNumber = balanceToFiatNumber(
    amount,
    nativeConversionRate,
    tokenPrice,
  );
  const fiatAmount = renderFiat(
    fiatNumber,
    currentCurrency as FiatCurrencyCode,
    2,
  );
  const signPrefix = getDisplaySignPrefix(token.direction, { showPlus: true });

  return applyDisplaySign(fiatAmount, signPrefix);
}

// ---------------------------------------------------------------------------
// Status → display
// ---------------------------------------------------------------------------

interface StatusDisplay {
  label: string;
  colorKey: 'success' | 'warning' | 'error' | 'muted';
}

const STATUS_DISPLAY = {
  success: { label: strings('transaction.confirmed'), colorKey: 'success' },
  failed: { label: strings('transaction.failed'), colorKey: 'error' },
  cancelled: { label: strings('transaction.cancelled'), colorKey: 'error' },
  pending: {
    label: strings('transaction.submitted'),
    colorKey: 'warning',
  },
} satisfies Record<Status, StatusDisplay>;

/** Maps all adapter Status values to display labels and colors. */
function resolveStatus(status: Status): StatusDisplay {
  return STATUS_DISPLAY[status];
}

// ---------------------------------------------------------------------------
// ActivityKind → title
// ---------------------------------------------------------------------------

type ActivityTitleResolver = (token?: TokenAmount) => string;

const withSymbol = (
  token: TokenAmount | undefined,
  symbolKey: string,
  fallbackKey: string,
) => {
  const symbol = token?.symbol ?? '';
  return symbol ? strings(symbolKey, { unit: symbol }) : strings(fallbackKey);
};

const ACTIVITY_TITLE_RESOLVERS = {
  send: (token) =>
    withSymbol(token, 'transactions.sent_unit', 'transactions.sent'),
  receive: (token) =>
    withSymbol(token, 'transactions.received_unit', 'transactions.received'),
  swap: () => strings('transactions.swaps_transaction'),
  swapIncomplete: () => strings('transactions.swaps_transaction'),
  bridge: () => strings('transactions.bridge_transaction'),
  buy: () => strings('transactions.activity_buy'),
  sell: () => strings('transactions.activity_sell'),
  claim: () => strings('transactions.claim'),
  claimMusdBonus: () => strings('transactions.activity_claim_musd_bonus'),
  deposit: () => strings('transactions.tx_review_staking_deposit'),
  convert: () => strings('transactions.tx_review_musd_conversion'),
  wrap: () => strings('transactions.activity_wrap'),
  unwrap: () => strings('transactions.activity_unwrap'),
  approveSpendingCap: () => strings('transactions.tx_review_approve'),
  revokeSpendingCap: () => strings('transactions.activity_revoke_spending_cap'),
  increaseSpendingCap: () =>
    strings('transactions.tx_review_increase_allowance'),
  lendingDeposit: () => strings('transactions.tx_review_lending_deposit'),
  lendingWithdrawal: () => strings('transactions.tx_review_lending_withdraw'),
  nftMint: () => strings('transactions.activity_nft_mint'),
  contractInteraction: () => strings('transactions.smart_contract_interaction'),
  contractDeployment: () =>
    strings('transactions.tx_review_contract_deployment'),
  smartAccountUpgrade: () =>
    strings('transactions.activity_smart_account_upgrade'),
  predictionsAddFunds: () => strings('transactions.tx_review_predict_deposit'),
  predictionsWithdrawFunds: () =>
    strings('transactions.tx_review_predict_withdraw'),
  predictionClaimWinnings: () =>
    strings('transactions.tx_review_predict_claim'),
  predictionCashedOut: () =>
    strings('transactions.activity_prediction_cashed_out'),
  predictionPlaced: () => strings('transactions.activity_prediction_placed'),
  perpsAddFunds: () => strings('transactions.tx_review_perps_deposit'),
  perpsWithdrawFunds: () => strings('transactions.tx_review_perps_withdraw'),
  perpsOpenLong: () => strings('transactions.activity_perps_open_long'),
  perpsCloseLong: () => strings('transactions.activity_perps_close_long'),
  perpsCloseLongLiquidated: () =>
    strings('transactions.activity_perps_close_long_liquidated'),
  perpsCloseLongStopLoss: () =>
    strings('transactions.activity_perps_close_long_stop_loss'),
  perpsOpenShort: () => strings('transactions.activity_perps_open_short'),
  perpsCloseShort: () => strings('transactions.activity_perps_close_short'),
  perpsCloseShortLiquidated: () =>
    strings('transactions.activity_perps_close_short_liquidated'),
  perpsCloseShortStopLoss: () =>
    strings('transactions.activity_perps_close_short_stop_loss'),
  perpsPaidFundingFees: () =>
    strings('transactions.activity_perps_paid_funding_fees'),
  perpsReceivedFundingFees: () =>
    strings('transactions.activity_perps_received_funding_fees'),
  perpsCloseShortTakeProfit: () =>
    strings('transactions.activity_perps_close_short_take_profit'),
  perpsCloseLongTakeProfit: () =>
    strings('transactions.activity_perps_close_long_take_profit'),
  marketShort: () => strings('transactions.activity_market_short'),
  stopMarketCloseShort: () =>
    strings('transactions.activity_stop_market_close_short'),
  marketCloseShort: () => strings('transactions.activity_market_close_short'),
  trustlineActivate: (token) =>
    withSymbol(
      token,
      'transactions.trustline_activated_unit',
      'transactions.trustline_activated',
    ),
  trustlineDeactivate: (token) =>
    withSymbol(
      token,
      'transactions.trustline_deactivated_unit',
      'transactions.trustline_deactivated',
    ),
} satisfies Record<ActivityKind, ActivityTitleResolver>;

/** Returns a display title for each ActivityKind. */
function resolveTitle(type: ActivityKind, token?: TokenAmount): string {
  return ACTIVITY_TITLE_RESOLVERS[type](token);
}

export function resolveActivityListItemTitle(
  item: ActivityListItem,
  titleOverride?: string,
): string {
  if (titleOverride) {
    return titleOverride;
  }

  const primaryToken =
    'token' in item.data
      ? (item.data as { token?: TokenAmount }).token
      : 'sourceToken' in item.data
        ? (item.data as { sourceToken?: TokenAmount }).sourceToken
        : undefined;

  return resolveTitle(item.type, primaryToken);
}

// ---------------------------------------------------------------------------
// ActivityKind → icon type string (matches getTransactionIcon switch cases)
// ---------------------------------------------------------------------------

function resolveIconType(type: ActivityKind): string {
  switch (type) {
    case 'send':
    case 'sell':
    case 'lendingDeposit':
    case 'deposit':
    case 'wrap':
    case 'perpsAddFunds':
    case 'predictionsAddFunds':
      return 'send';
    case 'receive':
    case 'buy':
    case 'claim':
    case 'claimMusdBonus':
    case 'lendingWithdrawal':
    case 'unwrap':
    case 'nftMint':
    case 'perpsWithdrawFunds':
    case 'predictionsWithdrawFunds':
    case 'predictionClaimWinnings':
    case 'predictionCashedOut':
    case 'predictionPlaced':
    case 'perpsReceivedFundingFees':
      return 'receive';
    case 'swap':
    case 'swapIncomplete':
    case 'bridge':
    case 'convert':
      return 'swap';
    case 'approveSpendingCap':
    case 'revokeSpendingCap':
    case 'increaseSpendingCap':
    case 'trustlineActivate':
    case 'trustlineDeactivate':
    case 'contractInteraction':
    case 'contractDeployment':
    case 'smartAccountUpgrade':
    case 'perpsOpenLong':
    case 'perpsCloseLong':
    case 'perpsCloseLongLiquidated':
    case 'perpsCloseLongStopLoss':
    case 'perpsOpenShort':
    case 'perpsCloseShort':
    case 'perpsCloseShortLiquidated':
    case 'perpsCloseShortStopLoss':
    case 'perpsPaidFundingFees':
    case 'perpsCloseShortTakeProfit':
    case 'perpsCloseLongTakeProfit':
    case 'marketShort':
    case 'stopMarketCloseShort':
    case 'marketCloseShort':
      return 'interaction';
  }
}

// ---------------------------------------------------------------------------
// Amount display
// ---------------------------------------------------------------------------

function resolveAmount(
  token: TokenAmount | undefined,
  activityType: ActivityKind,
): string {
  if (
    !token?.symbol ||
    activityType === 'trustlineActivate' ||
    activityType === 'trustlineDeactivate'
  ) {
    return '';
  }

  const amount = getHumanReadableTokenAmount(token);
  const signPrefix = getDisplaySignPrefix(token.direction, { showPlus: true });
  const value = amount ? `${amount} ${token.symbol}` : token.symbol;

  return applyDisplaySign(value, signPrefix);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  typography: ReturnType<typeof useTheme>['typography'],
) =>
  StyleSheet.create({
    row: {
      backgroundColor: colors.background.default,
      flex: 1,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    icon: {
      width: 32,
      height: 32,
    },
    listItemDate: {
      marginBottom: 10,
      paddingBottom: 0,
    },
    listItemContent: {
      alignItems: 'flex-start',
      marginTop: 0,
      paddingTop: 0,
    },
    listItemTitle: {
      ...typography.sBodyLGMedium,
      fontFamily: getFontFamily(TextVariant.BodyLGMedium),
      marginTop: 0,
      color: colors.text.default,
    } as TextStyle,
    statusText: {
      ...typography.sBodyMDBold,
      fontFamily: getFontFamily(TextVariant.BodyMDBold),
      marginTop: 4,
      fontSize: 12,
      letterSpacing: 0.5,
    } as TextStyle,
    listItemAmount: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
      color: colors.text.alternative,
    } as TextStyle,
  });

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ActivityListItemRowProps {
  item: ActivityListItem;
  index?: number;
  onPress?: (item: ActivityListItem) => void;
  /**
   * Optional pre-resolved title. Used to preserve the legacy Activity contract
   * for swap/bridge rows (e.g. "Swap ETH to USDC", "Bridge to Optimism"), which
   * the parent derives from bridge history. Falls back to the kind-based title.
   */
  title?: string;
}

export function ActivityListItemRow({
  item,
  index,
  onPress,
  title: titleOverride,
}: ActivityListItemRowProps) {
  const { colors, typography } = useTheme();
  const osColorScheme = useColorScheme();
  const appTheme = useSelector(
    (state: RootState) => state.user.appTheme as AppThemeKey,
  );

  const styles = createStyles(colors, typography);
  const isFailed = item.status === 'failed' || item.status === 'cancelled';
  const iconType = resolveIconType(item.type);
  const icon = getTransactionIcon(iconType, isFailed, appTheme, osColorScheme);

  const statusDisplay = resolveStatus(item.status);
  const statusColor =
    statusDisplay.colorKey === 'success'
      ? colors.success.default
      : statusDisplay.colorKey === 'error'
        ? colors.error.default
        : statusDisplay.colorKey === 'warning'
          ? colors.warning.default
          : colors.text.muted;

  const title = resolveActivityListItemTitle(item, titleOverride);
  const displayToken = resolveDisplayToken(item);
  const amount = resolveAmount(displayToken, item.type);
  const marketData = useSelector(selectTokenMarketData);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const hexChainId = getHexChainId(item.chainId);
  const nativeConversionRate = useSelector((state: RootState) =>
    hexChainId ? selectCurrencyRateForChainId(state, hexChainId) : undefined,
  );
  const fiatAmount = resolveFiatAmount({
    token: displayToken,
    hexChainId,
    marketData,
    nativeConversionRate,
    currentCurrency,
  });

  const networkImageSource = getNetworkImageSource({
    chainId: item.chainId,
  });

  const handlePress = useCallback(() => {
    onPress?.(item);
  }, [onPress, item]);

  return (
    <TouchableHighlight
      style={styles.row}
      onPress={handlePress}
      underlayColor={colors.background.alternative}
      activeOpacity={1}
      testID={`transaction-item-${index ?? 0}`}
    >
      <ListItem>
        <ListItem.Date style={styles.listItemDate}>
          {toDateFormat(new Date(item.timestamp))}
        </ListItem.Date>
        <ListItem.Content style={styles.listItemContent}>
          <ListItem.Icon>
            <BadgeWrapper
              badgePosition={{ bottom: -4, right: -4 }}
              badgeElement={
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={networkImageSource}
                  isScaled={false}
                  size={AvatarSize.Xs}
                />
              }
            >
              <Image source={icon} style={styles.icon} resizeMode="stretch" />
            </BadgeWrapper>
          </ListItem.Icon>
          <ListItem.Body>
            <ListItem.Title numberOfLines={1} style={styles.listItemTitle}>
              {title}
            </ListItem.Title>
            <Text
              style={[styles.statusText, { color: statusColor }]}
              testID={`transaction-status-${index ?? 0}`}
            >
              {statusDisplay.label}
            </Text>
          </ListItem.Body>
          {Boolean(amount) && (
            <ListItem.Amounts>
              {Boolean(fiatAmount) && (
                <ListItem.FiatAmount style={styles.listItemAmount}>
                  {fiatAmount}
                </ListItem.FiatAmount>
              )}
              <ListItem.Amount style={styles.listItemAmount}>
                {amount}
              </ListItem.Amount>
            </ListItem.Amounts>
          )}
        </ListItem.Content>
      </ListItem>
    </TouchableHighlight>
  );
}

export default ActivityListItemRow;
