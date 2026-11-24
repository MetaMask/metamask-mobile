import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectMoneyDepositAssetsMeetingMinimumBalance,
  selectMoneyDepositPayTokens,
} from '../selectors/depositTokens';
import {
  buildQuickDepositStablecoinOptions,
  type QuickDepositStablecoinOption,
} from '../utils/quickDepositStablecoins';

export const useQuickDepositStablecoins =
  (): QuickDepositStablecoinOption[] => {
    const assets = useSelector(selectMoneyDepositAssetsMeetingMinimumBalance);
    const supportedTokens = useSelector(selectMoneyDepositPayTokens);

    return useMemo(
      () => buildQuickDepositStablecoinOptions({ assets, supportedTokens }),
      [assets, supportedTokens],
    );
  };
