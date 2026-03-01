import { TransactionPayStrategy } from '@metamask/transaction-pay-controller';
import { useTransactionPayQuotes } from './useTransactionPayData';

/*
 * Hook that returns the crypto amount that will be paid out to user account after fiat payment is completed for the current quote.
 */
export function useTransactionPayFiatAmountOut(): {
  amountHuman: string | null;
  amountRaw: string | null;
  hasFiatQuote: boolean;
} {
  const quotes = useTransactionPayQuotes();
  const fiatQuote = quotes?.find(
    (quote) => quote.strategy === TransactionPayStrategy.Fiat,
  );

  return {
    amountHuman: fiatQuote?.sourceAmount.human ?? null,
    amountRaw: fiatQuote?.sourceAmount.raw ?? null,
    hasFiatQuote: Boolean(fiatQuote),
  };
}
