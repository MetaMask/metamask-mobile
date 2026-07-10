import { IconName } from '@metamask/design-system-react-native';
import type { ImageSourcePropType } from 'react-native';
import { PaymentType } from '@consensys/on-ramp-sdk';
import type { PaymentMethod, Provider } from '@metamask/ramps-controller';
import paypalPayImage from '../../../images/paypal_pay.png';
// import morePaymentMethodsImage from '../../../images/more_pay.png';

export const RECEIVE_EXTERNAL_OPTION_ID = 'receive_external';

/**
 * Payment types we surface under the "Bank and card" section. The unified
 * RampsController payment list is the source of truth; anything not classified
 * here (e.g. wallets) is not shown directly in that section.
 */
const BANK_AND_CARD_PAYMENT_TYPES: PaymentType[] = [
  PaymentType.ApplePay,
  PaymentType.DebitCreditCard,
  PaymentType.BankTransfer,
];

export const isBankOrCardPaymentType = (
  paymentType?: PaymentType | string,
): boolean => BANK_AND_CARD_PAYMENT_TYPES.includes(paymentType as PaymentType);

/**
 * Curated "More ways to fund" entries.
 *
 * The unified RampsController payment list returned for a region/provider does
 * not reliably include PayPal, Google Pay, Revolut, etc. (PayPal in particular
 * is a custom-action provider, not a standalone payment method). We surface
 * them as a small curated list so the design's section is always present.
 *
 * Each entry can carry an optional matcher so that, when the method/provider is
 * eligible for the user's region, tapping the row pre-selects it in the unified
 * RampsController state. The downstream Buy v2 flow then opens that specific
 * provider/method checkout (e.g. PayPal's external-browser custom action,
 * Revolut's browser redirect) instead of the generic entry point. When nothing
 * eligible is found we fall back to opening the flow without a pre-selection.
 */
export interface MoreWaysToFundEntry {
  id: string;
  labelKey: string;
  descriptionKey: string;
  icon?: IconName;
  image?: ImageSourcePropType;
  /**
   * Payment type matched against the unified RampsController payment-method
   * list. When the active provider offers it the method is pre-selected so the
   * flow opens that method's checkout (e.g. Google Pay, Revolut Pay).
   */
  paymentTypeMatch?: PaymentType;
  /**
   * Case-insensitive substring matched against RampsController provider ids
   * (e.g. "paypal", "revolut"). When a matching provider exists for the region
   * it is pre-selected so the flow opens that provider's checkout.
   */
  providerIdMatch?: string;
}

export const MORE_WAYS_TO_FUND_ENTRIES: MoreWaysToFundEntry[] = [
  {
    id: 'paypal',
    labelKey: 'onboarding_fund_wallet.option_paypal',
    descriptionKey: 'onboarding_fund_wallet.option_paypal_description',
    image: paypalPayImage,
    providerIdMatch: 'paypal',
  },
  {
    id: 'more_payment_methods',
    labelKey: 'onboarding_fund_wallet.option_more_payment_methods',
    descriptionKey:
      'onboarding_fund_wallet.option_more_payment_methods_description',
    icon: IconName.AttachMoney,
  },
];

/**
 * Result of mapping a curated "More ways to fund" entry onto a concrete
 * RampsController selection.
 */
export type MoreWaysSelection =
  | { kind: 'paymentMethod'; paymentMethod: PaymentMethod }
  | { kind: 'provider'; provider: Provider }
  | { kind: 'none' };

/**
 * Resolves a curated entry to a concrete provider / payment-method selection so
 * the unified Buy v2 flow can open the right checkout.
 *
 * Payment-type matching is preferred (it keeps the flow's own provider routing
 * intact), falling back to an explicit provider match. Returns `none` when
 * nothing eligible is available for the current region/provider, in which case
 * the caller should just open the flow without pre-selecting anything.
 */
export function resolveMoreWaysSelection(
  entry: MoreWaysToFundEntry,
  source: { providers: Provider[]; paymentMethods: PaymentMethod[] },
): MoreWaysSelection {
  if (entry.paymentTypeMatch) {
    const paymentMethod = source.paymentMethods.find(
      (method) => method.paymentType === entry.paymentTypeMatch,
    );
    if (paymentMethod) {
      return { kind: 'paymentMethod', paymentMethod };
    }
  }

  if (entry.providerIdMatch) {
    const match = entry.providerIdMatch.toLowerCase();
    const provider = source.providers.find((candidate) =>
      candidate.id?.toLowerCase().includes(match),
    );
    if (provider) {
      return { kind: 'provider', provider };
    }
  }

  return { kind: 'none' };
}
