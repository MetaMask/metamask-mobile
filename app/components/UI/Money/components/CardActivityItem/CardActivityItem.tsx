import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import Routes from '../../../../../constants/navigation/Routes';
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
 * Tapping opens a read-only detail sheet. The on-chain detail sheet can't be
 * reused (it's keyed by a local `transactionId`, which an off-device card
 * settlement has no equivalent for), so the {@link CardTransaction} is passed to
 * a card-specific sheet as a navigation param.
 */
const CardActivityItem = ({
  card,
  showNetworkBadge = false,
}: CardActivityItemProps) => {
  const navigation = useNavigation();
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

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.CARD_TRANSACTION_DETAILS_SHEET,
      params: { card },
    });
  }, [navigation, card]);

  return (
    <ActivityRowView
      id={card.hash}
      display={display}
      isFailed={false}
      chainId={card.chainId}
      onPress={handlePress}
      showNetworkBadge={showNetworkBadge}
    />
  );
};

export default CardActivityItem;
