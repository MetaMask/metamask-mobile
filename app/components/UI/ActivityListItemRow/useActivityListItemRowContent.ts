import type { Hex } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { strings } from '../../../../locales/i18n';
import { RootState } from '../../../reducers';
import {
  selectConversionRateByChainId,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectContractExchangeRatesByChainId } from '../../../selectors/tokenRatesController';
import { renderShortAddress } from '../../../util/address';
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

function resolveAvatarTokens(item: ActivityListItem): TokenAmount[] {
  const { data } = item;
  return uniqueTokens([
    'sourceToken' in data ? data.sourceToken : undefined,
    'destinationToken' in data ? data.destinationToken : undefined,
    'token' in data ? data.token : undefined,
  ]);
}

function resolveCoreContent(
  item: ActivityListItem,
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
      const { sourceToken, destinationToken } = item.data;
      const sourceSymbol = sourceToken?.symbol;
      const destinationSymbol = destinationToken?.symbol;
      const isCrossTokenBridge =
        sourceSymbol && destinationSymbol && sourceSymbol !== destinationSymbol;

      return {
        title: statusTitle(item, {
          success: isCrossTokenBridge
            ? 'Swapped'
            : withOptionalSymbol('Bridged', destinationSymbol ?? sourceSymbol),
          pending: withOptionalSymbol(
            'Bridging',
            destinationSymbol ?? sourceSymbol,
          ),
          failed: 'Bridge failed',
        }),
        subtitle: isCrossTokenBridge
          ? tokenPairSubtitle(sourceToken, destinationToken)
          : undefined,
        primaryToken: destinationToken ?? sourceToken,
        secondaryToken: destinationToken ? sourceToken : undefined,
      };
    }
    case 'buy':
    case 'sell':
    case 'claim':
    case 'deposit': {
      const token = item.data.token;
      const symbol = token?.symbol;
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
          success: withOptionalSymbol(labels.success, symbol),
          pending: withOptionalSymbol(labels.pending, symbol),
          failed: labels.failed,
        }),
        subtitle: protocolSubtitle(item),
        primaryToken: token,
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
  const signPrefix = getDisplaySignPrefix(token.direction, {
    showPlus: shouldShowPlusSign(activityType),
  });

  return applyDisplaySign(amount, signPrefix);
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

function resolveFiatAmount({
  activityType,
  contractExchangeRates,
  conversionRate,
  currentCurrency,
  hexChainId,
  token,
}: {
  activityType: ActivityListItem['type'];
  contractExchangeRates:
    | Record<string, { price?: number | null } | undefined>
    | undefined;
  conversionRate: number | null | undefined;
  currentCurrency: string | undefined;
  hexChainId: Hex | undefined;
  token: TokenAmount | undefined;
}): string | undefined {
  if (!token || !currentCurrency || !hexChainId) return undefined;

  const humanAmount = getHumanReadableTokenAmount(token);
  if (humanAmount === undefined) return undefined;

  const lookupToken = toMarketRateLookupToken(token, hexChainId);
  const exchangeRate = isNativeAsset(token)
    ? 1
    : lookupToken
      ? (contractExchangeRates?.[lookupToken.address]?.price ?? undefined)
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

  const content = resolveCoreContent(item);
  const primaryAmount = resolveAmount(content.primaryToken, item.type);
  const secondaryAmount =
    resolveAmount(content.secondaryToken, item.type) ??
    resolveFiatAmount({
      activityType: item.type,
      contractExchangeRates,
      conversionRate,
      currentCurrency,
      hexChainId,
      token: content.primaryToken,
    });

  return {
    ...content,
    avatarTokens: resolveAvatarTokens(item),
    primaryAmount,
    secondaryAmount,
  };
}
