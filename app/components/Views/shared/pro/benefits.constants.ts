/**
 * Pro membership benefits shared by Join Pro and Pro Hub.
 * Lives under Views/shared so both route modules can import it (ADR 0020).
 */
export interface BenefitItem {
  /** Unique key — matches the `membership_benefits` i18n namespace segment. */
  id: string;
  /** i18n key passed to `strings()` for the row title. */
  title: string;
  /** i18n key passed to `strings()` for the row subtitle. */
  subtitle: string;
  /** i18n key for monthly-plan variant of the subtitle (used when plan = monthly). */
  subtitleMonthly?: string;
}

export const BENEFITS: BenefitItem[] = [
  {
    id: 'apy',
    title: 'pro_subscription.benefits.apy.title',
    subtitle: 'pro_subscription.benefits.apy.subtitle',
  },
  {
    id: 'cashback',
    title: 'pro_subscription.benefits.cashback.title',
    subtitle: 'pro_subscription.benefits.cashback.subtitle',
    subtitleMonthly: 'pro_subscription.benefits.cashback.subtitle_monthly',
  },
  {
    id: 'member_pricing',
    title: 'pro_subscription.benefits.member_pricing.title',
    subtitle: 'pro_subscription.benefits.member_pricing.subtitle',
  },
  {
    id: 'protection',
    title: 'pro_subscription.benefits.protection.title',
    subtitle: 'pro_subscription.benefits.protection.subtitle',
  },
  {
    id: 'atm_fees',
    title: 'pro_subscription.benefits.atm_fees.title',
    subtitle: 'pro_subscription.benefits.atm_fees.subtitle',
    subtitleMonthly: 'pro_subscription.benefits.atm_fees.subtitle_monthly',
  },
  {
    id: 'support',
    title: 'pro_subscription.benefits.support.title',
    subtitle: 'pro_subscription.benefits.support.subtitle',
  },
];
