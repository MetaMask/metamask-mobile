import { ReactElement } from 'react';
import { AlertKeys } from '../constants/alerts';
import { Alert } from '../types/alerts';
import { strings } from '../../../../../locales/i18n';

export type CustomAmountHelpTextFormat = 'cta' | 'error' | 'cta_and_error';

/**
 * How HelpText under the amount is composed from alert title (CTA error label)
 * and alert message (banner/body error).
 */
const HELP_TEXT_FORMAT_BY_KEY: Partial<
  Record<AlertKeys, CustomAmountHelpTextFormat>
> = {
  [AlertKeys.InsufficientPayTokenBalance]: 'cta',
  [AlertKeys.InsufficientPayTokenFees]: 'cta_and_error',
  [AlertKeys.InsufficientPayTokenNative]: 'error',
  [AlertKeys.InsufficientPerpsBalance]: 'cta_and_error',
  [AlertKeys.InsufficientPredictBalance]: 'cta_and_error',
  [AlertKeys.InsufficientMoneyAccountBalance]: 'cta',
  [AlertKeys.NoPayTokenQuotes]: 'error',
  [AlertKeys.MMPayHardwareAccount]: 'error',
  [AlertKeys.FiatBuyAmountLimit]: 'error',
  [AlertKeys.DepositLimit]: 'cta',
  [AlertKeys.PerpsDepositMinimum]: 'cta',
  [AlertKeys.AccountNoFunds]: 'error',
  [AlertKeys.HeadlessBuyError]: 'cta_and_error',
};

function asString(
  value: string | ReactElement | undefined,
): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function joinCtaAndError(cta?: string, error?: string): string | undefined {
  if (cta && error) {
    return `${cta} - ${error}`;
  }
  return cta ?? error;
}

/**
 * Formats HelpText for CustomAmount confirmations from the first blocking alert.
 *
 * - `{CTA}` = alert title, or message when title is absent (legacy CTA label)
 * - `{error}` = alert message when title is present
 */
export function formatCustomAmountHelpText(
  alert: Alert | undefined,
): string | undefined {
  if (!alert) {
    return undefined;
  }

  const cta = asString(alert.title) ?? asString(alert.message);
  const error = alert.title ? asString(alert.message) : undefined;
  const key = alert.key as AlertKeys;

  // SignedOrSubmitted covers deposit-in-progress (combined) and pending
  // pay-network (error-only). Distinguish by deposit title copy.
  if (key === AlertKeys.SignedOrSubmitted) {
    const depositTitle = strings(
      'alert_system.signed_or_submitted_perps_deposit.title',
    );
    if (cta === depositTitle) {
      return joinCtaAndError(cta, error);
    }
    return error ?? cta;
  }

  // Insufficient token balance: message-only → CTA; title+message (e.g. money
  // account total) → CTA - error.
  if (key === AlertKeys.InsufficientPayTokenBalance) {
    if (alert.title && error) {
      return joinCtaAndError(cta, error);
    }
    return cta;
  }

  const format = HELP_TEXT_FORMAT_BY_KEY[key] ?? 'cta_and_error';

  switch (format) {
    case 'cta':
      return cta;
    case 'error':
      return error ?? cta;
    case 'cta_and_error':
      return joinCtaAndError(cta, error);
    default:
      return cta;
  }
}
