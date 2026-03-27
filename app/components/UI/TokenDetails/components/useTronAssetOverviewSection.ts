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

const getApyErrorMessage = ({
  hasValidApyDecimal,
  fetchStatus,
  errorMessage,
}: {
  hasValidApyDecimal: boolean;
  fetchStatus: FetchStatus;
  errorMessage?: string | null;
}) => {
  if (fetchStatus === FetchStatus.Error) {
    return (
      errorMessage?.trim() ||
      strings('stake.tron.estimated_rewards_api_unavailable')
    );
  }

  if (fetchStatus === FetchStatus.Fetched && !hasValidApyDecimal) {
    return strings('stake.tron.estimated_rewards_api_unavailable');
  }

  return undefined;
};

export interface UseTronAssetOverviewSectionArgs {
  enabled: boolean;
  tokenAddress?: string;
  tokenChainId?: string;
}

export interface TronAssetOverviewSectionViewModel {
  aprText?: string;
  claimableRewardsRowProps?: TronClaimableRewardsRowProps;
  estimatedAnnualRewardsRowProps?: TronEstimatedAnnualRewardsRowProps;
  errorMessages: string[];
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
    fiatRate,
    currentCurrency,
  } = useTronStakingRewardsSummary({
    tokenAddress,
  });
  const appLocale = I18n.locale;
  const localeLanguageCode = getLocaleLanguageCode();

  return useMemo(() => {
    if (!enabled) {
      return { errorMessages: [] };
    }

    const maxFractionDigits =
      MULTICHAIN_NETWORK_DECIMAL_PLACES[tokenChainId as CaipChainId] ?? 5;
    const formattedClaimableTrx = `${formatWithThreshold(
      claimableRewardsTrxAmount,
      TRX_THRESHOLD,
      appLocale,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFractionDigits,
      },
    )} TRX`;
    const hasClaimableFiat =
      claimableRewardsFiatAmount != null && Boolean(claimableRewardsCurrency);
    const formattedClaimableFiat = hasClaimableFiat
      ? formatWithThreshold(
          claimableRewardsFiatAmount,
          FIAT_THRESHOLD,
          localeLanguageCode,
          {
            style: 'currency',
            currency: claimableRewardsCurrency as string,
          },
        )
      : '-';

    const hasValidApyDecimal =
      tronApyFetchStatus === FetchStatus.Fetched && Boolean(apyDecimal?.trim());
    const apyErrorMessage = getApyErrorMessage({
      hasValidApyDecimal,
      fetchStatus: tronApyFetchStatus,
      errorMessage: tronApyErrorMessage,
    });

    let estimatedAnnualRewardsRowProps:
      | TronEstimatedAnnualRewardsRowProps
      | undefined;

    if (hasValidApyDecimal) {
      const rewardRounded = new BigNumber(totalStakedTrx)
        .multipliedBy(new BigNumber(apyDecimal as string).dividedBy(100))
        .decimalPlaces(3, BigNumber.ROUND_HALF_UP);
      const estimatedTrxNum = rewardRounded.toNumber();
      const formattedEstimatedTrx = `${estimatedTrxNum.toLocaleString(
        appLocale,
        {
          minimumFractionDigits: 3,
          maximumFractionDigits: 3,
        },
      )} TRX`;
      const estimatedFiatNum =
        fiatRate != null ? estimatedTrxNum * fiatRate : null;
      const formattedEstimatedFiat =
        estimatedFiatNum != null
          ? formatWithThreshold(
              estimatedFiatNum,
              FIAT_THRESHOLD,
              localeLanguageCode,
              { style: 'currency', currency: currentCurrency },
            )
          : '-';

      estimatedAnnualRewardsRowProps = {
        title: strings('stake.estimated_annual_rewards'),
        subtitle: `${formattedEstimatedFiat} · ${formattedEstimatedTrx}`,
        hideBalances: privacyMode,
      };
    }

    const errorMessages = [
      hasClaimableFiat || (hasValidApyDecimal && fiatRate != null)
        ? undefined
        : strings('stake.tron.fiat_unavailable'),
      apyErrorMessage,
    ].filter((message): message is string => Boolean(message));

    return {
      aprText: hasValidApyDecimal ? (apyPercent ?? undefined) : undefined,
      claimableRewardsRowProps: {
        title: strings('stake.tron.total_claimable_rewards'),
        subtitle: `${formattedClaimableFiat} · ${formattedClaimableTrx}`,
        hideBalances: privacyMode,
      },
      estimatedAnnualRewardsRowProps,
      errorMessages,
    };
  }, [
    apyDecimal,
    apyPercent,
    claimableRewardsCurrency,
    claimableRewardsFiatAmount,
    claimableRewardsTrxAmount,
    currentCurrency,
    enabled,
    fiatRate,
    appLocale,
    localeLanguageCode,
    privacyMode,
    tokenChainId,
    totalStakedTrx,
    tronApyErrorMessage,
    tronApyFetchStatus,
  ]);
};

export default useTronAssetOverviewSection;
