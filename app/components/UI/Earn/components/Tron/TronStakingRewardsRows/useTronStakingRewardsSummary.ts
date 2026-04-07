import type { CaipAssetType } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectTronSpecialAssetsBySelectedAccountGroup } from '../../../../../../selectors/assets/assets-list';
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { selectMultichainAssetsRates } from '../../../../../../selectors/multichain';

export interface UseTronStakingRewardsSummaryArgs {
  tokenAddress?: string;
}

export interface TronStakingRewardsSummaryData {
  claimableRewardsTrxAmount: number;
  claimableRewardsFiatAmount: number | undefined;
  claimableRewardsCurrency: string | undefined;
  totalStakedTrx: number;
  fiatRate: number | undefined;
  currentCurrency: string;
}

/**
 * Reads the Tron staking balances already available in Redux and normalizes the
 * raw numeric data needed by the token-details rewards UI.
 *
 * Responsibilities:
 * - expose claimable rewards in TRX and fiat, when present
 * - expose the total staked TRX used to estimate annual rewards
 * - expose the fiat rate and selected currency for the current TRX asset
 *
 * This hook intentionally does not format strings or decide which banners or
 * rows should render. That presentation logic belongs to the caller.
 */
const useTronStakingRewardsSummary = ({
  tokenAddress,
}: UseTronStakingRewardsSummaryArgs): TronStakingRewardsSummaryData => {
  const { trxStakingRewards, totalStakedTrx } = useSelector(
    selectTronSpecialAssetsBySelectedAccountGroup,
  );
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const currentCurrency = useSelector(selectCurrentCurrency);

  let fiatRate: number | undefined;
  if (tokenAddress) {
    const rate = multichainAssetsRates?.[tokenAddress as CaipAssetType];
    fiatRate = rate?.rate ? Number(rate.rate) : undefined;
  }

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
    fiatRate,
    currentCurrency: (currentCurrency ?? 'USD').toUpperCase(),
  };
};

export default useTronStakingRewardsSummary;
