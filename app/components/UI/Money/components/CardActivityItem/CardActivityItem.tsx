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
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';
import type { CardTransaction } from '../../types/moneyActivity';
import ActivityRowView from '../MoneyActivityItem/ActivityRowView';

export interface CardActivityItemProps {
  card: CardTransaction;
  showNetworkBadge?: boolean;
}

const CardActivityItem = ({
  card,
  showNetworkBadge = false,
}: CardActivityItemProps) => {
  const navigation = useNavigation();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const activityDetailsEnabled = useSelector(
    selectMoneyEnableActivityDetailsFlag,
  );

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
      chainId={card.chainId}
      onPress={activityDetailsEnabled ? handlePress : undefined}
      showNetworkBadge={showNetworkBadge}
    />
  );
};

export default CardActivityItem;
