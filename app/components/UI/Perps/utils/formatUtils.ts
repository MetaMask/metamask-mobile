/**
 * Shared formatting utilities for Perps components
 */
import { BigNumber } from 'bignumber.js';
import I18n, { strings } from '../../../../../locales/i18n';
import {
  getIntlDateTimeFormatter,
  getIntlNumberFormatter,
} from '../../../../util/intl';
import { getFormatters } from '../../../hooks/useFormatters';
import { bpsToPercent } from '../constants/slippageConfig';
import {
  type FiatRangeConfig,
  type PerpsCompactFormatOptions,
  type PerpsDisplayFormatOptions,
  type PerpsFiatFormatOptions,
  type PerpsFundingRateFormatOptions,
  type PerpsOrderBookPriceFormat,
  type PerpsOrderBookPriceFormatOptions,
  type PerpsPercentageFormatOptions,
  type PerpsSignDisplay,
  formatFundingRate as formatFundingRateEnUs,
  formatHyperLiquidPrice,
  formatLiquidationDistance as formatLiquidationDistanceEnUs,
  formatPercentage as formatPercentageEnUs,
  formatPerpsCompact as formatPerpsCompactEnUs,
  formatPerpsFiat as formatPerpsFiatEnUs,
  formatPerpsOrderBookPrice as formatPerpsOrderBookPriceEnUs,
  formatPnl as formatPnlEnUs,
  formatPositionSize as formatPositionSizeEnUs,
  formatWithSignificantDigits,
  PERPS_CONSTANTS,
  PERPS_DISPLAY_PRECISION,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '@metamask/perps-controller';

// Decimal formatters moved to controller for cross-platform sharing
export type { FiatRangeConfig };
export {
  PRICE_THRESHOLD,
  formatWithSignificantDigits,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '@metamask/perps-controller';

/*
 * The perps-controller display formatters, bound to the app language. This is
 * the one place Mobile injects `createFormatters({ locale })` (cached per
 * language by `getFormatters`). Display code uses these wrappers; execution
 * values (order sizes and prices sent to the venue) use the locale-free Core
 * functions directly.
 */

type PerpsDisplayValue = string | number | null | undefined;

const toDisplayOptions = (
  decimalsOrOptions?: number | PerpsDisplayFormatOptions,
): PerpsDisplayFormatOptions =>
  typeof decimalsOrOptions === 'number'
    ? { decimals: decimalsOrOptions }
    : { ...decimalsOrOptions };

/** Core `formatPnl` in the app language. */
export const formatPnl = (
  pnl: PerpsDisplayValue,
  options?: PerpsDisplayFormatOptions,
): string => formatPnlEnUs(pnl, { formatters: getFormatters(), ...options });

/** Core `formatPercentage` in the app language. */
export const formatPercentage = (
  value: PerpsDisplayValue,
  decimalsOrOptions?: number | PerpsPercentageFormatOptions,
): string =>
  formatPercentageEnUs(value, {
    formatters: getFormatters(),
    ...(typeof decimalsOrOptions === 'number'
      ? { decimals: decimalsOrOptions }
      : decimalsOrOptions),
  });

/** Core `formatFundingRate` in the app language. */
export const formatFundingRate = (
  value?: PerpsDisplayValue,
  options?: PerpsFundingRateFormatOptions,
): string =>
  formatFundingRateEnUs(value, { formatters: getFormatters(), ...options });

/** Core `formatPositionSize` in the app language. */
export const formatPositionSize = (
  size: PerpsDisplayValue,
  szDecimalsOrOptions?: number | PerpsDisplayFormatOptions,
): string =>
  formatPositionSizeEnUs(size, {
    formatters: getFormatters(),
    ...toDisplayOptions(szDecimalsOrOptions),
  });

/**
 * Core `formatPercentage` without its trailing `%`, for locale templates that
 * place the `%` themselves (e.g. `"Est: {{est}}% / Max: {{value}}%"`).
 * Unsigned unless `sign` says otherwise.
 */
export const formatPercentageNumber = (
  value: PerpsDisplayValue,
  options?: PerpsPercentageFormatOptions,
): string =>
  formatPercentage(value, { sign: 'never', ...options }).replace(/%$/u, '');

/**
 * A max slippage setting (bps) for locale templates that place the `%`
 * themselves, without trailing zeros as the user picked it: 300 → `3`,
 * 50 → `0.5`.
 */
export const formatMaxSlippageNumber = (bps: number): string =>
  formatPercentageNumber(bpsToPercent(bps), { stripTrailingZeros: true });

/** Core `formatPerpsFiat` in the app language. */
export const formatPerpsFiat = (
  balance: PerpsDisplayValue,
  options?: PerpsFiatFormatOptions,
): string =>
  formatPerpsFiatEnUs(balance, { formatters: getFormatters(), ...options });

/** Core `formatPerpsCompact` in the app language, e.g. `$1.23M`. */
export const formatPerpsCompact = (
  value: PerpsDisplayValue,
  options: PerpsCompactFormatOptions,
): string =>
  formatPerpsCompactEnUs(value, { formatters: getFormatters(), ...options });

/** Core `formatPerpsOrderBookPrice` in the app language. */
export const formatPerpsOrderBookPrice = (
  price: PerpsDisplayValue,
  format: PerpsOrderBookPriceFormat | null,
  options?: PerpsOrderBookPriceFormatOptions,
): string =>
  formatPerpsOrderBookPriceEnUs(price, format, {
    formatters: getFormatters(),
    ...options,
  });

/**
 * A USD amount at cents precision with grouping, e.g. `+$1,234.50`, for
 * history amounts, fees and balances that always show cents. A nonzero amount
 * under a cent shows Core's `<$0.01`.
 */
export const formatPerpsUsdCents = (
  amount: PerpsDisplayValue | BigNumber,
  sign: PerpsSignDisplay = 'auto',
): string =>
  formatPerpsFiat(BigNumber.isBigNumber(amount) ? amount.toString() : amount, {
    minimumDecimals: PERPS_DISPLAY_PRECISION.Fee,
    maximumDecimals: PERPS_DISPLAY_PRECISION.Fee,
    stripTrailingZeros: false,
    sign,
  });

const DEFAULT_PERPS_LOCALE = 'en-US';

interface PerpsLocaleSeparators {
  grouping: string;
  decimal: string;
}

const getCurrentPerpsLocale = (locale?: string): string =>
  locale || I18n?.locale || DEFAULT_PERPS_LOCALE;

const getPerpsNumberFormatter = (
  locale: string | undefined,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat => {
  try {
    return getIntlNumberFormatter(getCurrentPerpsLocale(locale), options);
  } catch {
    return getIntlNumberFormatter(DEFAULT_PERPS_LOCALE, options);
  }
};

interface PerpsLocaleGrouping {
  groupingSeparator: string;
  primaryGroupSize: number;
  secondaryGroupSize: number;
  localizedDigits: readonly string[];
}

const perpsLocaleGroupingCache = new Map<string, PerpsLocaleGrouping>();

/**
 * Reads locale grouping rules from a safe integer without relying on BigInt or
 * NumberFormat.formatToParts, which is not available in every app runtime.
 */
const getPerpsLocaleGrouping = (locale?: string): PerpsLocaleGrouping => {
  const currentLocale = getCurrentPerpsLocale(locale);
  const cachedGrouping = perpsLocaleGroupingCache.get(currentLocale);

  if (cachedGrouping) {
    return cachedGrouping;
  }

  const groupingFormatter = getPerpsNumberFormatter(locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
  });
  const digitFormatter = getPerpsNumberFormatter(locale, {
    useGrouping: false,
    maximumFractionDigits: 0,
  });
  const localizedDigits = Array.from({ length: 10 }, (_, digitValue) =>
    digitFormatter.format(digitValue),
  );
  const localizedDigitEntries = localizedDigits
    .map((formattedDigit, digitValue) => ({
      formattedDigit,
      digitValue: String(digitValue),
    }))
    .sort(
      (leftEntry, rightEntry) =>
        rightEntry.formattedDigit.length - leftEntry.formattedDigit.length,
    );
  const formattedSample = groupingFormatter.format(1234567890123);
  const groupSizes: number[] = [];
  let currentGroupSize = 0;
  let pendingSeparator = '';
  let groupingSeparator = '';
  let position = 0;

  while (position < formattedSample.length) {
    let matchedDigit: (typeof localizedDigitEntries)[number] | undefined;

    for (const localizedDigitEntry of localizedDigitEntries) {
      if (
        formattedSample.startsWith(localizedDigitEntry.formattedDigit, position)
      ) {
        matchedDigit = localizedDigitEntry;
        break;
      }
    }

    if (matchedDigit) {
      if (pendingSeparator) {
        if (currentGroupSize > 0) {
          groupSizes.push(currentGroupSize);
          groupingSeparator = pendingSeparator;
          currentGroupSize = 0;
        }

        pendingSeparator = '';
      }

      currentGroupSize += 1;
      position += matchedDigit.formattedDigit.length;
      continue;
    }

    pendingSeparator += formattedSample.charAt(position);
    position += 1;
  }

  if (currentGroupSize > 0) {
    groupSizes.push(currentGroupSize);
  }

  const primaryGroupSize = groupSizes[groupSizes.length - 1] || 3;
  const secondaryGroupSize =
    groupSizes[groupSizes.length - 2] || primaryGroupSize;
  const localeGrouping = {
    groupingSeparator,
    primaryGroupSize,
    secondaryGroupSize,
    localizedDigits,
  };

  perpsLocaleGroupingCache.set(currentLocale, localeGrouping);

  return localeGrouping;
};

const getPerpsLocaleSeparators = (locale?: string): PerpsLocaleSeparators => {
  const localeGrouping = getPerpsLocaleGrouping(locale);
  const groupingFormatter = getPerpsNumberFormatter(locale, {
    useGrouping: true,
    maximumFractionDigits: 0,
  });
  const decimalFormatter = getPerpsNumberFormatter(locale, {
    useGrouping: false,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const groupedInteger = Array.from(groupingFormatter.format(1000));
  const formattedDecimal = Array.from(decimalFormatter.format(1.1));
  const localizedDigits = new Set(localeGrouping.localizedDigits);
  const decimalSeparators = formattedDecimal.filter(
    (character) => !localizedDigits.has(character),
  );

  return {
    grouping:
      localeGrouping.groupingSeparator ||
      groupedInteger.slice(1, -3).join('') ||
      ',',
    decimal: decimalSeparators.join('') || '.',
  };
};

const normalizePerpsLocalizedDigits = (
  value: string,
  localeGrouping: PerpsLocaleGrouping,
): string => {
  const localizedDigitEntries = localeGrouping.localizedDigits.map(
    (localizedDigit, digitValue) => ({
      localizedDigit,
      digitValue: String(digitValue),
    }),
  );
  let normalizedValue = '';

  for (let position = 0; position < value.length; ) {
    const localizedDigitEntry = localizedDigitEntries.find(
      ({ localizedDigit }) => value.startsWith(localizedDigit, position),
    );

    if (localizedDigitEntry) {
      normalizedValue += localizedDigitEntry.digitValue;
      position += localizedDigitEntry.localizedDigit.length;
    } else {
      normalizedValue += value[position];
      position += 1;
    }
  }

  return normalizedValue;
};

export interface PerpsInputSelection {
  start: number;
  end: number;
}

export interface NormalizePerpsNumericInputContext {
  previousDisplayValue: string;
  previousSelection?: PerpsInputSelection;
}

const isLocaleGroupedInteger = (
  value: string,
  localeGrouping: PerpsLocaleGrouping,
): boolean => {
  const { groupingSeparator, primaryGroupSize, secondaryGroupSize } =
    localeGrouping;
  const unsignedValue = value.replace(/^[+-]/, '');
  const integerGroups = unsignedValue.split(groupingSeparator);

  if (
    !groupingSeparator ||
    integerGroups.length < 2 ||
    integerGroups.some((integerGroup) => !/^\d+$/.test(integerGroup))
  ) {
    return false;
  }

  const firstGroup = integerGroups[0];
  const groupedDigits = integerGroups.slice(1);

  return (
    firstGroup.length > 0 &&
    firstGroup.length <= secondaryGroupSize &&
    groupedDigits.every(
      (integerGroup, index) =>
        integerGroup.length ===
        (index === groupedDigits.length - 1
          ? primaryGroupSize
          : secondaryGroupSize),
    )
  );
};

/**
 * Groups and localizes an integer string without converting its value to a
 * JavaScript number.
 */
const formatIntegerWithLocaleGrouping = (
  integerPart: string,
  localeGrouping: PerpsLocaleGrouping,
): string => {
  const integerGroups: string[] = [];
  let remainingDigits = integerPart;
  let nextGroupSize = localeGrouping.primaryGroupSize;

  while (
    localeGrouping.groupingSeparator &&
    remainingDigits.length > nextGroupSize
  ) {
    integerGroups.unshift(remainingDigits.slice(-nextGroupSize));
    remainingDigits = remainingDigits.slice(0, -nextGroupSize);
    nextGroupSize = localeGrouping.secondaryGroupSize;
  }

  integerGroups.unshift(remainingDigits);

  return integerGroups
    .map((integerGroup) =>
      Array.from(integerGroup, (digit) => {
        const digitIndex = digit.charCodeAt(0) - 48;
        return localeGrouping.localizedDigits[digitIndex] ?? digit;
      }).join(''),
    )
    .join(localeGrouping.groupingSeparator);
};

/**
 * Localizes a canonical decimal string without converting the fractional part
 * to a number. This preserves precision and trailing zeros in editable values.
 */
const formatNumericStringWithLocale = (
  value: string,
  locale?: string,
): string => {
  const match = value.match(/^([+-]?)(\d*)(?:\.(\d*))?$/);

  if (!match || (match[2] === '' && match[3] === undefined)) {
    return value;
  }

  const sign = match[1] ?? '';
  const integerPart = match[2] || '0';
  const decimalPart = match[3];
  const localeGrouping = getPerpsLocaleGrouping(locale);
  const separators = getPerpsLocaleSeparators(locale);
  const formattedInteger = formatIntegerWithLocaleGrouping(
    integerPart,
    localeGrouping,
  );

  return `${sign}${formattedInteger}${
    decimalPart === undefined ? '' : `${separators.decimal}${decimalPart}`
  }`;
};

/**
 * Normalizes a user-entered perps number to the canonical `.` decimal form.
 *
 * The active locale determines the meaning of a single separator. When both
 * comma and period are present, the last one is treated as the decimal
 * separator so both locale-formatted and controller-formatted values can be
 * parsed safely.
 * The locale-blind `normalizeToDotDecimal` utility cannot distinguish a
 * grouping separator from a decimal separator for inputs such as `1,200`.
 */
const normalizePerpsCanonicalValue = (
  sanitizedValue: string,
): string | undefined => {
  if (!/^[+-]?[\d.]*$/.test(sanitizedValue)) {
    return undefined;
  }

  const sign = /^[+-]/.test(sanitizedValue) ? sanitizedValue.slice(0, 1) : '';
  const unsignedValue = sign ? sanitizedValue.slice(1) : sanitizedValue;
  let normalizedValue = '';
  let hasDecimalSeparator = false;

  for (const character of unsignedValue) {
    if (character !== '.') {
      normalizedValue += character;
      continue;
    }

    if (!hasDecimalSeparator) {
      normalizedValue += '.';
      hasDecimalSeparator = true;
    }
  }

  return `${sign}${normalizedValue}`;
};

const normalizePerpsNumericValue = (value: string, locale?: string): string => {
  if (!value) {
    return value;
  }

  const localeGrouping = getPerpsLocaleGrouping(locale);
  const separators = getPerpsLocaleSeparators(locale);
  const localizedValue = normalizePerpsLocalizedDigits(
    value.trim().replace(/\$/g, '').replace(/\s/g, ''),
    localeGrouping,
  );
  const commaIndex = localizedValue.lastIndexOf(',');
  const periodIndex = localizedValue.lastIndexOf('.');
  let decimalSeparator: string | undefined;
  let decimalSeparatorIndex = -1;

  if (commaIndex >= 0 && periodIndex >= 0) {
    decimalSeparator = commaIndex > periodIndex ? ',' : '.';
    const lastGroupingIndex =
      decimalSeparator === ',' ? periodIndex : commaIndex;
    decimalSeparatorIndex = localizedValue.indexOf(
      decimalSeparator,
      lastGroupingIndex + 1,
    );
  } else if (commaIndex >= 0 && separators.decimal === ',') {
    decimalSeparator = ',';
    decimalSeparatorIndex = localizedValue.indexOf(',');
  } else if (periodIndex >= 0) {
    decimalSeparator =
      separators.decimal === '.' ||
      !isLocaleGroupedInteger(localizedValue, localeGrouping)
        ? '.'
        : undefined;
    decimalSeparatorIndex = decimalSeparator ? localizedValue.indexOf('.') : -1;
  } else if (localizedValue.includes(separators.decimal)) {
    decimalSeparator = separators.decimal;
    decimalSeparatorIndex = localizedValue.indexOf(separators.decimal);
  }

  let sanitizedValue = '';

  for (let index = 0; index < localizedValue.length; index += 1) {
    const character = localizedValue[index];
    const isDecimalSeparator =
      character === decimalSeparator && index === decimalSeparatorIndex;

    if (
      (character === separators.grouping && !isDecimalSeparator) ||
      ((character === ',' || character === '.') && !isDecimalSeparator)
    ) {
      continue;
    }

    sanitizedValue += isDecimalSeparator ? '.' : character;
  }

  return normalizePerpsCanonicalValue(sanitizedValue) ?? value;
};

const getPerpsPreviousSelection = ({
  previousDisplayValue,
  nextDisplayValue,
  previousSelection,
}: {
  previousDisplayValue: string;
  nextDisplayValue: string;
  previousSelection?: PerpsInputSelection;
}): PerpsInputSelection | undefined => {
  if (previousSelection) {
    return previousSelection;
  }

  if (
    nextDisplayValue.startsWith(previousDisplayValue) ||
    previousDisplayValue.startsWith(nextDisplayValue)
  ) {
    return {
      start: previousDisplayValue.length,
      end: previousDisplayValue.length,
    };
  }

  return undefined;
};

export const normalizePerpsNumericInput = (
  value: string,
  locale?: string,
  context?: NormalizePerpsNumericInputContext,
): string => {
  if (!value) {
    return value;
  }

  if (context) {
    const previousSelection = getPerpsPreviousSelection({
      previousDisplayValue: context.previousDisplayValue,
      nextDisplayValue: value,
      previousSelection: context.previousSelection,
    });
    const normalizedEdit = previousSelection
      ? normalizePerpsNumericEdit(value, locale, {
          ...context,
          previousSelection,
        })
      : undefined;

    if (normalizedEdit !== undefined) {
      return normalizedEdit;
    }
  }

  return normalizePerpsNumericValue(value, locale);
};

/**
 * Formats a canonical editable value for the current locale.
 */
export const formatPerpsInput = (value: string, locale?: string): string => {
  if (!value) {
    return value;
  }

  if (/^[+-]?\d*(?:\.\d*)?$/.test(value)) {
    return formatNumericStringWithLocale(value, locale);
  }

  return formatNumericStringWithLocale(
    normalizePerpsNumericInput(value, locale),
    locale,
  );
};

const clampInputCursor = (cursor: number, length: number): number =>
  Math.min(Math.max(cursor, 0), length);

const getPerpsFormattedTokenLength = ({
  canonicalCharacter,
  formattedValue,
  formattedIndex,
  localizedDigits,
}: {
  canonicalCharacter: string;
  formattedValue: string;
  formattedIndex: number;
  localizedDigits: readonly string[];
}): number => {
  if (formattedValue.startsWith(canonicalCharacter, formattedIndex)) {
    return canonicalCharacter.length;
  }

  const canonicalDigit = Number(canonicalCharacter);

  if (
    Number.isInteger(canonicalDigit) &&
    canonicalDigit >= 0 &&
    canonicalDigit <= 9
  ) {
    const localizedDigit = localizedDigits[canonicalDigit];

    if (
      localizedDigit &&
      formattedValue.startsWith(localizedDigit, formattedIndex)
    ) {
      return localizedDigit.length;
    }
  }

  return canonicalCharacter === '.' &&
    /\D/u.test(formattedValue[formattedIndex])
    ? 1
    : 0;
};

const mapFormattedPerpsCursorToCanonical = ({
  canonicalValue,
  formattedValue,
  formattedCursor,
  localizedDigits,
}: {
  canonicalValue: string;
  formattedValue: string;
  formattedCursor: number;
  localizedDigits: readonly string[];
}): number => {
  const boundedCursor = clampInputCursor(
    formattedCursor,
    formattedValue.length,
  );
  let canonicalIndex = 0;
  let formattedIndex = 0;

  while (
    formattedIndex < boundedCursor &&
    canonicalIndex < canonicalValue.length
  ) {
    const canonicalCharacter = canonicalValue[canonicalIndex];
    const tokenLength = getPerpsFormattedTokenLength({
      canonicalCharacter,
      formattedValue,
      formattedIndex,
      localizedDigits,
    });

    if (tokenLength > 0 && formattedIndex + tokenLength <= boundedCursor) {
      canonicalIndex += 1;
      formattedIndex += tokenLength;
    } else {
      formattedIndex += 1;
    }
  }

  return canonicalIndex;
};

const mapCanonicalPerpsCursorToFormatted = ({
  canonicalValue,
  formattedValue,
  canonicalCursor,
  localizedDigits,
}: {
  canonicalValue: string;
  formattedValue: string;
  canonicalCursor: number;
  localizedDigits: readonly string[];
}): number => {
  const boundedCursor = clampInputCursor(
    canonicalCursor,
    canonicalValue.length,
  );
  let canonicalIndex = 0;
  let formattedIndex = 0;

  while (
    formattedIndex < formattedValue.length &&
    canonicalIndex < boundedCursor
  ) {
    const canonicalCharacter = canonicalValue[canonicalIndex];
    const tokenLength = getPerpsFormattedTokenLength({
      canonicalCharacter,
      formattedValue,
      formattedIndex,
      localizedDigits,
    });

    if (tokenLength > 0) {
      canonicalIndex += 1;
      formattedIndex += tokenLength;
    } else {
      formattedIndex += 1;
    }
  }

  return formattedIndex;
};

interface PerpsDisplayEdit {
  start: number;
  end: number;
  insertedValue: string;
}

const createPerpsDisplayEdit = ({
  previousDisplayValue,
  nextDisplayValue,
  start,
  end,
}: {
  previousDisplayValue: string;
  nextDisplayValue: string;
  start: number;
  end: number;
}): PerpsDisplayEdit | undefined => {
  const prefix = previousDisplayValue.slice(0, start);
  const suffix = previousDisplayValue.slice(end);

  if (
    !nextDisplayValue.startsWith(prefix) ||
    !nextDisplayValue.endsWith(suffix) ||
    nextDisplayValue.length < prefix.length + suffix.length
  ) {
    return undefined;
  }

  return {
    start,
    end,
    insertedValue: nextDisplayValue.slice(
      prefix.length,
      nextDisplayValue.length - suffix.length,
    ),
  };
};

const getPerpsDisplayEdit = (
  previousDisplayValue: string,
  nextDisplayValue: string,
  previousSelection: PerpsInputSelection,
): PerpsDisplayEdit | undefined => {
  const selectionStart = clampInputCursor(
    previousSelection.start,
    previousDisplayValue.length,
  );
  const selectionEnd = clampInputCursor(
    Math.max(previousSelection.end, selectionStart),
    previousDisplayValue.length,
  );
  const selectedLength = selectionEnd - selectionStart;
  const insertedLength =
    nextDisplayValue.length - (previousDisplayValue.length - selectedLength);

  if (insertedLength >= 0) {
    const selectedEdit = createPerpsDisplayEdit({
      previousDisplayValue,
      nextDisplayValue,
      start: selectionStart,
      end: selectionEnd,
    });

    if (selectedEdit && selectedEdit.insertedValue.length === insertedLength) {
      return selectedEdit;
    }
  }

  if (
    selectedLength === 0 &&
    nextDisplayValue.length < previousDisplayValue.length
  ) {
    const removedLength = previousDisplayValue.length - nextDisplayValue.length;
    const deletionRanges = [
      {
        start: Math.max(selectionStart - removedLength, 0),
        end: selectionStart,
      },
      {
        start: selectionStart,
        end: Math.min(
          selectionStart + removedLength,
          previousDisplayValue.length,
        ),
      },
    ];

    for (const deletionRange of deletionRanges) {
      const deletionEdit = createPerpsDisplayEdit({
        previousDisplayValue,
        nextDisplayValue,
        ...deletionRange,
      });

      if (deletionEdit?.insertedValue === '') {
        return deletionEdit;
      }
    }
  }

  return undefined;
};

/**
 * Applies a native text edit to the canonical value represented by the
 * previous localized display. This preserves the meaning of retained grouping
 * characters instead of inferring it again from the complete next string.
 */
function normalizePerpsNumericEdit(
  value: string,
  locale: string | undefined,
  context: NormalizePerpsNumericInputContext,
): string | undefined {
  const previousSelection = context.previousSelection;

  if (!previousSelection) {
    return undefined;
  }

  const previousCanonicalValue = normalizePerpsNumericValue(
    context.previousDisplayValue,
    locale,
  );

  if (!/^[+-]?\d*(?:\.\d*)?$/.test(previousCanonicalValue)) {
    return undefined;
  }

  if (value === context.previousDisplayValue) {
    return previousCanonicalValue;
  }

  const localeGrouping = getPerpsLocaleGrouping(locale);
  const normalizedPreviousDisplay = normalizePerpsLocalizedDigits(
    context.previousDisplayValue,
    localeGrouping,
  );
  const normalizedValue = normalizePerpsLocalizedDigits(value, localeGrouping);

  if (
    normalizedPreviousDisplay.length !== context.previousDisplayValue.length ||
    normalizedValue.length !== value.length
  ) {
    return undefined;
  }

  const edit = getPerpsDisplayEdit(
    normalizedPreviousDisplay,
    normalizedValue,
    previousSelection,
  );

  if (!edit) {
    return undefined;
  }

  const canonicalStart = mapFormattedPerpsCursorToCanonical({
    canonicalValue: previousCanonicalValue,
    formattedValue: normalizedPreviousDisplay,
    formattedCursor: edit.start,
    localizedDigits: localeGrouping.localizedDigits,
  });
  const canonicalEnd = mapFormattedPerpsCursorToCanonical({
    canonicalValue: previousCanonicalValue,
    formattedValue: normalizedPreviousDisplay,
    formattedCursor: edit.end,
    localizedDigits: localeGrouping.localizedDigits,
  });
  const separators = getPerpsLocaleSeparators(locale);
  const normalizedInsertedValue =
    edit.insertedValue.length === 1 &&
    (edit.insertedValue === '.' ||
      edit.insertedValue === ',' ||
      edit.insertedValue === separators.decimal)
      ? '.'
      : normalizePerpsNumericValue(edit.insertedValue, locale);
  const editedCanonicalValue = `${previousCanonicalValue.slice(
    0,
    canonicalStart,
  )}${normalizedInsertedValue}${previousCanonicalValue.slice(canonicalEnd)}`;

  return normalizePerpsCanonicalValue(editedCanonicalValue);
}

const getPerpsDisplayCursorAfterEdit = (
  previousDisplayValue: string,
  nextDisplayValue: string,
  previousSelection: PerpsInputSelection,
): number => {
  const edit = getPerpsDisplayEdit(
    previousDisplayValue,
    nextDisplayValue,
    previousSelection,
  );

  if (edit) {
    return clampInputCursor(
      edit.start + edit.insertedValue.length,
      nextDisplayValue.length,
    );
  }

  return clampInputCursor(
    previousSelection.start +
      nextDisplayValue.length -
      previousDisplayValue.length,
    nextDisplayValue.length,
  );
};

export const getPerpsFormattedInputSelection = ({
  previousDisplayValue,
  nextDisplayValue,
  nextFormattedValue,
  previousSelection,
  locale,
}: {
  previousDisplayValue: string;
  nextDisplayValue: string;
  nextFormattedValue: string;
  previousSelection?: PerpsInputSelection;
  locale?: string;
}): PerpsInputSelection | undefined => {
  const resolvedPreviousSelection = getPerpsPreviousSelection({
    previousDisplayValue,
    nextDisplayValue,
    previousSelection,
  });

  if (!resolvedPreviousSelection) {
    return undefined;
  }

  const nextCanonicalValue = normalizePerpsNumericInput(
    nextDisplayValue,
    locale,
    {
      previousDisplayValue,
      previousSelection: resolvedPreviousSelection,
    },
  );
  const nextDisplayCursor = getPerpsDisplayCursorAfterEdit(
    previousDisplayValue,
    nextDisplayValue,
    resolvedPreviousSelection,
  );
  const localeGrouping = getPerpsLocaleGrouping(locale);
  const nextCanonicalCursor = mapFormattedPerpsCursorToCanonical({
    canonicalValue: nextCanonicalValue,
    formattedValue: nextDisplayValue,
    formattedCursor: nextDisplayCursor,
    localizedDigits: localeGrouping.localizedDigits,
  });
  const formattedCursor = mapCanonicalPerpsCursorToFormatted({
    canonicalValue: nextCanonicalValue,
    formattedValue: nextFormattedValue,
    canonicalCursor: nextCanonicalCursor,
    localizedDigits: localeGrouping.localizedDigits,
  });

  return { start: formattedCursor, end: formattedCursor };
};

/**
 * Formats a perps market price for display using Hyperliquid price precision
 * when market size decimals are known. Falls back to the shared fiat formatter
 * for generic fiat display sites.
 */
export const formatPerpsPrice = (
  price: number | string,
  options?: {
    szDecimals?: number | null;
    includeCurrencySymbol?: boolean;
  },
): string => {
  const includeCurrencySymbol = options?.includeCurrencySymbol ?? true;
  const numericPrice =
    typeof price === 'number' ? price : Number.parseFloat(String(price));

  if (Number.isNaN(numericPrice) || !Number.isFinite(numericPrice)) {
    return '$---';
  }

  const fallback = () =>
    formatPerpsFiat(price, { ranges: PRICE_RANGES_UNIVERSAL });

  if (options?.szDecimals === undefined || options.szDecimals === null) {
    return fallback();
  }

  try {
    const formattedPrice = formatHyperLiquidPrice({
      price,
      szDecimals: options.szDecimals,
    });
    if (!includeCurrencySymbol) {
      // Canonical venue price string, not a display value.
      return formattedPrice;
    }
    // Display the venue-precision price in the app language, at exactly the
    // decimals the venue precision kept.
    const decimals = formattedPrice.split('.')[1]?.length ?? 0;
    return formatPerpsFiat(formattedPrice, {
      ranges: PRICE_RANGES_UNIVERSAL,
      minimumDecimals: decimals,
      maximumDecimals: decimals,
      stripTrailingZeros: false,
    });
  } catch {
    return fallback();
  }
};

/**
 * Formats one side of a position's take profit / stop loss summary.
 *
 * A position can carry several reduce-only trigger orders on the same side, and the controller's
 * summary price then describes none of them — it reports the tally in `takeProfitCount` /
 * `stopLossCount` for clients to render instead. A single order keeps showing its trigger price,
 * whether or not it closes the whole position. Returns `null` when the side has neither, so each
 * card can apply its own empty state.
 */
export const formatPositionTriggerSummary = (params: {
  count?: number;
  price?: string | null;
  szDecimals?: number | null;
}): string | null => {
  const { count = 0, price, szDecimals } = params;

  if (count > 1) {
    return strings('perps.position.card.tpsl_count_multiple', { count });
  }

  if (price && parseFloat(price) > 0) {
    return formatPerpsPrice(price, { szDecimals });
  }

  return null;
};

/**
 * Fraction digits `PRICE_RANGES_UNIVERSAL` would use for a market price.
 * A dollar price change should use this count so it matches the price,
 * instead of picking a finer range from the change's own magnitude.
 */
export const getUniversalPriceFractionDigits = (price: number): number => {
  const absPrice = Math.abs(price);
  if (!Number.isFinite(absPrice) || absPrice === 0) {
    return 0;
  }

  const rangeConfig = PRICE_RANGES_UNIVERSAL.find((range) =>
    range.condition(absPrice),
  );

  if (!rangeConfig) {
    return 2;
  }

  if (rangeConfig.significantDigits) {
    const { decimals } = formatWithSignificantDigits(
      absPrice,
      rangeConfig.significantDigits,
      rangeConfig.minimumDecimals,
      rangeConfig.maximumDecimals,
    );
    return decimals;
  }

  return rangeConfig.maximumDecimals;
};

/**
 * Truncates a number to 2 decimal places without rounding up.
 * Uses BigNumber to avoid IEEE 754 floating-point errors
 * (e.g. `Math.floor(10.29 * 100) / 100` = 10.28).
 */
export const truncateToTwoDecimals = (value: number): number =>
  new BigNumber(value).decimalPlaces(2, BigNumber.ROUND_DOWN).toNumber();

/**
 * Default price range configurations
 * Applied in order - first matching condition wins
 */
export const DEFAULT_PRICE_RANGES: FiatRangeConfig[] = [
  {
    // Medium-large numbers (>= 1000)
    condition: (val: number) => Math.abs(val) >= 1000,
    minimumDecimals: 2,
    maximumDecimals: 4,
    threshold: 100,
  },
  {
    // Default range (1 <= val < 1000)
    condition: () => true,
    minimumDecimals: 2,
    maximumDecimals: 4,
    threshold: 0.0001,
  },
];

/**
 * USD volume or open interest with a magnitude suffix, e.g. `$1.23M`, through
 * Core `formatPerpsCompact`.
 */
export const formatVolume = (volume: PerpsDisplayValue): string =>
  formatPerpsCompact(volume, { field: 'volume' });

/**
 * Formats leverage value with 'x' suffix
 * @param leverage - Raw leverage multiplier value
 * @returns Format: "X.Xx" (1 decimal place with 'x' suffix)
 * @example formatLeverage(5) => "5.0x"
 * @example formatLeverage(10.5) => "10.5x"
 * @example formatLeverage(1) => "1.0x"
 */
export const formatLeverage = (leverage: string | number): string => {
  const num = typeof leverage === 'string' ? parseFloat(leverage) : leverage;

  if (isNaN(num)) {
    return '1x';
  }

  return `${num.toFixed(1)}x`;
};

/**
 * Formats a distance to liquidation, already in percent, e.g. `30.05` →
 * `"30.05%"`, for estimates that have no liquidation price to pass to
 * {@link formatLiquidationDistance}.
 */
export const formatLiquidationDistancePercent = (distance: number): string =>
  formatPercentage(distance, {
    decimals: PERPS_DISPLAY_PRECISION.LiquidationDistancePercent,
    sign: 'never',
  });

/**
 * Core `formatLiquidationDistance` in the app language, e.g. `"30.05%"`.
 *
 * @returns `undefined` while either price is missing or not positive, so
 * callers can hide the figure instead of showing the placeholder.
 */
export const formatLiquidationDistance = (
  entryPrice: PerpsDisplayValue,
  liquidationPrice: PerpsDisplayValue,
): string | undefined => {
  const formatted = formatLiquidationDistanceEnUs(
    entryPrice,
    liquidationPrice,
    {
      formatters: getFormatters(),
    },
  );
  return formatted === PERPS_CONSTANTS.FallbackPercentageDisplay
    ? undefined
    : formatted;
};

/**
 * Parses formatted currency strings back to numeric values
 * @param formattedValue - Formatted currency string (handles $, commas, negative values)
 * @returns Raw numeric value
 * @example parseCurrencyString("$1,234.56") => 1234.56
 * @example parseCurrencyString("-$500.00") => -500
 * @example parseCurrencyString("$-123.45") => -123.45
 * @example parseCurrencyString("1.1e-7") => 1.1e-7
 */
export const parseCurrencyString = (formattedValue: string): number => {
  if (!formattedValue) return 0;

  // Already a plain numeric string — including exponential notation, which a
  // balance below 1e-6 serializes to. The de-formatting below reads the
  // exponent's minus sign as a negative amount, so never let it see one.
  const numeric = Number(formattedValue);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  // Check for negative values (can be -$123.45 or $-123.45)
  const isNegative = formattedValue.includes('-');

  // Remove all non-numeric characters except dots
  // This regex removes currency symbols ($, €, etc.), commas, minus signs, and other formatting
  const cleanedValue = formattedValue
    .replace(/[^0-9.]/g, '') // Remove everything except digits and dots
    .trim();

  // Handle multiple dots by keeping only the last one as decimal separator
  // NOTE: This assumes US format (comma for thousands, dot for decimal)
  // Numbers with dots as thousand separators (e.g., European format) will be parsed incorrectly
  const parts = cleanedValue.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts.length > 1 ? parts[parts.length - 1] : '';

  const finalValue = decimalPart
    ? `${integerPart}.${decimalPart}`
    : integerPart;
  const parsed = parseFloat(finalValue);

  if (isNaN(parsed)) return 0;

  return isNegative ? -parsed : parsed;
};

/**
 * Formats a perps balance (availableBalance, totalBalance, etc.) as fiat,
 * truncating down to 2 decimals first so the displayed value never exceeds
 * the actual withdrawable amount. Use this for any balance that a user might
 * try to act on (withdraw Max, insufficient-balance comparisons), so the
 * display matches what the underlying flow can actually transact.
 *
 * Accepts raw numeric strings (e.g. "50.389"), formatted strings
 * (e.g. "$1,232.39"), or numbers. See `parseCurrencyString`.
 */
export const formatPerpsBalance = (
  balance: string | number | null | undefined,
): string => {
  if (balance === null || balance === undefined || balance === '') {
    return formatPerpsFiat(0);
  }
  const numeric =
    typeof balance === 'string' ? parseCurrencyString(balance) : balance;
  return formatPerpsFiat(truncateToTwoDecimals(numeric));
};

/**
 * Parses formatted percentage strings back to numeric values
 * @param formattedValue - Formatted percentage string (handles %, +/- signs)
 * @returns Raw numeric percentage value
 * @example parsePercentageString("+2.50%") => 2.5
 * @example parsePercentageString("-10.75%") => -10.75
 * @example parsePercentageString("5%") => 5
 */
export const parsePercentageString = (formattedValue: string): number => {
  if (!formattedValue) return 0;
  const cleanedValue = formattedValue
    .replace(/%/g, '')
    .replace(/\s/g, '')
    .trim();
  const parsed = parseFloat(cleanedValue);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Formats a timestamp for transaction detail views with time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string with time (e.g., "July 24, 2025 at 2:30 PM")
 * @example formatTransactionDate(1642492800000) => "January 18, 2022 at 12:00 AM"
 */
export const formatTransactionDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const dateStr = getIntlDateTimeFormatter('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
  const timeStr = getIntlDateTimeFormatter('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${dateStr} at ${timeStr}`;
};

/**
 * Formats a timestamp for order cards with time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string with time (e.g., "July 24, 2025 at 2:30 PM")
 * @example formatOrderCardDate(1642492800000) => "Jan 18"
 */
export const formatOrderCardDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const dateStr = getIntlDateTimeFormatter('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
  const timeStr = getIntlDateTimeFormatter('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
  return `${dateStr} at ${timeStr}`;
};

const PRO_ORDER_CARD_MONTHS = [
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
] as const;

const padTwoDigits = (value: number): string => String(value).padStart(2, '0');

/**
 * Formats an open-order placement timestamp for Pro order cards.
 * Matches Figma: "06 Apr 26 • 19:13:54"
 *
 * Built only from Date getters — Hermes `formatToParts` often omits
 * hour/minute/second and renders as "06 Apr 26 • ::".
 *
 * @param timestamp - Unix timestamp in milliseconds
 */
export const formatProOrderCardTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const day = padTwoDigits(date.getDate());
  const month = PRO_ORDER_CARD_MONTHS[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  const hours = padTwoDigits(date.getHours());
  const minutes = padTwoDigits(date.getMinutes());
  const seconds = padTwoDigits(date.getSeconds());

  return `${day} ${month} ${year} • ${hours}:${minutes}:${seconds}`;
};

/**
 * Formats a timestamp for transaction section headers
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date section string ("Today", "Yesterday", or "Month Day")
 * @example formatDateSection(Date.now()) => "Today"
 */
export const formatDateSection = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if it's today
  if (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  ) {
    return strings('perps.today');
  }

  // Check if it's yesterday
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return strings('perps.yesterday');
  }

  const month = getIntlDateTimeFormatter('en-US', {
    month: 'short',
  }).format(new Date(timestamp));
  const day = getIntlDateTimeFormatter('en-US', {
    day: 'numeric',
  }).format(new Date(timestamp));

  return `${month} ${day}`; // 'Jul, 26'
};

/**
 * Formats a limit price for display while preserving in-progress input — a
 * trailing "." or trailing zeros after the decimal survive, which
 * `formatPerpsFiat` alone would collapse. The draft follows the app locale's
 * decimal separator and currency placement; the stored price stays canonical.
 */
export const formatLimitPriceInput = (price: string): string => {
  if (!price || price === '0') {
    return '';
  }

  const isTrailingDecimal = price.endsWith('.');
  const typedDecimals = Math.min(price.split('.')[1]?.length || 0, 7);
  // A trailing "." has no digit to format: format one placeholder decimal and
  // drop that digit below, so the separator lands where the locale puts it.
  const formatted = formatPerpsFiat(isTrailingDecimal ? `${price}0` : price, {
    ranges: [
      {
        condition: () => true,
        threshold: 0.00000001,
        maximumDecimals: 7,
        minimumDecimals: isTrailingDecimal ? 1 : typedDecimals,
      },
    ],
    stripTrailingZeros: false,
  });

  if (!isTrailingDecimal) {
    return formatted;
  }

  const { decimal } = getPerpsLocaleSeparators();
  const placeholder = `${decimal}${getPerpsLocaleGrouping().localizedDigits[0]}`;
  const placeholderIndex = formatted.lastIndexOf(placeholder);
  return placeholderIndex === -1
    ? formatted
    : `${formatted.slice(0, placeholderIndex + decimal.length)}${formatted.slice(
        placeholderIndex + placeholder.length,
      )}`;
};
