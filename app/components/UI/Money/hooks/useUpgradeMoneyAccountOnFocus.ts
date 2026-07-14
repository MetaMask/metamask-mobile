import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { upgradeMoneyAccount } from '../../../../actions/money';
import useThunkDispatch from '../../../hooks/useThunkDispatch';

/**
 * Attempts the Money Account upgrade whenever the hosting screen gains focus,
 * and aborts the in-flight attempt — including any scheduled retries — when
 * it loses focus. Accounts already recorded as upgraded make this a no-op in
 * the controller.
 */
export const useUpgradeMoneyAccountOnFocus = () => {
  const dispatch = useThunkDispatch();

  useFocusEffect(
    useCallback(() => {
      const abortController = new AbortController();
      dispatch(upgradeMoneyAccount(abortController.signal));
      return () => abortController.abort();
    }, [dispatch]),
  );
};
