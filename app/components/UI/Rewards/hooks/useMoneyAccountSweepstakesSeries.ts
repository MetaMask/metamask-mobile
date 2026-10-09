import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCampaigns } from '../../../../reducers/rewards/selectors';
import {
  getMoneyAccountSweepstakesSeries,
  type MoneyAccountSweepstakesSeries,
} from '../utils/moneyAccountSweepstakesSeries';

export function useMoneyAccountSweepstakesSeries(): MoneyAccountSweepstakesSeries {
  const campaigns = useSelector(selectCampaigns);
  return useMemo(
    () => getMoneyAccountSweepstakesSeries(campaigns ?? []),
    [campaigns],
  );
}

export default useMoneyAccountSweepstakesSeries;
