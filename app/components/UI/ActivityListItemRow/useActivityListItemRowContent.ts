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
import { useTokensData } from '../../hooks/useTokensData/useTokensData';
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
  enrichTokenFromApi,
  getDisplaySignPrefix,
  getHumanReadableTokenAmount,
  isFailedOrCancelledTransfer,
  isUnlimitedApprovalAmount,
  shouldShowPlusSign,
  type TokenAmount,
  toMarketRateLookupToken,
} from '../../../util/activity-adapters';
import type { MarketRateLookupToken } from '../../../util/activity-adapters/fiat';
import {
  addCurrencySymbol,
  balanceToFiatNumber,
  renderFiat,
} from '../../../util/number/bigint';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import type { ActivityListItemRowContent } from './ActivityListItemRow.types';
import {
  ACTIVITY_FALLBACK_TITLE_RESOLVERS,
  TOKEN_ACTION_LABELS,
} from './titleLabels';

function isPerpsFundsKind(type: ActivityKind): boolean {
  return type === 'perpsAddFunds' || type === 'perpsWithdraw';
}

function isPerpsFundingKind(type: ActivityKind): boolean {
  return type === 'perpsPaidFundingFees' || type === 'perpsReceivedFundingFees';
}

/**
 * Perps trade fills, whose amount is realized PnL (gains green, losses red).
 * Excludes orders, funds, and funding — they show a notional and stay neutral.
 */
function isPerpsPnlKind(type: ActivityKind): boolean {
  return (
    type.startsWith('perps') &&
    !isPerpsFundsKind(type) &&
    !isPerpsFundingKind(type)
  );
}

function isPerpsTradeKind(type: ActivityKind): boolean {
  return (
    isPerpsPnlKind(type) ||
    type.startsWith('market') ||
    type.startsWith('limit') ||
    type.startsWith('stopMarket')
  );
}

function isPerpsMarketAvatarKind(type: ActivityKind): boolean {
  return isPerpsTradeKind(type) || isPerpsFundingKind(type);
}

function isPredictTradeKind(type: ActivityKind): boolean {
  return (
    type === 'predictionPlaced' ||
    type === 'predictionCashedOut' ||
    type === 'predictionClaimWinnings'
  );
}

function isPredictFundsKind(type: ActivityKind): boolean {
  return type === 'predictionsAddFunds' || type === 'predictionsWithdrawFunds';
}

function isDomainFundsKind(type: ActivityKind): boolean {
  return isPerpsFundsKind(type) || isPredictFundsKind(type);
}

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

function perpsPositionSubtitle(item: ActivityListItem): string | undefined {
  const sourceToken =
    'sourceToken' in item.data ? item.data.sourceToken : undefined;
  if (!sourceToken?.symbol) {
    return undefined;
  }
  const displaySymbol = getPerpsDisplaySymbol(sourceToken.symbol);
  if (sourceToken.amount === undefined) {
    return displaySymbol;
  }
  return `${formatTokenQuantity(sourceToken.amount)} ${displaySymbol}`;
}

function getPredictActivity(item: ActivityListItem) {
  return item.raw?.type === 'predictActivity' ? item.raw.data : undefined;
}

function predictMarketSubtitle(item: ActivityListItem): string | undefined {
  return getPredictActivity(item)?.title;
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
    return titles.cancelled ?? strings('transaction.canceled');
  }
  return titles.success;
}

// Domain (perps/predict) rows have no bespoke failed copy, so mark a
// failed/cancelled status with an em-dash "—Failed" suffix, mirroring the perps
// severity suffix style (e.g. "Closed short—liquidated"). The failed color is
// applied separately by the row layout.
function withDomainStatusSuffix(
  title: string,
  status: ActivityListItem['status'],
): string {
  if (status === 'failed') {
    return `${title} — ${strings('transaction.failed')}`;
  }
  if (status === 'cancelled') {
    return `${title} — ${strings('transaction.canceled')}`;
  }
  return title;
}

function resolveFallbackTitle(item: ActivityListItem): string {
  const base =
    ACTIVITY_FALLBACK_TITLE_RESOLVERS[item.type]?.() ??
    strings('transactions.interaction');
  return withDomainStatusSuffix(base, item.status);
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

function isSpendingCapKind(type: ActivityKind): boolean {
  return (
    type === 'approveSpendingCap' ||
    type === 'increaseSpendingCap' ||
    type === 'revokeSpendingCap'
  );
}

/**
 * Fills a spending-cap token's missing symbol/decimals from the tokens API
 * and re-derives the "unlimited" flag now that decimals are known,
 * so the cap renders as e.g. "Unlimited USDC" / "50,000 USDC".
 */
function enrichSpendingCapToken(
  token: TokenAmount | undefined,
  listToken: { symbol?: string; decimals?: number } | undefined,
): TokenAmount | undefined {
  if (!token) {
    return token;
  }
  const symbol = token.symbol ?? listToken?.symbol;
  const decimals = token.decimals ?? listToken?.decimals;
  const isUnlimitedApproval =
    token.amount !== undefined
      ? isUnlimitedApprovalAmount(token.amount, decimals)
      : token.isUnlimitedApproval;
  return {
    ...token,
    ...(symbol ? { symbol } : {}),
    ...(decimals === undefined ? {} : { decimals }),
    ...(isUnlimitedApproval ? { isUnlimitedApproval: true } : {}),
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

  if (isPerpsMarketAvatarKind(item.type)) {
    const market =
      'sourceToken' in item.data ? item.data.sourceToken : undefined;
    return market?.symbol ? [market] : [];
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
      const cancelledLabel =
        item.type === 'receive' ? 'Receive cancelled' : 'Send cancelled';
      const subtitlePrefix = item.type === 'receive' ? 'From' : 'To';

      return {
        title: statusTitle(item, {
          success: withOptionalSymbol(label, symbol),
          pending: withOptionalSymbol(pendingLabel, symbol),
          failed: failedLabel,
          cancelled: cancelledLabel,
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
    case 'stake':
    case 'unstake':
    case 'deposit': {
      const token = item.data.token;
      const symbol = token?.symbol;
      const isNamelessNftBuy = item.type === 'buy' && isNamelessNftToken(token);
      // Pooled staking is ETH-only, so stake/unstake read the full asset name
      // ("Staked Ethereum" / "Unstaked Ethereum") rather than the "ETH" symbol.
      const isStakingKind = item.type === 'stake' || item.type === 'unstake';
      let displayNoun = symbol;
      if (isStakingKind) {
        displayNoun = 'Ethereum';
      } else if (isNamelessNftBuy) {
        displayNoun = 'NFT';
      }
      const labels = TOKEN_ACTION_LABELS[item.type];

      return {
        title: statusTitle(item, {
          success: withOptionalSymbol(labels.success, displayNoun),
          pending: withOptionalSymbol(labels.pending, displayNoun),
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
    case 'nftBuy':
    case 'nftSell': {
      const nftName = item.data.token?.symbol ?? 'NFT';
      const labels =
        item.type === 'nftBuy'
          ? { success: 'Bought', pending: 'Buying', failed: 'Buy failed' }
          : { success: 'Sold', pending: 'Selling', failed: 'Sale failed' };

      return {
        title: statusTitle(item, {
          success: withOptionalSymbol(labels.success, nftName),
          pending: withOptionalSymbol(labels.pending, nftName),
          failed: labels.failed,
        }),
        subtitle: protocolSubtitle(item),
        primaryToken: item.data.paymentToken,
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
    case 'perpsAddFunds':
    case 'perpsWithdraw':
      return {
        title: resolveFallbackTitle(item),
        subtitle: strings('transactions.activity_perps_balance'),
        primaryToken: item.data.token,
      };
    case 'predictionsAddFunds':
    case 'predictionsWithdrawFunds':
      return {
        title: resolveFallbackTitle(item),
        subtitle: strings('transactions.activity_predictions_balance'),
        primaryToken: item.data.token,
      };
    // Predict trades: the subtitle is the market question, carried on `raw`.
    case 'predictionPlaced':
    case 'predictionCashedOut':
    case 'predictionClaimWinnings':
      return {
        title: resolveFallbackTitle(item),
        subtitle: predictMarketSubtitle(item),
        primaryToken: item.data.token,
      };
    default:
      return {
        title: resolveFallbackTitle(item),
        subtitle: perpsPositionSubtitle(item) ?? protocolSubtitle(item),
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

  const displayAmount = token.isUnlimitedApproval
    ? strings('confirm.unlimited')
    : getHumanReadableTokenAmount(token);
  if (displayAmount === undefined) {
    return undefined;
  }
  const formattedAmount = token.isUnlimitedApproval
    ? displayAmount
    : formatTokenQuantity(displayAmount);
  const amount = token.symbol
    ? `${formattedAmount} ${token.symbol}`
    : formattedAmount;
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
  if (token.isUnlimitedApproval) return undefined;

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

/**
 * Renders a USD-denominated amount (Perps/Predict positions, funding, and funds
 * balances are tracked in USD) in the user's display currency.
 *
 * `FromUsdAmount` describes the input: the value is converted to
 * `currentCurrency` whenever the rates are available. When they aren't, we can
 * only safely show the raw USD figure to a USD user — labeling a USD number with
 * another currency's symbol would be wrong — so in that case we omit it.
 */
function resolveFiatFromUsdAmount({
  token,
  conversionRate,
  usdConversionRate,
  currentCurrency,
  precise = false,
}: {
  token: TokenAmount | undefined;
  conversionRate: number | null | undefined;
  usdConversionRate: number | null | undefined;
  currentCurrency: string | undefined;
  precise?: boolean;
}): string | undefined {
  const humanAmount = token ? getHumanReadableTokenAmount(token) : undefined;
  if (!token || humanAmount === undefined) return undefined;

  const usdAmount = Number.parseFloat(humanAmount);
  const signPrefix = getDisplaySignPrefix(token.direction, { showPlus: true });

  const hasRates = Boolean(conversionRate && usdConversionRate);
  const isUsdDisplay =
    !currentCurrency || currentCurrency.toLowerCase() === 'usd';
  // Without rates we can't convert; only a USD display currency is safe to show.
  if (!hasRates && !isUsdDisplay) {
    return undefined;
  }

  const displayCurrencyCode = hasRates ? (currentCurrency ?? 'usd') : 'usd';
  // USD → display currency factor (1 when we have no rates, i.e. USD display).
  const conversionFactor =
    conversionRate && usdConversionRate
      ? conversionRate / usdConversionRate
      : 1;

  // Funding fees can be sub-cent, so the precise path keeps full precision via
  // subscript notation (addCurrencySymbol) instead of flooring + rounding to 2dp.
  const fiat = precise
    ? addCurrencySymbol(
        usdAmount * conversionFactor,
        displayCurrencyCode as Parameters<typeof addCurrencySymbol>[1],
        true,
        true,
      )
    : renderFiat(
        conversionRate && usdConversionRate
          ? balanceToFiatNumber(
              usdAmount,
              conversionRate,
              1 / usdConversionRate,
            )
          : usdAmount,
        displayCurrencyCode as Parameters<typeof renderFiat>[1],
        2,
      );

  return fiat ? applyDisplaySign(fiat, signPrefix) : undefined;
}

function fundsTokenSecondaryAmount(
  token: TokenAmount | undefined,
): string | undefined {
  const humanAmount = token ? getHumanReadableTokenAmount(token) : undefined;
  if (!token || humanAmount === undefined || !token.symbol) return undefined;

  const display = `${formatTokenQuantity(humanAmount)} ${token.symbol}`;
  return applyDisplaySign(
    display,
    getDisplaySignPrefix(token.direction, { showPlus: false }),
  );
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

  // Spending caps: resolve the token's symbol/decimals from the tokens API by
  // its asset id (mirroring the extension's ApprovalDetails), so the row/details
  // show the token avatar + cap amount instead of a generic "unknown" fallback.
  const isSpendingCap = isSpendingCapKind(item.type);
  const spendingCapAssetId =
    isSpendingCap && 'token' in item.data
      ? item.data.token?.assetId
      : undefined;
  const spendingCapTokenData = useTokensData(
    spendingCapAssetId ? [spendingCapAssetId] : [],
  );
  const spendingCapToken =
    isSpendingCap && 'token' in item.data
      ? enrichSpendingCapToken(
          item.data.token,
          spendingCapAssetId
            ? spendingCapTokenData[spendingCapAssetId.toLowerCase()]
            : undefined,
        )
      : undefined;

  const isLending =
    item.type === 'lendingDeposit' || item.type === 'lendingWithdrawal';
  const lendingAssetIds: string[] = [];
  if (isLending) {
    if (
      'destinationToken' in item.data &&
      item.data.destinationToken?.assetId
    ) {
      lendingAssetIds.push(item.data.destinationToken.assetId);
    }
    if ('sourceToken' in item.data && item.data.sourceToken?.assetId) {
      lendingAssetIds.push(item.data.sourceToken.assetId);
    }
  }
  const lendingTokenData = useTokensData(lendingAssetIds);

  const content = resolveCoreContent(item, bridgeHistoryItem);

  let basePrimaryToken: TokenAmount | undefined;
  if (isSpendingCap) {
    basePrimaryToken = spendingCapToken?.amount ? spendingCapToken : undefined;
  } else if (isLending) {
    basePrimaryToken = enrichTokenFromApi(
      content.primaryToken,
      lendingTokenData,
    );
  } else {
    basePrimaryToken = content.primaryToken;
  }
  const primaryToken = enrichStablecoinTokenMetadata(
    basePrimaryToken,
    networkChainId,
  );

  const baseSecondaryToken = isLending
    ? enrichTokenFromApi(content.secondaryToken, lendingTokenData)
    : content.secondaryToken;
  const secondaryToken = enrichStablecoinTokenMetadata(
    baseSecondaryToken,
    networkChainId,
  );
  const isPerpsFunding = isPerpsFundingKind(item.type);
  const isFundsRow = isDomainFundsKind(item.type);
  const isUsdDenominated =
    isFundsRow ||
    isPerpsTradeKind(item.type) ||
    isPerpsFunding ||
    isPredictTradeKind(item.type);
  const domainFiatAmount = isUsdDenominated
    ? resolveFiatFromUsdAmount({
        token: primaryToken,
        conversionRate,
        usdConversionRate,
        currentCurrency,
        precise: isPerpsFunding,
      })
    : undefined;

  // Non-domain fiat fallbacks (from main): token amount first, then secondary
  // fiat, then a primary fiat fallback for kinds that warrant it.
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

  const rawPrimaryAmount =
    domainFiatAmount ?? resolveAmount(primaryToken, item.type);

  const resolveRawSecondaryAmount = (): string | undefined => {
    // USD-denominated (perps/predict) rows: the token line only makes sense for
    // funds movements; other domain rows have no secondary line.
    if (domainFiatAmount) {
      return isFundsRow ? fundsTokenSecondaryAmount(primaryToken) : undefined;
    }
    // Non-domain rows: prefer the secondary token amount, then its fiat, then a
    // primary fiat fallback.
    return resolvedSecondaryAmount ?? secondaryFiatAmount ?? primaryFiatAmount;
  };

  // A failed or cancelled send/receive moved nothing, so the transfer amount
  // (surfaced from the attempted/original tx) is misleading — suppress it here
  // so every consumer of this resolver (the list row and the details amount
  // header) stays consistent.
  const suppressTransferAmount = isFailedOrCancelledTransfer(item);
  const primaryAmount = suppressTransferAmount ? undefined : rawPrimaryAmount;
  const secondaryAmount = suppressTransferAmount
    ? undefined
    : resolveRawSecondaryAmount();

  const perpsMarketSymbol = isPerpsMarketAvatarKind(item.type)
    ? 'sourceToken' in item.data
      ? item.data.sourceToken?.symbol
      : undefined
    : undefined;
  const predictIconUrl = isPredictTradeKind(item.type)
    ? getPredictActivity(item)?.icon
    : undefined;

  let avatarTokens: TokenAmount[];
  if (isSpendingCap && spendingCapToken) {
    avatarTokens = [spendingCapToken];
  } else if (isLending && primaryToken) {
    avatarTokens = [primaryToken];
  } else {
    avatarTokens = resolveAvatarTokens(item, bridgeHistoryItem);
  }

  return {
    ...content,
    avatarTokens,
    avatarIconUrl: predictIconUrl,
    perpsMarketSymbol,
    primaryToken,
    secondaryToken,
    primaryAmount,
    secondaryAmount,
    isPnlAmount: isPerpsPnlKind(item.type),
  };
}
