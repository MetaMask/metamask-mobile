import type { BridgeHistoryItem } from '@metamask/bridge-status-controller';
import type { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { NETWORK_TO_SHORT_NETWORK_NAME_MAP } from '../../../constants/bridge';
import { RootState } from '../../../reducers';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
  selectUSDConversionRateByChainId,
} from '../../../selectors/currencyRateController';
import { selectContractExchangeRatesByChainId } from '../../../selectors/tokenRatesController';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../Earn/constants/musd';
import {
  renderShortAddress,
  safeToChecksumAddress,
} from '../../../util/address';
import {
  applyDisplaySign,
  type ActivityKind,
  type ActivityListItem,
  getDisplaySignPrefix,
  getHumanReadableTokenAmount,
  shouldShowPlusSign,
  type TokenAmount,
  toMarketRateLookupToken,
} from '../../../util/activity-adapters';
import type { MarketRateLookupToken } from '../../../util/activity-adapters/fiat';
import { balanceToFiatNumber, renderFiat } from '../../../util/number/bigint';
import type { ActivityListItemRowContent } from './ActivityListItemRow.types';

function withOptionalSymbol(label: string, symbol?: string): string {
  return symbol ? `${label} ${symbol}` : label;
}

function tokenPairSubtitle(
  sourceToken?: TokenAmount,
  destinationToken?: TokenAmount,
): string | undefined {
  const sourceSymbol = sourceToken?.symbol;
  const destinationSymbol = destinationToken?.symbol;
  return sourceSymbol && destinationSymbol
    ? `${sourceSymbol} → ${destinationSymbol}`
    : undefined;
}

function normalizeBridgeQuoteChainId(
  chainId: string | number | undefined,
): string | undefined {
  if (chainId === undefined) {
    return undefined;
  }

  if (typeof chainId === 'number') {
    return `0x${chainId.toString(16)}`;
  }

  if (chainId.startsWith('eip155:')) {
    const [, decimalChainId] = chainId.split(':');
    const parsedChainId = Number.parseInt(decimalChainId, 10);
    return Number.isNaN(parsedChainId)
      ? undefined
      : `0x${parsedChainId.toString(16)}`;
  }

  if (/^\d+$/u.test(chainId)) {
    return `0x${Number.parseInt(chainId, 10).toString(16)}`;
  }

  return chainId.toLowerCase();
}

function getBridgeQuoteNetworkName(
  chainId: string | number | undefined,
): string | undefined {
  const normalizedChainId = normalizeBridgeQuoteChainId(chainId);

  return normalizedChainId
    ? NETWORK_TO_SHORT_NETWORK_NAME_MAP[
        normalizedChainId as keyof typeof NETWORK_TO_SHORT_NETWORK_NAME_MAP
      ]
    : undefined;
}

function bridgeRouteSubtitle(
  bridgeHistoryItem: BridgeHistoryItem | undefined,
): string | undefined {
  const { srcChainId, destChainId } = bridgeHistoryItem?.quote ?? {};
  const srcChainName = getBridgeQuoteNetworkName(srcChainId);
  const destChainName = getBridgeQuoteNetworkName(destChainId);

  return srcChainName && destChainName
    ? `${srcChainName} → ${destChainName}`
    : undefined;
}

function tokenFromBridgeQuoteAsset({
  amount,
  asset,
  direction,
}: {
  amount: string | undefined;
  asset:
    | {
        assetId?: string;
        decimals?: number;
        symbol?: string;
      }
    | undefined;
  direction: TokenAmount['direction'];
}): TokenAmount | undefined {
  if (!amount || !asset?.symbol) {
    return undefined;
  }

  return {
    amount,
    direction,
    symbol: asset.symbol,
    ...(asset.decimals === undefined ? {} : { decimals: asset.decimals }),
    ...(asset.assetId ? { assetId: asset.assetId } : {}),
  };
}

function getBridgeQuoteTokens(
  bridgeHistoryItem: BridgeHistoryItem | undefined,
): {
  sourceToken?: TokenAmount;
  destinationToken?: TokenAmount;
} {
  const quote = bridgeHistoryItem?.quote;

  return {
    sourceToken: tokenFromBridgeQuoteAsset({
      amount: quote?.srcTokenAmount,
      asset: quote?.srcAsset,
      direction: 'out',
    }),
    destinationToken: tokenFromBridgeQuoteAsset({
      amount: quote?.destTokenAmount ?? quote?.minDestTokenAmount,
      asset: quote?.destAsset,
      direction: 'in',
    }),
  };
}

function shortAddress(address?: string): string | undefined {
  return address ? renderShortAddress(address) : undefined;
}

function formatProtocolName(protocol: string): string {
  return protocol
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function protocolSubtitle(item: ActivityListItem): string | undefined {
  const rawData =
    item.raw?.type === 'apiEvmTransaction' ? item.raw.data : undefined;
  const protocol = rawData?.transactionProtocol;

  if (
    !protocol ||
    protocol === 'GENERIC' ||
    protocol === 'GNOSIS_SAFE' ||
    protocol === 'ERC_20'
  ) {
    return undefined;
  }

  return formatProtocolName(protocol);
}

function statusTitle(
  item: ActivityListItem,
  titles: {
    success: string;
    pending?: string;
    failed?: string;
    cancelled?: string;
  },
): string {
  if (item.status === 'pending') return titles.pending ?? titles.success;
  if (item.status === 'failed')
    return titles.failed ?? strings('transaction.failed');
  if (item.status === 'cancelled') {
    return titles.cancelled ?? strings('transaction.cancelled');
  }
  return titles.success;
}

const ACTIVITY_FALLBACK_TITLE_RESOLVERS: Partial<
  Record<ActivityKind, () => string>
> = {
  predictionsAddFunds: () => strings('transactions.tx_review_predict_deposit'),
  predictionsWithdrawFunds: () =>
    strings('transactions.tx_review_predict_withdraw'),
  predictionClaimWinnings: () =>
    strings('transactions.tx_review_predict_claim'),
  predictionCashedOut: () =>
    strings('transactions.activity_prediction_cashed_out'),
  predictionPlaced: () => strings('transactions.activity_prediction_placed'),
  perpsAddFunds: () => strings('transactions.tx_review_perps_deposit'),
  perpsWithdraw: () => strings('transactions.tx_review_perps_withdraw'),
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
};

function resolveFallbackTitle(type: ActivityKind): string {
  return (
    ACTIVITY_FALLBACK_TITLE_RESOLVERS[type]?.() ??
    strings('transactions.interaction')
  );
}

function uniqueTokens(tokens: (TokenAmount | undefined)[]): TokenAmount[] {
  const seen = new Set<string>();
  const result: TokenAmount[] = [];

  for (const token of tokens) {
    if (!token?.symbol && !token?.assetId) continue;
    const key = token.assetId ?? token.symbol ?? '';
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(token);
  }

  return result;
}

function enrichStablecoinTokenMetadata(
  token: TokenAmount | undefined,
  chainId: string | undefined,
): TokenAmount | undefined {
  const hexChainId = getHexChainId(chainId);
  const isMusd =
    token?.symbol === MUSD_TOKEN.symbol &&
    Boolean(hexChainId && MUSD_TOKEN_ADDRESS_BY_CHAIN[hexChainId]);

  if (!token || !isMusd || !hexChainId) {
    return token;
  }

  return {
    ...token,
    decimals: token.decimals ?? MUSD_DECIMALS,
    assetId: token.assetId ?? MUSD_TOKEN_ASSET_ID_BY_CHAIN[hexChainId],
  };
}

function areSameDisplayToken(
  sourceToken: TokenAmount | undefined,
  destinationToken: TokenAmount | undefined,
): boolean {
  if (!sourceToken || !destinationToken) {
    return false;
  }

  if (sourceToken.symbol && destinationToken.symbol) {
    return sourceToken.symbol === destinationToken.symbol;
  }

  return Boolean(
    sourceToken.assetId &&
      destinationToken.assetId &&
      sourceToken.assetId === destinationToken.assetId,
  );
}

function resolveAvatarTokens(
  item: ActivityListItem,
  bridgeHistoryItem?: BridgeHistoryItem,
): TokenAmount[] {
  if (
    item.type === 'swap' ||
    item.type === 'convert' ||
    item.type === 'wrap' ||
    item.type === 'unwrap'
  ) {
    return [
      enrichStablecoinTokenMetadata(item.data.sourceToken, item.chainId),
      enrichStablecoinTokenMetadata(item.data.destinationToken, item.chainId),
    ].filter((token): token is TokenAmount =>
      Boolean(token?.symbol || token?.assetId),
    );
  }

  if (item.type === 'bridge') {
    const bridgeQuoteTokens = getBridgeQuoteTokens(bridgeHistoryItem);
    const sourceToken = enrichStablecoinTokenMetadata(
      bridgeQuoteTokens.sourceToken ?? item.data.sourceToken,
      item.chainId,
    );
    const destinationToken = enrichStablecoinTokenMetadata(
      bridgeQuoteTokens.destinationToken ?? item.data.destinationToken,
      item.chainId,
    );

    return sourceToken &&
      destinationToken &&
      !areSameDisplayToken(sourceToken, destinationToken)
      ? [sourceToken, destinationToken]
      : uniqueTokens([sourceToken]);
  }

  if (item.type === 'lendingDeposit' || item.type === 'lendingWithdrawal') {
    return uniqueTokens([
      enrichStablecoinTokenMetadata(
        item.data.destinationToken ?? item.data.sourceToken,
        item.chainId,
      ),
    ]);
  }

  const { data } = item;
  return uniqueTokens([
    'sourceToken' in data
      ? enrichStablecoinTokenMetadata(data.sourceToken, item.chainId)
      : undefined,
    'destinationToken' in data
      ? enrichStablecoinTokenMetadata(data.destinationToken, item.chainId)
      : undefined,
    'token' in data
      ? enrichStablecoinTokenMetadata(data.token, item.chainId)
      : undefined,
  ]);
}

function isNamelessNftToken(token: TokenAmount | undefined): boolean {
  return Boolean(token?.amount && !token.symbol && !token.assetId);
}

function resolveCoreContent(
  item: ActivityListItem,
  bridgeHistoryItem?: BridgeHistoryItem,
): Omit<
  ActivityListItemRowContent,
  'avatarTokens' | 'primaryAmount' | 'secondaryAmount'
> {
  switch (item.type) {
    case 'send':
    case 'receive': {
      const token = item.data.token;
      const symbol = token?.symbol ?? '';
      const address = item.type === 'receive' ? item.data.from : item.data.to;
      const label = item.type === 'receive' ? 'Received' : 'Sent';
      const pendingLabel = item.type === 'receive' ? 'Receiving' : 'Sending';
      const failedLabel =
        item.type === 'receive' ? 'Receive failed' : 'Send failed';
      const subtitlePrefix = item.type === 'receive' ? 'From' : 'To';

      return {
        title: statusTitle(item, {
          success: withOptionalSymbol(label, symbol),
          pending: withOptionalSymbol(pendingLabel, symbol),
          failed: failedLabel,
        }),
        subtitle: `${subtitlePrefix}: ${shortAddress(address) ?? strings('transactions.unavailable')}`,
        primaryToken: token,
      };
    }
    case 'swap': {
      const { sourceToken, destinationToken } = item.data;
      const sourceSymbol = sourceToken?.symbol ?? '';
      const destinationSymbol = destinationToken?.symbol ?? '';

      return {
        title: statusTitle(item, {
          success:
            sourceSymbol && destinationSymbol
              ? `Swapped ${sourceSymbol} to ${destinationSymbol}`
              : strings('transactions.swaps_transaction'),
          pending:
            sourceSymbol && destinationSymbol
              ? `Swapping ${sourceSymbol} to ${destinationSymbol}`
              : strings('transactions.swap'),
          failed: 'Swap failed',
        }),
        subtitle: protocolSubtitle(item),
        primaryToken: destinationToken,
        secondaryToken: sourceToken,
      };
    }
    case 'swapIncomplete': {
      const { sourceToken } = item.data;
      return {
        title: statusTitle(item, {
          success: withOptionalSymbol('Swapped', sourceToken?.symbol),
          pending: withOptionalSymbol('Swapping', sourceToken?.symbol),
          failed: 'Swap failed',
        }),
        subtitle: protocolSubtitle(item),
        primaryToken: sourceToken,
      };
    }
    case 'wrap':
    case 'unwrap':
    case 'convert': {
      const { sourceToken, destinationToken } = item.data;
      const symbol = destinationToken?.symbol ?? sourceToken?.symbol;
      const successTitle =
        item.type === 'wrap'
          ? 'Wrapped'
          : item.type === 'unwrap'
            ? 'Unwrapped'
            : 'Converted';
      const pendingTitle =
        item.type === 'wrap'
          ? 'Wrapping'
          : item.type === 'unwrap'
            ? 'Unwrapping'
            : 'Converting';

      return {
        title: statusTitle(item, {
          success: withOptionalSymbol(successTitle, symbol),
          pending: withOptionalSymbol(pendingTitle, symbol),
          failed:
            item.type === 'wrap'
              ? 'Wrap failed'
              : item.type === 'unwrap'
                ? 'Unwrap failed'
                : 'Conversion failed',
        }),
        subtitle: tokenPairSubtitle(sourceToken, destinationToken),
        primaryToken: destinationToken,
        secondaryToken: sourceToken,
      };
    }
    case 'bridge': {
      const bridgeQuoteTokens = getBridgeQuoteTokens(bridgeHistoryItem);
      const sourceToken =
        bridgeQuoteTokens.sourceToken ?? item.data.sourceToken;
      const destinationToken =
        bridgeQuoteTokens.destinationToken ?? item.data.destinationToken;
      const sourceSymbol = sourceToken?.symbol;
      const destinationSymbol = destinationToken?.symbol;
      const isSourceOnlyApiBridge =
        !bridgeHistoryItem && sourceToken && !destinationToken;
      const isCrossTokenBridge =
        sourceSymbol && destinationSymbol && sourceSymbol !== destinationSymbol;
      const subtitle =
        bridgeRouteSubtitle(bridgeHistoryItem) ??
        (isCrossTokenBridge
          ? tokenPairSubtitle(sourceToken, destinationToken)
          : undefined);

      return {
        title: statusTitle(item, {
          success: isSourceOnlyApiBridge
            ? withOptionalSymbol('Sent', sourceSymbol)
            : isCrossTokenBridge
              ? 'Swapped'
              : withOptionalSymbol(
                  'Bridged',
                  destinationSymbol ?? sourceSymbol,
                ),
          pending: isSourceOnlyApiBridge
            ? withOptionalSymbol('Sending', sourceSymbol)
            : withOptionalSymbol('Bridging', destinationSymbol ?? sourceSymbol),
          failed: isSourceOnlyApiBridge ? 'Send failed' : 'Bridge failed',
        }),
        subtitle,
        primaryToken: sourceToken,
        secondaryToken: destinationToken,
      };
    }
    case 'buy':
    case 'sell':
    case 'claim':
    case 'deposit': {
      const token = item.data.token;
      const symbol = token?.symbol;
      const isNamelessNftBuy = item.type === 'buy' && isNamelessNftToken(token);
      const labels =
        item.type === 'buy'
          ? { success: 'Bought', pending: 'Buying', failed: 'Buy failed' }
          : item.type === 'sell'
            ? { success: 'Sold', pending: 'Selling', failed: 'Sell failed' }
            : item.type === 'claim'
              ? {
                  success: 'Claimed',
                  pending: 'Claiming',
                  failed: 'Claim failed',
                }
              : {
                  success: 'Deposited',
                  pending: 'Depositing',
                  failed: 'Deposit failed',
                };

      return {
        title: statusTitle(item, {
          success: withOptionalSymbol(
            labels.success,
            isNamelessNftBuy ? 'NFT' : symbol,
          ),
          pending: withOptionalSymbol(
            labels.pending,
            isNamelessNftBuy ? 'NFT' : symbol,
          ),
          failed: labels.failed,
        }),
        subtitle: protocolSubtitle(item),
        primaryToken: isNamelessNftBuy ? undefined : token,
      };
    }
    case 'claimMusdBonus':
      return {
        title: statusTitle(item, {
          success: strings('transactions.activity_claim_musd_bonus'),
          pending: 'Claiming mUSD bonus',
          failed: 'Claim failed',
        }),
        primaryToken: item.data.token,
      };
    case 'approveSpendingCap':
    case 'increaseSpendingCap':
    case 'revokeSpendingCap': {
      const token = item.data.token;
      const title =
        item.type === 'approveSpendingCap'
          ? 'Approved spending cap'
          : item.type === 'increaseSpendingCap'
            ? 'Increased spending cap'
            : strings('transactions.activity_revoke_spending_cap');

      return {
        title: statusTitle(item, {
          success: title,
          pending:
            item.type === 'approveSpendingCap'
              ? 'Approving spending cap'
              : item.type === 'increaseSpendingCap'
                ? 'Increasing spending cap'
                : 'Revoking spending cap',
          failed:
            item.type === 'approveSpendingCap'
              ? 'Approval failed'
              : item.type === 'increaseSpendingCap'
                ? 'Increase failed'
                : 'Revoke failed',
        }),
        subtitle: token?.symbol,
        primaryToken: token?.amount ? token : undefined,
      };
    }
    case 'lendingDeposit':
    case 'lendingWithdrawal': {
      const { sourceToken, destinationToken } = item.data;
      const primaryToken =
        destinationToken?.amount !== undefined
          ? destinationToken
          : sourceToken?.amount !== undefined
            ? sourceToken
            : (destinationToken ?? sourceToken);

      return {
        title: statusTitle(item, {
          success: withOptionalSymbol(
            item.type === 'lendingDeposit'
              ? strings('transactions.tx_review_lending_deposit')
              : strings('transactions.tx_review_lending_withdraw'),
            primaryToken?.symbol,
          ),
          failed:
            item.type === 'lendingDeposit'
              ? 'Deposit failed'
              : 'Withdrawal failed',
        }),
        subtitle: protocolSubtitle(item),
        primaryToken,
        secondaryToken:
          primaryToken === destinationToken ? sourceToken : destinationToken,
      };
    }
    case 'nftMint':
      return {
        title: statusTitle(item, {
          success: withOptionalSymbol(
            strings('transactions.activity_nft_mint'),
            item.data.token?.symbol,
          ),
          pending: withOptionalSymbol(
            'Minting',
            item.data.token?.symbol ?? 'NFT',
          ),
          failed: 'Mint failed',
        }),
        primaryToken: item.data.token,
      };
    case 'contractInteraction':
      return {
        title: statusTitle(item, {
          success: strings('transactions.smart_contract_interaction'),
          pending: 'Interaction in progress',
          failed: 'Interaction failed',
        }),
        subtitle:
          protocolSubtitle(item) ??
          (item.data.to ? `With ${shortAddress(item.data.to)}` : undefined),
        primaryToken: item.data.token,
      };
    case 'contractDeployment':
      return {
        title: statusTitle(item, {
          success: strings('transactions.tx_review_contract_deployment'),
          pending: 'Deploying contract',
          failed: 'Deployment failed',
        }),
      };
    case 'smartAccountUpgrade':
      return {
        title: statusTitle(item, {
          success: 'Smart account upgraded',
          pending: 'Upgrading smart account',
          failed: 'Upgrade failed',
        }),
        subtitle: item.data.to
          ? `Account ${shortAddress(item.data.to)}`
          : undefined,
        primaryToken: item.data.token,
      };
    default:
      return {
        title: resolveFallbackTitle(item.type),
        subtitle: protocolSubtitle(item),
        primaryToken: 'token' in item.data ? item.data.token : undefined,
      };
  }
}

export function resolveActivityListItemTitle(
  item: ActivityListItem,
  titleOverride?: string,
): string {
  return titleOverride ?? resolveCoreContent(item).title;
}

function resolveAmount(
  token: TokenAmount | undefined,
  activityType: ActivityListItem['type'],
): string | undefined {
  if (!token) return undefined;

  const humanAmount = getHumanReadableTokenAmount(token);
  if (humanAmount === undefined) return undefined;

  const displayAmount = formatTokenQuantity(humanAmount);
  const amount = token.symbol
    ? `${displayAmount} ${token.symbol}`
    : displayAmount;
  const isSpendingCapActivity =
    activityType === 'approveSpendingCap' ||
    activityType === 'increaseSpendingCap' ||
    activityType === 'revokeSpendingCap';
  const signPrefix = getDisplaySignPrefix(token.direction, {
    showPlus: !isSpendingCapActivity && shouldShowPlusSign(activityType),
  });

  return isSpendingCapActivity ? amount : applyDisplaySign(amount, signPrefix);
}

function shouldUsePrimaryFiatFallback(
  itemType: ActivityListItem['type'],
  secondaryToken: TokenAmount | undefined,
) {
  if (secondaryToken) {
    return false;
  }

  return !['swap', 'bridge', 'wrap', 'unwrap', 'convert'].includes(itemType);
}

function formatTokenQuantity(amount: string): string {
  const value = Number(amount);
  const absoluteValue = Math.abs(value);

  if (!Number.isFinite(value)) return amount;
  if (value === 0) return '0';

  if (absoluteValue < 0.00001) {
    return '<0.00001';
  }

  if (absoluteValue < 1) {
    return new Intl.NumberFormat(undefined, {
      minimumSignificantDigits: 1,
      maximumSignificantDigits: 4,
    }).format(value);
  }

  if (absoluteValue < 1000000) {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(value);
  }

  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function getHexChainId(chainId: string | undefined): Hex | undefined {
  if (!chainId) return undefined;
  if (chainId.startsWith('0x')) return chainId as Hex;

  const [, decimalChainId] = chainId.split(':');
  if (!decimalChainId) return undefined;

  const parsedChainId = Number.parseInt(decimalChainId, 10);
  return Number.isNaN(parsedChainId)
    ? undefined
    : (`0x${parsedChainId.toString(16)}` as Hex);
}

function isNativeAsset(token: TokenAmount): boolean {
  return Boolean(
    token.assetId?.includes('/slip44:') || token.assetId?.includes('/native:'),
  );
}

function getMusdMarketRateToken(
  token: TokenAmount,
  hexChainId: Hex,
): MarketRateLookupToken | undefined {
  if (
    token.symbol !== MUSD_TOKEN.symbol ||
    !MUSD_TOKEN_ADDRESS_BY_CHAIN[hexChainId]
  ) {
    return undefined;
  }

  return {
    address: MUSD_TOKEN_ADDRESS_BY_CHAIN[hexChainId].toLowerCase(),
    symbol: MUSD_TOKEN.symbol,
    decimals: token.decimals ?? MUSD_DECIMALS,
    chainId: hexChainId,
  };
}

function getMusdNativeExchangeRate({
  usdConversionRate,
}: {
  usdConversionRate: number | null | undefined;
}): number | undefined {
  if (!usdConversionRate) {
    return undefined;
  }

  return 1 / usdConversionRate;
}

/**
 * Looks up a token's market `price` from contractExchangeRates. Market data is
 * keyed by checksummed addresses, but the lookup address is lowercased (CAIP
 * asset references are normalized to lowercase), so try the checksum first and
 * fall back to a case-insensitive match. Mirrors `getTokenToEthPrice` in
 * `Money/utils/moneyActivityFiat`.
 */
function getMarketPriceForAddress(
  contractExchangeRates:
    | Record<string, { price?: number | null } | undefined>
    | undefined,
  address: string,
): number | null | undefined {
  if (!contractExchangeRates) return undefined;

  const checksum = safeToChecksumAddress(address);
  if (checksum) {
    const price = contractExchangeRates[checksum]?.price;
    if (price !== undefined && price !== null) return price;
  }

  const lower = address.toLowerCase();
  const key = Object.keys(contractExchangeRates).find(
    (k) => k.toLowerCase() === lower,
  );
  return key !== undefined ? contractExchangeRates[key]?.price : undefined;
}

function resolveFiatAmount({
  activityType,
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  hexChainId,
  token,
  usdConversionRate,
}: {
  activityType: ActivityListItem['type'];
  contractExchangeRates:
    | Record<string, { price?: number | null } | undefined>
    | undefined;
  conversionRate: number | null | undefined;
  currentCurrency: string | undefined;
  hexChainId: Hex | undefined;
  token: TokenAmount | undefined;
  usdConversionRate: number | null | undefined;
}): string | undefined {
  if (!token || !currentCurrency || !hexChainId) return undefined;

  const humanAmount = getHumanReadableTokenAmount(token);
  if (humanAmount === undefined) return undefined;

  const lookupToken =
    toMarketRateLookupToken(token, hexChainId) ??
    getMusdMarketRateToken(token, hexChainId);
  const exchangeRate = isNativeAsset(token)
    ? 1
    : lookupToken
      ? (getMarketPriceForAddress(contractExchangeRates, lookupToken.address) ??
        (lookupToken.symbol === MUSD_TOKEN.symbol
          ? getMusdNativeExchangeRate({ usdConversionRate })
          : undefined))
      : undefined;

  if (!conversionRate || !exchangeRate) return undefined;

  const fiatAmount = renderFiat(
    balanceToFiatNumber(
      Number.parseFloat(humanAmount),
      conversionRate,
      exchangeRate,
    ),
    currentCurrency as Parameters<typeof renderFiat>[1],
    2,
  );

  if (!fiatAmount) return undefined;

  const signPrefix = getDisplaySignPrefix(token.direction, {
    showPlus: shouldShowPlusSign(activityType),
  });

  return applyDisplaySign(fiatAmount, signPrefix);
}

export function useActivityListItemRowContent(
  item: ActivityListItem,
  chainId?: string,
  bridgeHistoryItem?: BridgeHistoryItem,
): ActivityListItemRowContent {
  const networkChainId = chainId ?? item.chainId;
  const hexChainId = getHexChainId(networkChainId);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector((state: RootState) =>
    hexChainId
      ? selectConversionRateByChainId(state, hexChainId, true)
      : undefined,
  );
  const contractExchangeRates = useSelector((state: RootState) =>
    hexChainId
      ? selectContractExchangeRatesByChainId(state, hexChainId)
      : undefined,
  );
  const usdConversionRate = useSelector((state: RootState) =>
    hexChainId
      ? selectUSDConversionRateByChainId(state, hexChainId)
      : undefined,
  );

  const content = resolveCoreContent(item, bridgeHistoryItem);
  const primaryToken = enrichStablecoinTokenMetadata(
    content.primaryToken,
    networkChainId,
  );
  const secondaryToken = enrichStablecoinTokenMetadata(
    content.secondaryToken,
    networkChainId,
  );
  const primaryAmount = resolveAmount(primaryToken, item.type);
  const resolvedSecondaryAmount = resolveAmount(secondaryToken, item.type);
  const secondaryFiatAmount = resolveFiatAmount({
    activityType: item.type,
    contractExchangeRates,
    conversionRate,
    currentCurrency,
    hexChainId,
    token: secondaryToken,
    usdConversionRate,
  });
  const primaryFiatAmount = shouldUsePrimaryFiatFallback(
    item.type,
    secondaryToken,
  )
    ? resolveFiatAmount({
        activityType: item.type,
        contractExchangeRates,
        conversionRate,
        currentCurrency,
        hexChainId,
        token: primaryToken,
        usdConversionRate,
      })
    : undefined;
  const secondaryAmount =
    resolvedSecondaryAmount ?? secondaryFiatAmount ?? primaryFiatAmount;

  return {
    ...content,
    avatarTokens: resolveAvatarTokens(item, bridgeHistoryItem),
    primaryToken,
    secondaryToken,
    primaryAmount,
    secondaryAmount,
  };
}
