import type { Asset } from '@metamask/assets-controllers';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import type { CaipChainId } from '@metamask/utils';
import BigNumber from 'bignumber.js';
import I18n from '../../../../../../../locales/i18n';
import { getLocaleLanguageCode } from '../../../../../../components/hooks/useFormatters';
import { formatWithThreshold } from '../../../../../../util/assets';

const FIAT_THRESHOLD = 0.01;
const TRX_THRESHOLD = 0.00001;

export interface TronStakingRewardsSummaryParams {
  trxStakingRewards: Asset | undefined;
  totalStakedTrx: number;
  apyDecimal: string | null;
  isApyLoading: boolean;
  nonEvmFiatRate: number | undefined;
  currentCurrency: string | undefined;
  chainId: string;
}

export interface TronStakingRewardsSummaryResult {
  totalSubtitle: string;
  /** When null, show loading skeleton for estimated row subtitle */
  estimatedSubtitle: string | null;
  showEstimatedSkeleton: boolean;
}

function formatTrxTokenAmount(amount: number, chainId: string): string {
  const maxFractionDigits =
    MULTICHAIN_NETWORK_DECIMAL_PLACES[chainId as CaipChainId] ?? 5;
  return formatWithThreshold(amount, TRX_THRESHOLD, I18n.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  });
}

function formatFiatAmount(amount: number, currencyCode: string): string {
  return formatWithThreshold(amount, FIAT_THRESHOLD, getLocaleLanguageCode(), {
    style: 'currency',
    currency: currencyCode,
  });
}

/**
 * Pure summary builder for Tron staking rewards rows (unit-tested without Redux).
 */
export function buildTronStakingRewardsSummary({
  trxStakingRewards,
  totalStakedTrx,
  apyDecimal,
  isApyLoading,
  nonEvmFiatRate,
  currentCurrency,
  chainId,
}: TronStakingRewardsSummaryParams): TronStakingRewardsSummaryResult {
  const currency = (currentCurrency ?? 'USD').toUpperCase();

  const balanceNum = parseFloat(trxStakingRewards?.balance || '0');
  const trxPart = `${formatTrxTokenAmount(balanceNum, chainId)} TRX`;

  let fiatPart: string;
  const fiatBalanceRaw = trxStakingRewards?.fiat?.balance;
  const fiatCurrency = trxStakingRewards?.fiat?.currency;
  if (fiatBalanceRaw != null && fiatCurrency) {
    const fiatNum =
      typeof fiatBalanceRaw === 'number'
        ? fiatBalanceRaw
        : parseFloat(String(fiatBalanceRaw));
    if (!Number.isNaN(fiatNum)) {
      fiatPart = formatFiatAmount(fiatNum, fiatCurrency);
    } else if (nonEvmFiatRate != null && nonEvmFiatRate > 0) {
      fiatPart = formatFiatAmount(balanceNum * nonEvmFiatRate, currency);
    } else {
      fiatPart = formatFiatAmount(0, currency);
    }
  } else if (nonEvmFiatRate != null && nonEvmFiatRate > 0) {
    fiatPart = formatFiatAmount(balanceNum * nonEvmFiatRate, currency);
  } else {
    fiatPart = formatFiatAmount(0, currency);
  }

  const totalSubtitle = `${fiatPart} · ${trxPart}`;

  if (isApyLoading) {
    return {
      totalSubtitle,
      estimatedSubtitle: null,
      showEstimatedSkeleton: true,
    };
  }

  if (!apyDecimal) {
    const placeholder = '—';
    return {
      totalSubtitle,
      estimatedSubtitle: `${placeholder} · ${placeholder}`,
      showEstimatedSkeleton: false,
    };
  }

  const stakingApr = new BigNumber(apyDecimal).dividedBy(100);
  const baseStaked = new BigNumber(totalStakedTrx);
  const reward = baseStaked.multipliedBy(stakingApr);
  const rewardRounded = reward.decimalPlaces(3, BigNumber.ROUND_HALF_UP);

  const estimatedTrxStr = `${rewardRounded
    .toNumber()
    .toLocaleString(undefined, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    })} TRX`;

  const estimatedTrxNum = rewardRounded.toNumber();
  let estimatedFiatPart: string;
  if (nonEvmFiatRate != null && nonEvmFiatRate > 0) {
    estimatedFiatPart = formatFiatAmount(
      estimatedTrxNum * nonEvmFiatRate,
      currency,
    );
  } else {
    estimatedFiatPart = formatFiatAmount(0, currency);
  }

  return {
    totalSubtitle,
    estimatedSubtitle: `${estimatedFiatPart} · ${estimatedTrxStr}`,
    showEstimatedSkeleton: false,
  };
}
