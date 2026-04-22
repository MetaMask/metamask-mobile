import BigNumber from 'bignumber.js';
import { TrxScope } from '@metamask/keyring-api';
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

/**
 * Maps a token's CAIP-2 chain id (`tron:<reference>`) to the stake SDK network.
 *
 * The reference after `tron:` is the Tron network id. MetaMask uses the decimal
 * string form from {@link TrxScope} (e.g. `tron:728126428` for mainnet). The same
 * id is sometimes written in hex (`tron:0x2b6653dc` — 0x2b6653dc === 728126428),
 * so we accept both shapes for compatibility with tests and any legacy payloads.
 */
const STAKE_SDK_CHAIN_ID_BY_CAIP_CHAIN_ID: Record<
  string,
  ChainId.TRON_MAINNET | ChainId.TRON_NILE
> = {
  [TrxScope.Mainnet]: ChainId.TRON_MAINNET,
  [TrxScope.Nile]: ChainId.TRON_NILE,
};

function getTronStakeChainId(
  tokenChainId?: string,
): ChainId.TRON_MAINNET | ChainId.TRON_NILE | undefined {
  if (!tokenChainId) {
    return undefined;
  }
  return STAKE_SDK_CHAIN_ID_BY_CAIP_CHAIN_ID[tokenChainId];
}

function getApyErrorMessage({
  hasValidApyDecimal,
  fetchStatus,
  errorMessage,
}: {
  hasValidApyDecimal: boolean;
  fetchStatus: FetchStatus;
  errorMessage?: string | null;
}): string | undefined {
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
}

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

interface FormattedEstimatedRewards {
  formattedEstimatedFiat: string;
  formattedEstimatedTrx: string;
}

function buildClaimableRewardsRowProps({
  formattedClaimableFiat,
  formattedClaimableTrx,
  privacyMode,
}: {
  formattedClaimableFiat: string;
  formattedClaimableTrx: string;
  privacyMode: boolean;
}): TronClaimableRewardsRowProps {
  return {
    title: strings('stake.tron.total_claimable_rewards'),
    subtitle: `${formattedClaimableFiat} · ${formattedClaimableTrx}`,
    hideBalances: privacyMode,
  };
}

function buildEstimatedAnnualRewardsRowProps({
  estimatedRewards,
  privacyMode,
}: {
  estimatedRewards?: FormattedEstimatedRewards;
  privacyMode: boolean;
}): TronEstimatedAnnualRewardsRowProps | undefined {
  if (!estimatedRewards) {
    return undefined;
  }

  return {
    title: strings('stake.estimated_annual_rewards'),
    subtitle: `${estimatedRewards.formattedEstimatedFiat} · ${estimatedRewards.formattedEstimatedTrx}`,
    hideBalances: privacyMode,
  };
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
  } = useTronStakeApy({
    fetchOnMount: enabled,
    chainId: getTronStakeChainId(tokenChainId),
    strictChainHandling: true,
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

    const hasClaimableFiat =
      claimableRewardsFiatAmount != null && Boolean(claimableRewardsCurrency);
    const hasValidApyDecimal =
      tronApyFetchStatus === FetchStatus.Fetched && apyDecimal !== null;

    const formattedClaimableTrx = `${formatWithThreshold(
      claimableRewardsTrxAmount,
      TRX_THRESHOLD,
      appLocale,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: maxFractionDigits,
      },
    )} TRX`;

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

    const apyErrorMessage = getApyErrorMessage({
      hasValidApyDecimal,
      fetchStatus: tronApyFetchStatus,
      errorMessage: tronApyErrorMessage,
    });

    const estimatedRewards = hasValidApyDecimal
      ? (() => {
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
          return { formattedEstimatedTrx, formattedEstimatedFiat };
        })()
      : undefined;

    const claimableRewardsRowProps = buildClaimableRewardsRowProps({
      formattedClaimableFiat,
      formattedClaimableTrx,
      privacyMode,
    });
    const estimatedAnnualRewardsRowProps = buildEstimatedAnnualRewardsRowProps({
      estimatedRewards,
      privacyMode,
    });
    const errorMessages = [
      hasClaimableFiat || (hasValidApyDecimal && fiatRate != null)
        ? undefined
        : strings('stake.tron.fiat_unavailable'),
      apyErrorMessage,
    ].filter((message): message is string => Boolean(message));

    return {
      aprText: hasValidApyDecimal ? (apyPercent ?? undefined) : undefined,
      claimableRewardsRowProps,
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
