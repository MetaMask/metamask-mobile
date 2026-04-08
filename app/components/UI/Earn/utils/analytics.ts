import { toHex, isEqualCaseInsensitive } from '@metamask/controller-utils';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { Hex, Json } from '@metamask/utils';
import { TransactionMeta } from '@metamask/transaction-controller';
import { TransactionPayQuote } from '@metamask/transaction-pay-controller';
import type { DeepSnakeCaseKeys } from './analytics.types';

/**
 * Formats a chain ID for analytics tracking.
 *
 * For non-EVM chains (e.g., Solana), the chain ID is returned as-is.
 * For EVM chains, the chain ID is converted to hex format.
 *
 * @param chainId - The chain ID to format (can be string or number)
 * @returns The formatted chain ID string, or undefined if chainId is falsy
 */
export const formatChainIdForAnalytics = (
  chainId?: string | number,
): string | undefined => {
  if (!chainId) return undefined;

  const chainIdStr = String(chainId);
  return isNonEvmChainId(chainIdStr) ? chainIdStr : toHex(chainId);
};

const camelToSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, (ch) => `_${ch.toLowerCase()}`);

export const deepSnakeCaseKeys = <T>(obj: T): DeepSnakeCaseKeys<T> => {
  if (Array.isArray(obj)) {
    return obj.map(deepSnakeCaseKeys) as DeepSnakeCaseKeys<T>;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce(
      (acc, [key, value]) => {
        acc[camelToSnakeCase(key)] = deepSnakeCaseKeys(value);
        return acc;
      },
      {} as Record<string, unknown>,
    ) as DeepSnakeCaseKeys<T>;
  }
  return obj as DeepSnakeCaseKeys<T>;
};

export function getMusdConversionQuoteTrackingData(
  transactionMeta: TransactionMeta,
  quotes: TransactionPayQuote<Json>[],
): {
  quote_payment_chain_id?: Hex;
  quote_output_chain_id?: Hex;
  quote_is_same_chain?: boolean;
  quote_payment_token_address?: Hex;
  quote_output_token_address?: Hex;
  payment_amount_usd?: string;
  output_amount_usd?: string;
  pay_quote_strategy: string;
  selected_payment_chain_id?: Hex;
  selected_payment_chain_matches_quote_payment_chain?: boolean;
  tx_execution_chain_matches_quote_output_chain?: boolean;
  payment_token_address?: Hex;
  payment_token_chain_id?: Hex;
  output_token_address?: Hex;
  output_token_chain_id?: Hex;
} {
  const quote = quotes?.[0];
  const quoteRequest = quote?.request;

  const quotePaymentChainId = quoteRequest?.sourceChainId;
  const quoteOutputChainId = quoteRequest?.targetChainId;
  const quotePaymentTokenAddress = quoteRequest?.sourceTokenAddress;
  const quoteOutputTokenAddress = quoteRequest?.targetTokenAddress;

  const quoteIsSameChain =
    quotePaymentChainId && quoteOutputChainId
      ? isEqualCaseInsensitive(quotePaymentChainId, quoteOutputChainId)
      : undefined;

  const payQuoteStrategy = quote?.strategy
    ? String(quote.strategy).toLowerCase()
    : 'unknown';

  const paymentAmountUsd = quote?.sourceAmount?.usd;
  const outputAmountUsd = quote?.targetAmount?.usd;

  const selectedPaymentChainId = transactionMeta.metamaskPay?.chainId;
  const selectedPaymentTokenAddress = transactionMeta.metamaskPay?.tokenAddress;

  const selectedPaymentChainMatchesQuotePaymentChain =
    selectedPaymentChainId && quotePaymentChainId
      ? isEqualCaseInsensitive(selectedPaymentChainId, quotePaymentChainId)
      : undefined;

  const txExecutionChainMatchesQuoteOutputChain =
    transactionMeta?.chainId && quoteOutputChainId
      ? isEqualCaseInsensitive(transactionMeta.chainId, quoteOutputChainId)
      : undefined;

  const paymentTokenAddress =
    selectedPaymentTokenAddress ?? quotePaymentTokenAddress;
  const paymentTokenChainId = selectedPaymentChainId ?? quotePaymentChainId;

  const outputTokenAddress =
    quoteOutputTokenAddress ??
    (transactionMeta?.txParams?.to as Hex | undefined);
  const outputTokenChainId = quoteOutputChainId ?? transactionMeta?.chainId;

  return deepSnakeCaseKeys({
    quotePaymentChainId,
    quoteOutputChainId,
    quotePaymentTokenAddress,
    quoteOutputTokenAddress,
    quoteIsSameChain,
    payQuoteStrategy,
    paymentAmountUsd,
    outputAmountUsd,
    selectedPaymentChainId,
    selectedPaymentChainMatchesQuotePaymentChain,
    txExecutionChainMatchesQuoteOutputChain,
    paymentTokenAddress,
    paymentTokenChainId,
    outputTokenAddress,
    outputTokenChainId,
  });
}
