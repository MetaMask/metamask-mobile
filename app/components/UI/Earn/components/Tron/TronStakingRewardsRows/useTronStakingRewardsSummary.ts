import type { CaipAssetType } from '@metamask/utils';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectTronSpecialAssetsBySelectedAccountGroup } from '../../../../../../selectors/assets/assets-list';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../../selectors/multichain';
import type { TokenI } from '../../../../Tokens/types';

export interface UseTronStakingRewardsSummaryArgs {
  token: TokenI;
}

export interface TronStakingRewardsSummaryData {
  claimableRewardsTrxAmount: number;
  claimableRewardsFiatAmount: number | undefined;
  claimableRewardsCurrency: string | undefined;
  totalStakedTrx: number;
  nonEvmFiatRate: number | undefined;
  currentCurrency: string;
}

const useTronStakingRewardsSummary = ({
  token,
}: UseTronStakingRewardsSummaryArgs): TronStakingRewardsSummaryData => {
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

  return useMemo(() => {
    const claimableRewardsTrxAmount = trxStakingRewards
      ? parseFloat(trxStakingRewards.balance || '0')
      : 0;

    const fiatBalanceRaw = trxStakingRewards?.fiat?.balance;
    const fiatCurrency = trxStakingRewards?.fiat?.currency;

    let claimableRewardsFiatAmount: number | undefined;
    if (fiatBalanceRaw != null && fiatCurrency) {
      const fiatNum =
        typeof fiatBalanceRaw === 'number'
          ? fiatBalanceRaw
          : parseFloat(String(fiatBalanceRaw));
      claimableRewardsFiatAmount = Number.isNaN(fiatNum) ? 0 : fiatNum;
    }

    return {
      claimableRewardsTrxAmount,
      claimableRewardsFiatAmount,
      claimableRewardsCurrency: fiatCurrency,
      totalStakedTrx,
      nonEvmFiatRate,
      currentCurrency: (currentCurrency ?? 'USD').toUpperCase(),
    };
  }, [trxStakingRewards, totalStakedTrx, nonEvmFiatRate, currentCurrency]);
};

export default useTronStakingRewardsSummary;
