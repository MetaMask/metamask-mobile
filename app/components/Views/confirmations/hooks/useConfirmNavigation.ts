import { useNavigation } from '@react-navigation/native';
import { useCallback } from 'react';
import Routes from '../../../../constants/navigation/Routes';
import {
  ConfirmationLoader,
  ConfirmationParams,
} from '../components/confirm/confirm-component';

const ROUTE = Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS;

export type ConfirmNavigateOptions = {
  stack?: string;
} & ConfirmationParams;

export function useConfirmNavigation() {
  const { navigate } = useNavigation();

  const navigateToConfirmation = useCallback(
    (options: ConfirmNavigateOptions) => {
      const { stack, ...params } = options;
      const { loader } = params;

      if (!loader && stack === Routes.PERPS.ROOT) {
        params.loader = ConfirmationLoader.PerpsDeposit;
      }

      if (stack) {
        navigate(stack, { screen: ROUTE, params });
        return;
      }

      navigate(ROUTE, { params });
    },
    [navigate],
  );

  return { navigateToConfirmation };
}
