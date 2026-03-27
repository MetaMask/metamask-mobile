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

export interface UseTronAssetOverviewSectionArgs {
  enabled: boolean;
  tokenAddress?: string;
  tokenChainId?: string;
}

export interface TronAssetOverviewSectionViewModel {
  aprText?: string;
  claimableRewardsRowProps?: TronClaimableRewardsRowProps;
  estimatedAnnualRewardsRowProps?: TronEstimatedAnnualRewardsRowProps;
  estimatedAnnualRewardsUnavailableBannerProps?: TronEstimatedAnnualRewardsUnavailableBannerProps;
}

const useTronAssetOverviewSection = ({
  enabled,
  tokenAddress,
  tokenChainId,
}: UseTronAssetOverviewSectionArgs): TronAssetOverviewSectionViewModel => {
  const privacyMode = useSelector(selectPrivacyMode);
  const {
    apyDecimal,
    apyPercent,
    fetchStatus: tronApyFetchStatus,
    errorMessage: tronApyErrorMessage,
  } = useTronStakeApy({ fetchOnMount: enabled });
  const {
    claimableRewardsTrxAmount,
    claimableRewardsFiatAmount,
    claimableRewardsCurrency,
    totalStakedTrx,
    nonEvmFiatRate,
    currentCurrency,
  } = useTronStakingRewardsSummary({
    token: { address: tokenAddress ?? '' } as TokenI,
  });

  return useMemo(() => {
    if (!enabled) {
      return {};
    }

    const maxFractionDigits =
      MULTICHAIN_NETWORK_DECIMAL_PLACES[tokenChainId as CaipChainId] ?? 5;
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

    const hasValidApyDecimal =
      tronApyFetchStatus === FetchStatus.Fetched && Boolean(apyDecimal?.trim());

    let estimatedAnnualRewardsRowProps:
      | TronEstimatedAnnualRewardsRowProps
      | undefined;

    if (hasValidApyDecimal) {
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
      tronApyFetchStatus === FetchStatus.Initial ||
      tronApyFetchStatus === FetchStatus.Fetching
        ? undefined
        : estimatedAnnualRewardsRowProps
          ? undefined
          : {
              message:
                tronApyFetchStatus === FetchStatus.Error &&
                tronApyErrorMessage?.trim()
                  ? tronApyErrorMessage.trim()
                  : strings('stake.tron.estimated_rewards_api_unavailable'),
            };

    return {
      aprText: hasValidApyDecimal ? (apyPercent ?? undefined) : undefined,
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
    apyPercent,
    claimableRewardsCurrency,
    claimableRewardsFiatAmount,
    claimableRewardsTrxAmount,
    currentCurrency,
    enabled,
    nonEvmFiatRate,
    privacyMode,
    tokenChainId,
    totalStakedTrx,
    tronApyErrorMessage,
    tronApyFetchStatus,
  ]);
};

export default useTronAssetOverviewSection;
