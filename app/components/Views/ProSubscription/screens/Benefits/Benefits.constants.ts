export interface BenefitItem {
  /** Unique key — matches the `membership_benefits` i18n namespace segment. */
  id: string;
  /** i18n key passed to `strings()` for the row title. */
  title: string;
  /** i18n key passed to `strings()` for the row subtitle. */
  subtitle: string;
}

export type PlanId = 'annual' | 'monthly';

export interface PlanOption {
  /** Unique key — matches the `membership.plans` i18n namespace segment. */
  id: string;
  /** i18n key passed to `strings()` for the plan label. */
  label: string;
  /** i18n key passed to `strings()` for the plan price. */
  price: string;
  /** i18n key passed to `strings()` for the plan sub price. */
  subPrice?: string;
  /** i18n key passed to `strings()` for the plan savings badge. */
  savingsBadge?: string;
  /** i18n key passed to `strings()` for the CTA button label. */
  ctaLabel: string;
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
  },
  {
    id: 'member_pricing',
    title: 'pro_subscription.benefits.member_pricing.title',
    subtitle: 'pro_subscription.benefits.member_pricing.subtitle',
  },
  {
    id: 'atm_fees',
    title: 'pro_subscription.benefits.atm_fees.title',
    subtitle: 'pro_subscription.benefits.atm_fees.subtitle',
  },
  {
    id: 'protection',
    title: 'pro_subscription.benefits.protection.title',
    subtitle: 'pro_subscription.benefits.protection.subtitle',
  },
  {
    id: 'support',
    title: 'pro_subscription.benefits.support.title',
    subtitle: 'pro_subscription.benefits.support.subtitle',
  },
];

export const PLANS: PlanOption[] = [
  {
    id: 'annual',
    label: 'pro_subscription.plans.annual.label',
    price: 'pro_subscription.plans.annual.price',
    subPrice: 'pro_subscription.plans.annual.sub_price',
    savingsBadge: 'pro_subscription.plans.annual.badge',
    ctaLabel: 'pro_subscription.plans.annual.cta',
  },
  {
    id: 'monthly',
    label: 'pro_subscription.plans.monthly.label',
    price: 'pro_subscription.plans.monthly.price',
    ctaLabel: 'pro_subscription.plans.monthly.cta',
  },
];

export const DEFAULT_PLAN: PlanId = 'annual';
