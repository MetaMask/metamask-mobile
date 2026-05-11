import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useQuery } from '@metamask/react-data-query';
import { useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { selectSelectedInternalAccountId } from '../../../../../selectors/accountsController';

const CLIENT_TYPE = 'mobile' as const;
const GET_ACTION =
  'AuthenticatedUserStorageService:getNotificationPreferences' as const;
const PUT_ACTION =
  'AuthenticatedUserStorageService:putNotificationPreferences' as const;

export const useNotificationStoragePreferences = () => {
  const selectedAccountId =
    useSelector(selectSelectedInternalAccountId) ?? 'anonymous';

  const { data, isLoading, error, refetch } = useQuery<any>({
    queryKey: [GET_ACTION, selectedAccountId],
  });
  const queryClient = useQueryClient();

  const preferences = data ?? {
    walletActivity: { enabled: true, push: true, inApp: true, accounts: [] },
    marketing: { enabled: false, push: false, inApp: false },
    perps: { enabled: true, push: true, inApp: true },
    socialAI: { enabled: false, push: false, inApp: false },
  };

  const enqueuePersist = useCallback(async (nextPreferences: any) => {
    try {
      const latest = (await (
        Engine.controllerMessenger.call as CallableFunction
      )(GET_ACTION)) as any;
      await (Engine.controllerMessenger.call as CallableFunction)(
        PUT_ACTION,
        { ...latest, ...nextPreferences },
        CLIENT_TYPE,
      );
    } catch (err) {
      Logger.error(err as Error, 'Failed to persist notification preferences');
      throw err;
    }
  }, []);

  const updatePreference = useCallback(
    async (type: string, key: string, value: boolean) => {
      const nextPreferences = {
        ...preferences,
        [type]: {
          ...(preferences[type] || {}),
          [key]: value,
        },
      };

      queryClient.setQueryData(
        [GET_ACTION, selectedAccountId],
        nextPreferences,
      );

      try {
        await enqueuePersist(nextPreferences);
      } catch (err) {
        refetch();
      }
    },
    [preferences, enqueuePersist, queryClient, selectedAccountId, refetch],
  );

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
  };
};
