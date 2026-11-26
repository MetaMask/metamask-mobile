import BigNumber from 'bignumber.js';
import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { MUSD_TOKEN } from '../../Earn/constants/musd';

export function formatMusdAmount(
  amount: BigNumber,
  isIncoming: boolean,
): string {
  const formatted = getIntlNumberFormatter(I18n.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  }).format(amount.toNumber());
  return `${isIncoming ? '+' : '-'}${formatted} ${MUSD_TOKEN.symbol}`;
}
