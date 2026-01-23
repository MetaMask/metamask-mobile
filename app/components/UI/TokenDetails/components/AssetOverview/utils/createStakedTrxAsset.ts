import I18n from '../../../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../../../util/assets';
import { TokenI } from '../../../../Tokens/types';

export function createStakedTrxAsset(
  base: TokenI,
  energyBal?: number | string,
  bandwidthBal?: number | string,
): TokenI {
  const minimumDisplayThreshold = 0.00001;
  const sum = (Number(energyBal) || 0) + (Number(bandwidthBal) || 0);

  return {
    ...base,
    name: 'Staked TRX',
    symbol: 'sTRX',
    ticker: 'sTRX',
    isStaked: true,
    balance: formatWithThreshold(sum, minimumDisplayThreshold, I18n.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 5,
    }),
  };
}
