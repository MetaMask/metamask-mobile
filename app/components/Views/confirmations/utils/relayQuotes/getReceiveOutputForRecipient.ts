import { BigNumber } from 'bignumber.js';
import {
  TransactionPayQuote,
  TransactionPayStrategy,
} from '@metamask/transaction-pay-controller';
import { Json } from '@metamask/utils';

export interface ReceiveOutputForRecipient {
  amount: string;
  symbol: string;
  tokenAddress?: string;
  decimals?: number;
}

interface RelayCurrency {
  address?: string;
  symbol?: string;
  decimals?: number;
}

interface RelayCurrencyAmount {
  currency?: RelayCurrency;
  amount?: string;
  amountFormatted?: string;
}

interface RelayQuoteDetails {
  recipient?: string;
  currencyOut?: RelayCurrencyAmount;
}

interface RelayQuote {
  details?: RelayQuoteDetails;
}

function formatAmountFromRawAmount({
  rawAmount,
  decimals,
}: {
  rawAmount: string;
  decimals: number;
}): string | undefined {
  if (!rawAmount) return undefined;

  const divisor = new BigNumber(10).pow(decimals);

  return new BigNumber(rawAmount).dividedBy(divisor).toString(10);
}

function getRelayQuoteDetails(
  quote: TransactionPayQuote<Json>,
): RelayQuoteDetails | undefined {
  const original = quote?.original as unknown as
    | { details?: RelayQuoteDetails; quote?: RelayQuote }
    | undefined;

  return original?.details;
}

/**
 * Attempts to find the Relay quote output (currencyOut) for a given recipient address.
 *
 * Returns `undefined` when:
 * - quotes are missing
 * - recipientAddress is missing
 * - there is no Relay quote whose `details.recipient` matches recipientAddress
 * - required currencyOut fields are missing
 */
export function getReceiveOutputForRecipient({
  quotes,
  recipientAddress,
}: {
  quotes?: TransactionPayQuote<Json>[];
  recipientAddress?: string;
}): ReceiveOutputForRecipient | undefined {
  if (!recipientAddress) return undefined;

  const normalizedRecipientAddress = recipientAddress.toLowerCase();

  for (const quote of quotes ?? []) {
    if (!quote || quote.strategy !== TransactionPayStrategy.Relay) {
      continue;
    }

    const details = getRelayQuoteDetails(quote);
    const quoteRecipient = details?.recipient;

    if (
      typeof quoteRecipient !== 'string' ||
      quoteRecipient.toLowerCase() !== normalizedRecipientAddress
    ) {
      continue;
    }

    const currencyOut = details?.currencyOut;
    const symbol = currencyOut?.currency?.symbol;

    if (typeof symbol !== 'string' || symbol.length === 0) {
      continue;
    }

    const amountFormatted = currencyOut?.amountFormatted;
    const rawAmount = currencyOut?.amount;
    const decimals = currencyOut?.currency?.decimals;

    const amount =
      typeof amountFormatted === 'string' && amountFormatted.length > 0
        ? amountFormatted
        : typeof rawAmount === 'string' && typeof decimals === 'number'
          ? formatAmountFromRawAmount({ rawAmount, decimals })
          : undefined;

    if (typeof amount !== 'string' || amount.length === 0) {
      continue;
    }

    return {
      amount,
      symbol,
      tokenAddress: currencyOut?.currency?.address,
      decimals: currencyOut?.currency?.decimals,
    };
  }

  return undefined;
}
