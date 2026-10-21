import { isVbaRegionEnabled } from './isVbaRegionEnabled';

/**
 * Fiat code configured by LaunchDarkly or carried on a route.
 *
 * `buildMusdAutorampRequest` takes `sourceCurrencyCode: string`. After trim
 * and uppercase this is any three ASCII letters, the ISO 4217 shape, and not
 * a fixed BRL, USD, or EUR set. `moneyMovementNeobank.regionCurrencies` and
 * `defaultCurrency` are the configured source of truth.
 */
export type VbaCurrencyCode = string;

const VBA_CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

/**
 * Deposit details this client can render.
 *
 * This is a rendering capability, not a second currency configuration.
 * LaunchDarkly decides which codes are configured. PIX details exist for BRL
 * and US bank details exist for USD. `DepositInstructions` is Pix or UsBank,
 * so EUR and any other configured code stay hidden and fail closed until a
 * details screen exists for that rail. Do not add a code here to let the flag
 * selector return it. The selector already keeps every valid three-letter code.
 */
const VBA_RENDERABLE_DEPOSIT_CURRENCIES: ReadonlySet<VbaCurrencyCode> = new Set(
  ['BRL', 'USD'],
);

/**
 * Trim and uppercase a fiat code.
 *
 * Accepts a non-empty three-letter ASCII code. Missing, non-string, blank,
 * and malformed values are dropped. This does not enumerate currencies.
 *
 * @param currency - Raw currency field or route param.
 * @returns The normalized code, or undefined when the value is unusable.
 */
export function normalizeVbaCurrencyCode(
  currency: unknown,
): VbaCurrencyCode | undefined {
  if (typeof currency !== 'string') {
    return undefined;
  }
  const normalized = currency.trim().toUpperCase();
  if (!VBA_CURRENCY_CODE_PATTERN.test(normalized)) {
    return undefined;
  }
  return normalized;
}

/**
 * Whether this binary can show deposit instructions for a configured code.
 *
 * @param currency - Normalized fiat code.
 * @returns True for BRL (PIX) and USD (US bank) only.
 */
export function canRenderVbaDepositCurrency(
  currency: VbaCurrencyCode,
): boolean {
  return VBA_RENDERABLE_DEPOSIT_CURRENCIES.has(currency);
}

/**
 * Currencies the Choose Currency screen may offer.
 *
 * Dedupes `regionCurrencies` values, then appends `defaultCurrency` when it
 * is set and not already included. The result is intersected with currencies
 * whose deposit details this client can render. Unconfigured codes are absent.
 * EUR stays absent until a EUR details screen exists.
 *
 * @param regionCurrencies - Normalized country-to-fiat map from the flag.
 * @param defaultCurrency - Normalized default from the flag, when set.
 * @returns Renderable configured codes, in map order with the default last.
 */
export function getVbaChoosableCurrencies(
  regionCurrencies: Readonly<Record<string, VbaCurrencyCode>>,
  defaultCurrency?: VbaCurrencyCode,
): VbaCurrencyCode[] {
  const seen = new Set<string>();
  const currencies: VbaCurrencyCode[] = [];
  const add = (currency: VbaCurrencyCode | undefined) => {
    if (
      !currency ||
      seen.has(currency) ||
      !canRenderVbaDepositCurrency(currency)
    ) {
      return;
    }
    seen.add(currency);
    currencies.push(currency);
  };
  for (const currency of Object.values(regionCurrencies)) {
    add(currency);
  }
  add(defaultCurrency);
  return currencies;
}

/**
 * Route param that may create an account.
 *
 * Blank and malformed values are rejected. A valid code this client cannot
 * render fails closed, including an explicit EUR param.
 *
 * @param value - `sourceCurrency` from the details route.
 * @returns A renderable code, or undefined when nothing should be created.
 */
export function readVbaRouteSourceCurrency(
  value: unknown,
): VbaCurrencyCode | undefined {
  const code = normalizeVbaCurrencyCode(value);
  if (!code || !canRenderVbaDepositCurrency(code)) {
    return undefined;
  }
  return code;
}

/**
 * Display name for a fiat code.
 *
 * Uses `Intl.DisplayNames` when the runtime provides it. React Native 0.83
 * Hermes includes it; older notes in `locales/i18n.js` are why the code itself
 * is the fallback. This does not invent a country from the currency.
 *
 * @param currency - Normalized fiat code.
 * @param locale - App locale, when one is selected.
 * @returns A localized currency name, or the code when naming is unavailable.
 */
export function getVbaCurrencyDisplayName(
  currency: VbaCurrencyCode,
  locale?: string,
): string {
  const DisplayNames = Intl.DisplayNames;
  if (typeof DisplayNames !== 'function') {
    return currency;
  }
  try {
    const name = new DisplayNames(locale ? [locale] : undefined, {
      type: 'currency',
    }).of(currency);
    return name || currency;
  } catch {
    return currency;
  }
}

/**
 * Picks the autoramp fiat from a GeolocationController location.
 *
 * Only the leading country segment is used, so `US-CA` reads as `US`. Callers
 * pass `regionOverride` from `moneyMovementNeobank` when the flag sets one,
 * otherwise the IP country. That country must be in `regions`; a country
 * outside the list creates nothing.
 * An explicit `regionCurrencies` entry wins. Otherwise `defaultCurrency` is
 * used. A missing mapping or a missing default fails closed. An explicit
 * currency this client cannot render also fails closed and does not fall
 * through to `defaultCurrency`.
 *
 * @param location - Effective location, such as `BR` or `US-CA`.
 * @param regionCurrencies - Country-to-currency map from the remote flag.
 * @param regions - Enabled country codes from the remote flag.
 * @param defaultCurrency - Fiat for an enabled region with no explicit entry.
 * @returns The fiat to create, or undefined when nothing should be created.
 */
export function getVbaSourceCurrencyForCountry(
  location: string | undefined | null,
  regionCurrencies: Readonly<Record<string, VbaCurrencyCode>>,
  regions: readonly string[],
  defaultCurrency?: VbaCurrencyCode,
): VbaCurrencyCode | undefined {
  if (!location || !isVbaRegionEnabled(location, regions)) {
    return undefined;
  }
  const country = location.trim().toUpperCase().split('-')[0];
  const explicit = regionCurrencies[country];
  if (explicit) {
    return canRenderVbaDepositCurrency(explicit) ? explicit : undefined;
  }
  if (!defaultCurrency || !canRenderVbaDepositCurrency(defaultCurrency)) {
    return undefined;
  }
  return defaultCurrency;
}
