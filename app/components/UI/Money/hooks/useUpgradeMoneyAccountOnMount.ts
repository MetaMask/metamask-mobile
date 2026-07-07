import { useEffect } from 'react';
import { upgradeMoneyAccount } from '../../../../actions/money';
import useThunkDispatch from '../../../hooks/useThunkDispatch';

export const useUpgradeMoneyAccountOnMount = () => {
  const dispatch = useThunkDispatch();

  useEffect(() => {
    dispatch(upgradeMoneyAccount());
  }, [dispatch]);
};
