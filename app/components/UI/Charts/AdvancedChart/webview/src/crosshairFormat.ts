const SUBSCRIPT_DIGITS: readonly string[] = [
  '\u2080',
  '\u2081',
  '\u2082',
  '\u2083',
  '\u2084',
  '\u2085',
  '\u2086',
  '\u2087',
  '\u2088',
  '\u2089',
];

/**
 * Converts a non-negative integer to its Unicode subscript representation.
 * e.g. 42 → "₄₂"
 */
export function toSubscriptDigits(n: number): string {
  return String(n)
    .split('')
    .map((digit) => SUBSCRIPT_DIGITS[parseInt(digit, 10)])
    .join('');
}

/**
 * For tiny prices (0 < abs < 0.0001 with ≥4 leading zeros after the decimal),
 * returns subscript notation like "0.0₇1234". Returns null if not applicable.
 */
export function formatSubscriptNotation(abs: number): string | null {
  if (abs <= 0 || abs >= 0.0001) {
    return null;
  }

  const priceStr = abs.toFixed(20);
  const match = priceStr.match(/^0\.0*([1-9]\d*)/);
  if (!match) {
    return null;
  }

  const leadingZeros = priceStr.indexOf(match[1]) - 2;
  if (leadingZeros < 4) {
    return null;
  }

  const sig = match[1];
  const significantDigits =
    sig.slice(0, 4).replace(/0{1,4}$/, '') || sig.slice(0, 2);

  return '0.0' + toSubscriptDigits(leadingZeros) + significantDigits;
}

/**
 * Formats a price for the crosshair overlay — number only, no currency symbol.
 * Tiny prices use subscript notation; larger prices use Intl formatting.
 */
export function formatCrosshairPrice(price: unknown): string {
  if (price === undefined || price === null || isNaN(Number(price))) {
    return '';
  }

  const p = Number(price);
  if (p === 0) {
    return '0.00';
  }

  const abs = Math.abs(p);
  const sub = formatSubscriptNotation(abs);
  if (sub) {
    return p < 0 ? '-' + sub : sub;
  }

  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: abs >= 1 ? 2 : 4,
  }).format(p);
}

/**
 * Formats a Unix timestamp (seconds) into "Wed 20 May '26 14:05" for the
 * crosshair time label.
 */
export function formatCrosshairTime(timeSeconds: unknown): string {
  if (
    timeSeconds === undefined ||
    timeSeconds === null ||
    isNaN(Number(timeSeconds))
  ) {
    return '';
  }

  const d = new Date(Number(timeSeconds) * 1000);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const w = weekdays[d.getDay()];
  const day = d.getDate();
  const mo = months[d.getMonth()];
  const y = String(d.getFullYear()).slice(-2);
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return w + ' ' + day + ' ' + mo + " '" + y + ' ' + h + ':' + min;
}
