// Price formatting for TradingView's `custom_formatters.priceFormatterFactory`.
//
// Ported from chartLogic.js: SUBSCRIPT_DIGITS_CROSSHAIR / toSubscriptDigitsCrosshair
// (~line 1328), formatSubscriptNotationCrosshair (~1350), formatCrosshairPrice
// (~1373), advancedChartPriceFormatterFactory (~1397).
//
// This is a TV widget option, not a message handler — the factory returns a
// { format(price) } object that TV uses to render the price scale + last-value
// pill. Without it, TV falls back to a plain `x.xx` format that ignores our
// `useSubscriptPriceFormat` config.

const SUBSCRIPT_DIGITS = [
  '₀',
  '₁',
  '₂',
  '₃',
  '₄',
  '₅',
  '₆',
  '₇',
  '₈',
  '₉',
] as const;

function toSubscriptDigits(n: number): string {
  return String(n)
    .split('')
    .map((digit) => SUBSCRIPT_DIGITS[Number.parseInt(digit, 10)] ?? digit)
    .join('');
}

/**
 * For values strictly between 0 and 0.0001, produces the compact
 * `0.0₆12345` notation. Returns `null` when the value doesn't qualify so
 * callers can fall through to Intl formatting.
 */
export function formatSubscriptNotation(abs: number): string | null {
  if (!(abs > 0 && abs < 0.0001)) return null;
  const priceStr = abs.toFixed(20);
  const match = /^0\.0*([1-9]\d*)/.exec(priceStr);
  if (!match) return null;
  const leadingZeros = priceStr.indexOf(match[1]) - 2;
  if (leadingZeros < 4) return null;
  const sig = match[1];
  const significantDigits =
    sig.slice(0, 4).replace(/0{1,4}$/, '') || sig.slice(0, 2);
  return `0.0${toSubscriptDigits(leadingZeros)}${significantDigits}`;
}

export function getConfiguredPriceDecimals(): number | null {
  const decimals = window.CONFIG?.priceDecimals;
  if (typeof decimals !== 'number' || !Number.isFinite(decimals)) {
    return null;
  }
  return Math.max(0, Math.floor(decimals));
}

export function formatPriceWithConfiguredDecimals(
  price: unknown,
  maxDecimals: number,
): string {
  const p = Number(price);
  if (p === 0) {
    return '0';
  }

  const abs = Math.abs(p);
  let decimals = maxDecimals;

  if (abs >= 1) {
    const integerDigits = Math.floor(Math.log10(abs)) + 1;
    decimals = Math.min(maxDecimals, Math.max(0, 5 - integerDigits));
  }

  const rounded = Number(p.toFixed(decimals));
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(rounded);
}

/**
 * Formats a price for the TV built-in price scale + crosshair label. Zero-
 * safe. Numbers below 0.0001 use subscript notation; others use Intl decimal.
 */
export function formatCrosshairPrice(price: unknown): string {
  if (price === undefined || price === null || Number.isNaN(Number(price))) {
    return '';
  }
  const p = Number(price);
  if (p === 0) return '0.00';
  const abs = Math.abs(p);
  const sub = formatSubscriptNotation(abs);
  if (sub) {
    return p < 0 ? `-${sub}` : sub;
  }
  const configuredPriceDecimals = getConfiguredPriceDecimals();
  if (configuredPriceDecimals !== null) {
    return formatPriceWithConfiguredDecimals(p, configuredPriceDecimals);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: abs >= 1 ? 2 : 4,
  }).format(p);
}

interface TVSymbolInfo {
  format?: string;
}

interface TVPriceFormatter {
  format(price: number, signPositive?: boolean): string;
}

/**
 * TradingView `custom_formatters.priceFormatterFactory`. Returns null (letting
 * TV fall back to its default) when subscript formatting is disabled or when
 * the symbol is a volume series. Otherwise returns a formatter that routes
 * through `formatCrosshairPrice`.
 */
export function advancedChartPriceFormatterFactory(
  symbolInfo: TVSymbolInfo | null,
  _minTick: unknown,
): TVPriceFormatter | null {
  if (symbolInfo === null || symbolInfo.format === 'volume') {
    return null;
  }
  if (
    !window.CONFIG ||
    (!window.CONFIG.useSubscriptPriceFormat &&
      getConfiguredPriceDecimals() === null)
  ) {
    return null;
  }
  return {
    format(price) {
      return formatCrosshairPrice(price);
    },
  };
}
