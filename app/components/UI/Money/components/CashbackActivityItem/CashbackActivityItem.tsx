import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import Routes from '../../../../../constants/navigation/Routes';
import { cashbackTransactionDisplayInfo } from '../../utils/cashbackTransactionDisplayInfo';
import { getUsdToFiatConversionRate } from '../../utils/moneyActivityFiat';
import type { CashbackTransaction } from '../../types/moneyActivity';
import ActivityRowView from '../MoneyActivityItem/ActivityRowView';

export interface CashbackActivityItemProps {
  cashback: CashbackTransaction;
  showNetworkBadge?: boolean;
}

const CashbackActivityItem = ({
  cashback,
  showNetworkBadge = false,
}: CashbackActivityItemProps) => {
  const navigation = useNavigation();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);

  const display = useMemo(
    () =>
      cashbackTransactionDisplayInfo(cashback, {
        currentCurrency,
        usdToCurrentCurrencyRate: getUsdToFiatConversionRate(currencyRates),
      }),
    [cashback, currentCurrency, currencyRates],
  );

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.CASHBACK_TRANSACTION_DETAILS_SHEET,
      params: { cashback },
    });
  }, [navigation, cashback]);

  return (
    <ActivityRowView
      id={cashback.hash}
      display={display}
      chainId={cashback.chainId}
      onPress={handlePress}
      showNetworkBadge={showNetworkBadge}
    />
  );
};

export default CashbackActivityItem;
