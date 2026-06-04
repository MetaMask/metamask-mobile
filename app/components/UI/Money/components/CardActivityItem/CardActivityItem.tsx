import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { cardTransactionDisplayInfo } from '../../utils/cardTransactionDisplayInfo';
import { getUsdToFiatConversionRate } from '../../utils/moneyActivityFiat';
import type { CardTransaction } from '../../types/moneyActivity';
import ActivityRowView from '../MoneyActivityItem/ActivityRowView';

export interface CardActivityItemProps {
  card: CardTransaction;
  /** When true, shows the chain network badge on the icon avatar. Defaults to false. */
  showNetworkBadge?: boolean;
}

/**
 * A MetaMask Card payment row, backed by a {@link CardTransaction} from the
 * Accounts API.
 *
 * Not pressable: the on-chain detail sheet is keyed by a local
 * `transactionId`, which a card settlement (off-device) doesn't have. A
 * read-only sheet / explorer link is an open MUSD-817 follow-up, so for now the
 * row simply isn't tappable.
 */
const CardActivityItem = ({
  card,
  showNetworkBadge = false,
}: CardActivityItemProps) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);

  const display = useMemo(
    () =>
      cardTransactionDisplayInfo(card, {
        currentCurrency,
        usdToCurrentCurrencyRate: getUsdToFiatConversionRate(currencyRates),
      }),
    [card, currentCurrency, currencyRates],
  );

  return (
    <ActivityRowView
      id={card.hash}
      display={display}
      isFailed={false}
      chainId={card.chainId}
      showNetworkBadge={showNetworkBadge}
    />
  );
};

export default CardActivityItem;
