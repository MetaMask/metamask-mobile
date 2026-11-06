import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { selectMoneyBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/moneyBrandRefresh';

/**
 * Glass flag and menu action for the Money tab header. Card and Earn reuse
 * `MoneyHeader` with these so the hub tabs share one title and menu.
 */
const useMoneyTabHeader = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const isGlass = useSelector(selectMoneyBrandRefreshEnabled) === true;
  const onMenuPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.MORE_SHEET,
    });
  }, [navigation]);

  return { isGlass, onMenuPress };
};

export default useMoneyTabHeader;
