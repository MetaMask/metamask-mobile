import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import type { CaipChainId } from '@metamask/utils';
import I18n, { strings } from '../../../../../locales/i18n';
import { getLocaleLanguageCode } from '../../../../components/hooks/useFormatters';
import useTronStakingRewardsSummary from '../../Earn/components/Tron/TronStakingRewardsRows/useTronStakingRewardsSummary';
import type { TronClaimableRewardsRowProps } from '../../Earn/components/Tron/TronStakingRewardsRows/TronClaimableRewardsRow';
import type { TronEstimatedAnnualRewardsRowProps } from '../../Earn/components/Tron/TronStakingRewardsRows/TronEstimatedAnnualRewardsRow';
import type { TronEstimatedAnnualRewardsUnavailableBannerProps } from '../../Earn/components/Tron/TronStakingRewardsRows/TronEstimatedAnnualRewardsUnavailableBanner';
import useTronStakeApy, { FetchStatus } from '../../Earn/hooks/useTronStakeApy';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { formatWithThreshold } from '../../../../util/assets';
import type { TokenI } from '../../Tokens/types';

const FIAT_THRESHOLD = 0.01;
const TRX_THRESHOLD = 0.00001;

interface UseTronRewardsRowsViewModelArgs {
  token: Pick<TokenI, 'address' | 'chainId'>;
}

interface TronRewardsRowsViewModel {
  claimableRewardsRowProps: TronClaimableRewardsRowProps;
  estimatedAnnualRewardsRowProps: TronEstimatedAnnualRewardsRowProps | null;
  estimatedAnnualRewardsUnavailableBannerProps: TronEstimatedAnnualRewardsUnavailableBannerProps | null;
}

const useTronRewardsRowsViewModel = ({
  token,
}: UseTronRewardsRowsViewModelArgs): TronRewardsRowsViewModel => {
  const privacyMode = useSelector(selectPrivacyMode);
  const {
    apyDecimal,
    fetchStatus: tronApyFetchStatus,
    errorMessage: tronApyErrorMessage,
  } = useTronStakeApy();
  const {
    claimableRewardsTrxAmount,
    claimableRewardsFiatAmount,
    claimableRewardsCurrency,
    totalStakedTrx,
    nonEvmFiatRate,
    currentCurrency,
  } = useTronStakingRewardsSummary({ token: token as TokenI });

  return useMemo(() => {
    const maxFractionDigits =
      MULTICHAIN_NETWORK_DECIMAL_PLACES[token.chainId as CaipChainId] ?? 5;
    const formattedClaimableTrx = `${formatWithThreshold(
      claimableRewardsTrxAmount,
      TRX_THRESHOLD,
      I18n.locale,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFractionDigits,
      },
    )} TRX`;
    const activeFiatAmount =
      claimableRewardsFiatAmount != null && claimableRewardsCurrency
        ? claimableRewardsFiatAmount
        : 0;
    const activeFiatCurrency = claimableRewardsCurrency ?? currentCurrency;
    const formattedClaimableFiat = formatWithThreshold(
      activeFiatAmount,
      FIAT_THRESHOLD,
      getLocaleLanguageCode(),
      { style: 'currency', currency: activeFiatCurrency },
    );

    const areTronEstimatedRewardsAvailable =
      tronApyFetchStatus === FetchStatus.Fetched && Boolean(apyDecimal?.trim());

    let estimatedAnnualRewardsRowProps: TronEstimatedAnnualRewardsRowProps | null =
      null;

    if (areTronEstimatedRewardsAvailable) {
      const rewardRounded = new BigNumber(totalStakedTrx)
        .multipliedBy(new BigNumber(apyDecimal as string).dividedBy(100))
        .decimalPlaces(3, BigNumber.ROUND_HALF_UP);
      const estimatedTrxNum = rewardRounded.toNumber();
      const formattedEstimatedTrx = `${estimatedTrxNum.toLocaleString(
        undefined,
        {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        },
      )} TRX`;
      const estimatedFiatNum =
        nonEvmFiatRate != null && nonEvmFiatRate > 0
          ? estimatedTrxNum * nonEvmFiatRate
          : 0;
      const formattedEstimatedFiat = formatWithThreshold(
        estimatedFiatNum,
        FIAT_THRESHOLD,
        getLocaleLanguageCode(),
        { style: 'currency', currency: currentCurrency },
      );

      estimatedAnnualRewardsRowProps = {
        title: strings('stake.estimated_annual_rewards'),
        subtitle: `${formattedEstimatedFiat} · ${formattedEstimatedTrx}`,
        hideBalances: privacyMode,
      };
    }

    const estimatedAnnualRewardsUnavailableBannerProps =
      estimatedAnnualRewardsRowProps === null
        ? {
            message:
              tronApyFetchStatus === FetchStatus.Error &&
              tronApyErrorMessage?.trim()
                ? tronApyErrorMessage.trim()
                : strings('stake.tron.estimated_rewards_api_unavailable'),
          }
        : null;

    return {
      claimableRewardsRowProps: {
        title: strings('stake.tron.total_claimable_rewards'),
        subtitle: `${formattedClaimableFiat} · ${formattedClaimableTrx}`,
        hideBalances: privacyMode,
      },
      estimatedAnnualRewardsRowProps,
      estimatedAnnualRewardsUnavailableBannerProps,
    };
  }, [
    apyDecimal,
    claimableRewardsCurrency,
    claimableRewardsFiatAmount,
    claimableRewardsTrxAmount,
    currentCurrency,
    nonEvmFiatRate,
    privacyMode,
    token.chainId,
    totalStakedTrx,
    tronApyErrorMessage,
    tronApyFetchStatus,
  ]);
};

export default useTronRewardsRowsViewModel;
