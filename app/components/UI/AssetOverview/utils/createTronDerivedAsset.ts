import I18n from '../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../util/assets';
import { TokenI } from '../../Tokens/types';

const MINIMUM_DISPLAY_THRESHOLD = 0.00001;

function formatTrxBalance(amount: number | string | undefined): string {
  const value = Number(amount) || 0;
  return formatWithThreshold(value, MINIMUM_DISPLAY_THRESHOLD, I18n.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 5,
  });
}

export function createReadyForWithdrawalTrxAsset(
  base: TokenI,
  amount?: number | string,
): TokenI {
  return {
    ...base,
    name: 'Ready for Withdrawal',
    symbol: 'rfwTRX',
    ticker: 'rfwTRX',
    isStaked: false,
    balance: formatTrxBalance(amount),
  };
}

export function createStakingRewardsTrxAsset(
  base: TokenI,
  amount?: number | string,
): TokenI {
  return {
    ...base,
    name: 'Staking Rewards',
    symbol: 'srTRX',
    ticker: 'srTRX',
    isStaked: false,
    balance: formatTrxBalance(amount),
  };
}

export function createInLockPeriodTrxAsset(
  base: TokenI,
  amount?: number | string,
): TokenI {
  return {
    ...base,
    name: 'In Lock Period',
    symbol: 'ilpTRX',
    ticker: 'ilpTRX',
    isStaked: false,
    balance: formatTrxBalance(amount),
  };
}
