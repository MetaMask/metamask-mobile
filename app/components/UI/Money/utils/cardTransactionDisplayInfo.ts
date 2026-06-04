import BigNumber from 'bignumber.js';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import type { CardTransaction } from '../types/moneyActivity';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import { moneyFormatFiat } from './moneyFormatFiat';

/**
 * Display strings for a {@link CardTransaction} row, producing the same shape as
 * {@link MoneyTransactionDisplayInfo} so the row component can branch on `kind`
 * without two render paths.
 *
 * Card spends are always outgoing (`isIncoming: false`) and the settlement token
 * is USD-pegged (USDC today, mUSD later), so the on-chain token amount is also
 * the historic USD value — no price lookup needed. The fiat line converts that
 * USD value into the user's currency via `usdToCurrentCurrencyRate`; when no rate
 * is available it's left blank rather than shown as a misleading figure (mirrors
 * the on-chain path).
 *
 * Vendor / merchant is out of MVP scope, so `description` is intentionally
 * undefined until the Baanx enrichment seam is wired.
 */
export function cardTransactionDisplayInfo(
  card: CardTransaction,
  opts: { currentCurrency: string; usdToCurrentCurrencyRate?: number },
): MoneyTransactionDisplayInfo {
  const { currentCurrency, usdToCurrentCurrencyRate } = opts;

  const usdValue = new BigNumber(card.amount).dividedBy(
    new BigNumber(10).pow(card.token.decimals),
  );

  const primaryAmount = `-${usdValue.toFixed(2)} ${card.token.symbol}`;

  const fiatAmount =
    usdToCurrentCurrencyRate && usdToCurrentCurrencyRate > 0
      ? `-${moneyFormatFiat(usdValue.times(usdToCurrentCurrencyRate), currentCurrency)}`
      : '';

  return {
    label: strings('money.transaction.card_transaction'),
    description: undefined,
    primaryAmount,
    fiatAmount,
    isIncoming: false,
    icon: IconName.Card,
  };
}
