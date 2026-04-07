import { useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import {
  selectCardHomeData,
  selectCardHomeDataStatus,
} from '../../../../selectors/cardController';

export const useCardHomeData = () => {
  const data = useSelector(selectCardHomeData);
  const status = useSelector(selectCardHomeDataStatus);

  // Safety net: if the controller hasn't started a fetch yet (e.g. deep link
  // before KeyringController:unlock fires), kick one off on mount.
  // The controller deduplicates concurrent calls so this is safe to call
  // even when a fetch is already in-flight.
  useEffect(() => {
    if (status === 'idle') {
      Engine.context.CardController.fetchCardHomeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refetch = useCallback(() => {
    Engine.context.CardController.fetchCardHomeData();
  }, []);

  return {
    data,
    isLoading: status === 'loading' || status === 'idle',
    isError: status === 'error',
    refetch,
  };
};
