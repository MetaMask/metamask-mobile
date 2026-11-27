import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectMoneyDepositAssetsMeetingMinimumBalance,
  selectMoneyDepositPayTokens,
} from '../selectors/depositTokens';
import {
  buildQuickDepositStablecoinOption,
  type QuickDepositStablecoinOption,
} from '../utils/quickDepositStablecoins';

export const useQuickDepositStablecoins = ():
  | QuickDepositStablecoinOption
  | undefined => {
  const assets = useSelector(selectMoneyDepositAssetsMeetingMinimumBalance);
  const supportedTokens = useSelector(selectMoneyDepositPayTokens);

  return useMemo(
    () => buildQuickDepositStablecoinOption({ assets, supportedTokens }),
    [assets, supportedTokens],
  );
};
