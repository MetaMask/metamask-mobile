import BigNumber from 'bignumber.js';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import type { CaipChainId } from '@metamask/utils';
import { ChainId } from '@metamask/stake-sdk';
import I18n, { strings } from '../../../../../locales/i18n';
import { getLocaleLanguageCode } from '../../../../components/hooks/useFormatters';
import useTronStakingRewardsSummary from '../../Earn/components/Tron/TronStakingRewardsRows/useTronStakingRewardsSummary';
import type { TronClaimableRewardsRowProps } from '../../Earn/components/Tron/TronStakingRewardsRows/TronClaimableRewardsRow';
import type { TronEstimatedAnnualRewardsRowProps } from '../../Earn/components/Tron/TronStakingRewardsRows/TronEstimatedAnnualRewardsRow';
import type { TronEstimatedAnnualRewardsUnavailableBannerProps } from '../../Earn/components/Tron/TronStakingRewardsRows/TronEstimatedAnnualRewardsUnavailableBanner';
import useTronStakeApy, { FetchStatus } from '../../Earn/hooks/useTronStakeApy';
import { selectPrivacyMode } from '../../../../selectors/preferencesController';
import { formatWithThreshold } from '../../../../util/assets';

const FIAT_THRESHOLD = 0.01;
const TRX_THRESHOLD = 0.00001;

const STAKE_CHAIN_ID_BY_CAIP_CHAIN_ID = {
  'tron:0x2b6653dc': ChainId.TRON_MAINNET,
  'tron:0xcd8690dc': ChainId.TRON_NILE,
} as const;

const getTronStakeChainId = (tokenChainId?: string) =>
  tokenChainId
    ? STAKE_CHAIN_ID_BY_CAIP_CHAIN_ID[
        tokenChainId as keyof typeof STAKE_CHAIN_ID_BY_CAIP_CHAIN_ID
      ]
    : undefined;

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
  // These hooks must stay unconditional to preserve React's hook ordering.
  // When `enabled` is false, APY fetches are disabled and the hook returns
  // before computing APR text or Tron reward/banner props.
  const privacyMode = useSelector(selectPrivacyMode);
  const {
    apyDecimal,
    apyPercent,
    fetchStatus: tronApyFetchStatus,
    errorMessage: tronApyErrorMessage,
  } = useTronStakeApy({
    fetchOnMount: enabled,
    chainId: getTronStakeChainId(tokenChainId),
  });
  const {
    claimableRewardsTrxAmount,
    claimableRewardsFiatAmount,
    claimableRewardsCurrency,
    totalStakedTrx,
    nonEvmFiatRate,
    currentCurrency,
  } = useTronStakingRewardsSummary({
    tokenAddress,
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
