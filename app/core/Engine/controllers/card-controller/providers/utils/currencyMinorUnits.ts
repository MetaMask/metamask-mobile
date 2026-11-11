const CURRENCY_MINOR_UNITS: Record<string, number> = {
  BHD: 3,
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  IQD: 3,
  ISK: 0,
  JOD: 3,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  PYG: 0,
  RWF: 0,
  TND: 3,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
};

export function getCurrencyMinorUnits(currency: string): number {
  return CURRENCY_MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

export function minorUnitsToDecimal(amount: string, currency: string): string {
  const exponent = getCurrencyMinorUnits(currency);
  if (exponent === 0) {
    return amount.replace(/^0+(?=\d)/u, '') || '0';
  }

  const negative = amount.startsWith('-');
  const digits =
    (negative ? amount.slice(1) : amount).replace(/\D/gu, '') || '0';
  const padded = digits.padStart(exponent + 1, '0');
  const whole = padded.slice(0, -exponent);
  const fraction = padded.slice(-exponent).replace(/0+$/u, '');
  const decimal = fraction.length > 0 ? `${whole}.${fraction}` : whole;
  return negative ? `-${decimal}` : decimal;
}
