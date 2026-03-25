import type { CaipAssetType } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectTronSpecialAssetsBySelectedAccountGroup } from '../../../../../../selectors/assets/assets-list';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../../selectors/multichain';
import type { TokenI } from '../../../../Tokens/types';
import {
  buildTronStakingRewardsSummary,
  type TronStakingRewardsSummaryResult,
} from './tronStakingRewardsSummary';

export interface UseTronStakingRewardsSummaryArgs {
  token: TokenI;
  apyDecimal: string | null;
  isApyLoading: boolean;
}

const useTronStakingRewardsSummary = ({
  token,
  apyDecimal,
  isApyLoading,
}: UseTronStakingRewardsSummaryArgs): TronStakingRewardsSummaryResult => {
  const { trxStakingRewards, totalStakedTrx } = useSelector(
    selectTronSpecialAssetsBySelectedAccountGroup,
  );
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const nonEvmFiatRate = useMemo(() => {
    if (!token.address) {
      return undefined;
    }
    const rate = multichainAssetsRates?.[token.address as CaipAssetType];
    return rate?.rate ? Number(rate.rate) : undefined;
  }, [multichainAssetsRates, token.address]);

  return useMemo(
    () =>
      buildTronStakingRewardsSummary({
        trxStakingRewards,
        totalStakedTrx,
        apyDecimal,
        isApyLoading,
        nonEvmFiatRate,
        currentCurrency,
        chainId: String(token.chainId ?? ''),
      }),
    [
      trxStakingRewards,
      totalStakedTrx,
      apyDecimal,
      isApyLoading,
      nonEvmFiatRate,
      currentCurrency,
      token.chainId,
    ],
  );
};

export default useTronStakingRewardsSummary;
