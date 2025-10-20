import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import {
  ConfirmationLoader,
  ConfirmationParams,
} from '../components/confirm/confirm-component';

const ROUTE = Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS;
const ROUTE_NO_HEADER = Routes.FULL_SCREEN_CONFIRMATIONS.NO_HEADER;

export type ConfirmNavigateOptions = {
  amount?: string;
  headerShown?: boolean;
  stack?: string;
} & ConfirmationParams;

export function useConfirmNavigation() {
  const { navigate } = useNavigation();

  const navigateToConfirmation = useCallback(
    (options: ConfirmNavigateOptions) => {
      const { headerShown, stack, ...params } = options;
      const { loader } = params;

      if (!loader && stack === Routes.PERPS.ROOT) {
        params.loader = ConfirmationLoader.CustomAmount;
      }

      const route = headerShown === false ? ROUTE_NO_HEADER : ROUTE;

      if (stack) {
        navigate(stack, { screen: route, params });
        return;
      }

      navigate(route, params);
    },
    [navigate],
  );

  return { navigateToConfirmation };
}
