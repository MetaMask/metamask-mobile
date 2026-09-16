import type {
  NavigationContainerRef,
  ParamListBase,
} from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { rejectPendingTransactions } from './rejectPendingTransactions';

export const completePrototypeMoneySend = (
  _navigation: AppNavigationProp,
  showSuccessToast: (label: string) => void,
  rootNavigation: Pick<
    NavigationContainerRef<ParamListBase>,
    'reset'
  > = NavigationService.navigation,
) => {
  rejectPendingTransactions();
  rootNavigation.reset({
    index: 0,
    routes: [
      {
        name: Routes.HOME_TABS,
        params: {
          screen: Routes.MONEY.ROOT,
          params: { screen: Routes.MONEY.HOME },
        },
      },
    ],
  });
  showSuccessToast(strings('money.toasts.withdraw_success_title'));
};
