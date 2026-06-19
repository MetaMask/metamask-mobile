import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import Routes from '../../../../../constants/navigation/Routes';
import { accountsApiActivityDisplayInfo } from '../../utils/accountsApiActivityDisplayInfo';
import { getUsdToFiatConversionRate } from '../../utils/moneyActivityFiat';
import { selectMoneyEnableActivityDetailsFlag } from '../../selectors/featureFlags';
import type { AccountsApiActivity } from '../../types/moneyActivity';
import ActivityRowView from '../MoneyActivityItem/ActivityRowView';

export interface AccountsApiActivityItemProps {
  activity: AccountsApiActivity;
  showNetworkBadge?: boolean;
}

const AccountsApiActivityItem = ({
  activity,
  showNetworkBadge = false,
}: AccountsApiActivityItemProps) => {
  const navigation = useNavigation();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const currencyRates = useSelector(selectCurrencyRates);
  const activityDetailsEnabled = useSelector(
    selectMoneyEnableActivityDetailsFlag,
  );

  const display = useMemo(
    () =>
      accountsApiActivityDisplayInfo(activity, {
        currentCurrency,
        usdToCurrentCurrencyRate: getUsdToFiatConversionRate(currencyRates),
      }),
    [activity, currentCurrency, currencyRates],
  );

  const handlePress = useCallback(() => {
    navigation.navigate(Routes.MONEY.CARD_TRANSACTION_DETAILS, { activity });
  }, [navigation, activity]);

  return (
    <ActivityRowView
      id={activity.hash}
      display={display}
      chainId={activity.chainId}
      onPress={activityDetailsEnabled ? handlePress : undefined}
      showNetworkBadge={showNetworkBadge}
    />
  );
};

export default AccountsApiActivityItem;
