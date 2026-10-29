import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { selectMoneyAccountAccessBlockReason } from '../selectors/visibility';
import type { MoneyAccountAccessBlockReason } from '../utils/moneyAccountAccess';

export const navigateToMoneyAccountAccessNotice = (
  navigation: AppNavigationProp,
  reason: MoneyAccountAccessBlockReason,
): void => {
  if (reason === 'geo_blocked') {
    navigation.navigate(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.GEO_BLOCK_SHEET,
    });
    return;
  }

  navigation.navigate(Routes.MONEY.MODALS.DEEPLINK_MODAL, {
    title: strings('money.deeplink_modal.money_account_disabled.title'),
    description: strings(
      'money.deeplink_modal.money_account_disabled.description',
    ),
  });
};

export const useMoneyAccountAvailability = () => {
  const accessBlockReason = useSelector(selectMoneyAccountAccessBlockReason);

  return {
    accessBlockReason,
    isMoneyAccountAccessible: accessBlockReason === undefined,
  };
};

export const useMoneyAccountAccessRedirect = (): boolean => {
  const navigation = useNavigation<AppNavigationProp>();
  const { accessBlockReason, isMoneyAccountAccessible } =
    useMoneyAccountAvailability();
  const lastRedirectedReason = useRef<
    MoneyAccountAccessBlockReason | undefined
  >(undefined);

  useEffect(() => {
    if (!accessBlockReason) {
      lastRedirectedReason.current = undefined;
      return;
    }

    if (lastRedirectedReason.current === accessBlockReason) {
      return;
    }

    lastRedirectedReason.current = accessBlockReason;
    navigateToMoneyAccountAccessNotice(navigation, accessBlockReason);
  }, [accessBlockReason, navigation]);

  return isMoneyAccountAccessible;
};
