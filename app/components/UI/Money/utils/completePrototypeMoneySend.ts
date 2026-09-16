import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { rejectPendingTransactions } from './rejectPendingTransactions';

export const completePrototypeMoneySend = (
  navigation: AppNavigationProp,
  showSuccessToast: (label: string) => void,
) => {
  rejectPendingTransactions();
  navigation.navigate(Routes.HOME_TABS, {
    screen: Routes.MONEY.ROOT,
    params: { screen: Routes.MONEY.HOME },
  });
  showSuccessToast(strings('money.toasts.withdraw_success_title'));
};
