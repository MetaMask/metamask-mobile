import I18n, { strings } from '../../../../../locales/i18n';
import type { PaymentMethod } from '@metamask/ramps-controller';

type PaymentMethodLike = Pick<PaymentMethod, 'id' | 'paymentType' | 'name'>;

const CARD_PAYMENT_METHOD_IDENTIFIERS = [
  'debit-credit-card',
  'credit-debit-card',
  'credit_debit_card',
  'debit_card',
  'debit card',
  'credit debit card',
  'debit credit card',
  'credit or debit card',
] as const;

const normalizeValue = (value?: string): string =>
  (value ?? '').trim().toLowerCase();

const toComparableValue = (value?: string): string =>
  normalizeValue(value).replace(/[^a-z0-9]/g, '');

const isEnglishLocale = (): boolean =>
  normalizeValue(I18n.locale).startsWith('en');

const isCardPaymentMethod = (paymentMethod: PaymentMethodLike): boolean => {
  const comparableId = toComparableValue(paymentMethod.id);
  const comparableType = toComparableValue(paymentMethod.paymentType);
  const comparableName = toComparableValue(paymentMethod.name);

  return CARD_PAYMENT_METHOD_IDENTIFIERS.some((identifier) => {
    const comparableIdentifier = toComparableValue(identifier);

    return (
      comparableId.includes(comparableIdentifier) ||
      comparableType.includes(comparableIdentifier) ||
      comparableName.includes(comparableIdentifier)
    );
  });
};

/**
 * Localizes payment method labels for known provider methods that are returned
 * as raw English text from upstream APIs.
 */
export const getLocalizedPaymentMethodName = (
  paymentMethod?: PaymentMethodLike | null,
): string => {
  if (!paymentMethod) {
    return '';
  }

  if (!isEnglishLocale() && isCardPaymentMethod(paymentMethod)) {
    return strings('fiat_on_ramp.debit_card');
  }

  return paymentMethod.name;
};

export const __TEST_ONLY__ = {
  isCardPaymentMethod,
  toComparableValue,
};
