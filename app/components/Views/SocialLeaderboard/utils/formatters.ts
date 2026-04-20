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
  // Trade timestamps from the social API are in seconds.
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  const dateStr = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${dateStr} at ${timeStr}`;
}
