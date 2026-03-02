import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import type { AccountState } from '../types';

export const predictAccountStateKeys = {
  all: () => ['predict', 'accountState'] as const,
};

export const predictAccountStateOptions = () =>
  queryOptions({
    queryKey: predictAccountStateKeys.all(),
    queryFn: async (): Promise<AccountState> => {
      try {
        const accountStateResponse =
          await Engine.context.PredictController.getAccountState({});

        DevLogger.log('usePredictAccountState: Loaded account state', {
          address: accountStateResponse?.address,
          isDeployed: accountStateResponse?.isDeployed,
          hasAllowances: accountStateResponse?.hasAllowances,
        });

        return accountStateResponse;
      } catch (err) {
        DevLogger.log(
          'usePredictAccountState: Error loading account state',
          err,
        );

        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictAccountState',
          },
          context: {
            name: 'usePredictAccountState',
            data: {
              method: 'loadAccountState',
              action: 'account_state_load',
              operation: 'data_fetching',
            },
          },
        });

        throw err;
      }
    },
    staleTime: 10_000,
  });
