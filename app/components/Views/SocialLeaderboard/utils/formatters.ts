import {
  formatPerpsFiat,
  formatPercentage,
  formatOrderCardDate,
} from '../../../UI/Perps/utils/formatUtils';
import { addThousandsSeparator } from './numberFormatting';

export function formatUsd(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  const sign = value < 0 ? '-' : '';
  return sign + formatPerpsFiat(Math.abs(value), { stripTrailingZeros: false });
}

export function formatTokenAmount(value: number): string {
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const [whole, frac = ''] = abs.toString().split('.');
  const commaWhole = addThousandsSeparator(whole);
  return frac ? `${sign}${commaWhole}.${frac}` : `${sign}${commaWhole}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  return formatPercentage(value, 0);
}

export function formatTradeDate(timestamp: number): string {
  return formatOrderCardDate(timestamp);
}
