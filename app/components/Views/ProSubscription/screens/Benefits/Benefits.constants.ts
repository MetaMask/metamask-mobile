import {
  BENEFITS,
  type BenefitItem,
} from '../../../shared/pro/benefits.constants';

export { BENEFITS };
export type { BenefitItem };

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

export interface BenefitDetailItem {
  /** Unique key — matches the `benefits_description` i18n namespace segment. */
  id: string;
  /** i18n key for the title. */
  title: string;
  /** i18n keys for description paragraphs. */
  description: string[];
  /** i18n keys for monthly-plan variant of the description (used when plan = monthly). */
  descriptionMonthly?: string[];
  /** i18n keys for bullet-point list items (cashback, member_pricing). */
  points?: string[];
  /** Optional outbound link (protection). */
  link?: { label: string; url: string };
  /** i18n key for the disclaimer note (protection). */
  notes?: string;
}

export const BENEFIT_DETAILS: BenefitDetailItem[] = [
  {
    id: 'apy',
    title: 'pro_subscription.benefits.apy.title',
    description: [
      'pro_subscription.benefits_description.apy.description',
      'pro_subscription.benefits_description.apy.description2',
    ],
  },
  {
    id: 'cashback',
    title: 'pro_subscription.benefits.cashback.title',
    description: ['pro_subscription.benefits_description.cashback.description'],
    points: [
      'pro_subscription.benefits_description.cashback.points.0',
      'pro_subscription.benefits_description.cashback.points.1',
    ],
  },
  {
    id: 'member_pricing',
    title: 'pro_subscription.benefits.member_pricing.title',
    description: [
      'pro_subscription.benefits_description.member_pricing.description',
    ],
    points: [
      'pro_subscription.benefits_description.member_pricing.points.0',
      'pro_subscription.benefits_description.member_pricing.points.1',
      'pro_subscription.benefits_description.member_pricing.points.2',
    ],
  },
  {
    id: 'protection',
    title: 'pro_subscription.benefits.protection.title',
    description: [
      'pro_subscription.benefits_description.protection.description',
      'pro_subscription.benefits_description.protection.sub_description',
    ],
    points: [
      'pro_subscription.benefits_description.protection.points.0',
      'pro_subscription.benefits_description.protection.points.1',
      'pro_subscription.benefits_description.protection.points.2',
    ],
    link: {
      label: 'pro_subscription.benefits_description.protection.learn_more',
      // TODO: replace with actual URL
      url: 'https://metamask.io',
    },
    notes: 'pro_subscription.benefits_description.protection.notes',
  },
  {
    id: 'atm_fees',
    title: 'pro_subscription.benefits.atm_fees.title',
    description: ['pro_subscription.benefits_description.atm_fees.description'],
    descriptionMonthly: [
      'pro_subscription.benefits_description.atm_fees.description_monthly',
    ],
  },
  {
    id: 'support',
    title: 'pro_subscription.benefits.support.title',
    description: ['pro_subscription.benefits_description.support.description'],
  },
];

export type BenefitsContentVersion = 'control' | 'v2';

export interface BenefitsContent {
  title: string;
  description: string;
  ctaLabel: string;
  benefits: BenefitItem[];
  benefitDetails: BenefitDetailItem[];
}

const V2_BENEFITS: BenefitItem[] = [
  {
    id: 'support',
    title: 'pro_subscription.v2.benefits.support.title',
    subtitle: 'pro_subscription.v2.benefits.support.subtitle',
  },
  {
    id: 'atm_fees',
    title: 'pro_subscription.v2.benefits.atm_fees.title',
    subtitle: 'pro_subscription.v2.benefits.atm_fees.subtitle',
    subtitleMonthly: 'pro_subscription.v2.benefits.atm_fees.subtitle_monthly',
  },
  {
    id: 'protection',
    title: 'pro_subscription.v2.benefits.protection.title',
    subtitle: 'pro_subscription.v2.benefits.protection.subtitle',
  },
  {
    id: 'member_pricing',
    title: 'pro_subscription.v2.benefits.member_pricing.title',
    subtitle: 'pro_subscription.v2.benefits.member_pricing.subtitle',
  },
  {
    id: 'cashback',
    title: 'pro_subscription.v2.benefits.cashback.title',
    subtitle: 'pro_subscription.v2.benefits.cashback.subtitle',
    subtitleMonthly: 'pro_subscription.v2.benefits.cashback.subtitle_monthly',
  },
  {
    id: 'apy',
    title: 'pro_subscription.v2.benefits.apy.title',
    subtitle: 'pro_subscription.v2.benefits.apy.subtitle',
  },
  {
    id: 'placeholder_extra',
    title: 'pro_subscription.v2.benefits.placeholder_extra.title',
    subtitle: 'pro_subscription.v2.benefits.placeholder_extra.subtitle',
  },
];

const V2_BENEFIT_DETAILS: BenefitDetailItem[] = [
  {
    id: 'support',
    title: 'pro_subscription.v2.benefits.support.title',
    description: [
      'pro_subscription.v2.benefits_description.support.description',
    ],
  },
  {
    id: 'atm_fees',
    title: 'pro_subscription.v2.benefits.atm_fees.title',
    description: [
      'pro_subscription.v2.benefits_description.atm_fees.description',
    ],
    descriptionMonthly: [
      'pro_subscription.v2.benefits_description.atm_fees.description_monthly',
    ],
  },
  {
    id: 'protection',
    title: 'pro_subscription.v2.benefits.protection.title',
    description: [
      'pro_subscription.v2.benefits_description.protection.description',
      'pro_subscription.v2.benefits_description.protection.sub_description',
    ],
    points: [
      'pro_subscription.v2.benefits_description.protection.points.0',
      'pro_subscription.v2.benefits_description.protection.points.1',
      'pro_subscription.v2.benefits_description.protection.points.2',
    ],
    link: {
      label: 'pro_subscription.v2.benefits_description.protection.learn_more',
      // TODO: replace with actual URL
      url: 'https://metamask.io',
    },
    notes: 'pro_subscription.v2.benefits_description.protection.notes',
  },
  {
    id: 'member_pricing',
    title: 'pro_subscription.v2.benefits.member_pricing.title',
    description: [
      'pro_subscription.v2.benefits_description.member_pricing.description',
    ],
    points: [
      'pro_subscription.v2.benefits_description.member_pricing.points.0',
      'pro_subscription.v2.benefits_description.member_pricing.points.1',
      'pro_subscription.v2.benefits_description.member_pricing.points.2',
    ],
  },
  {
    id: 'cashback',
    title: 'pro_subscription.v2.benefits.cashback.title',
    description: [
      'pro_subscription.v2.benefits_description.cashback.description',
    ],
    points: [
      'pro_subscription.v2.benefits_description.cashback.points.0',
      'pro_subscription.v2.benefits_description.cashback.points.1',
    ],
  },
  {
    id: 'apy',
    title: 'pro_subscription.v2.benefits.apy.title',
    description: [
      'pro_subscription.v2.benefits_description.apy.description',
      'pro_subscription.v2.benefits_description.apy.description2',
    ],
  },
  {
    id: 'placeholder_extra',
    title: 'pro_subscription.v2.benefits.placeholder_extra.title',
    description: [
      'pro_subscription.v2.benefits_description.placeholder_extra.description',
    ],
  },
];

export const BENEFITS_CONTENT_BY_VERSION: Record<
  BenefitsContentVersion,
  BenefitsContent
> = {
  control: {
    title: 'pro_subscription.title',
    description: 'pro_subscription.description',
    ctaLabel: 'pro_subscription.join_pro',
    benefits: BENEFITS,
    benefitDetails: BENEFIT_DETAILS,
  },
  v2: {
    title: 'pro_subscription.v2.title',
    description: 'pro_subscription.v2.description',
    ctaLabel: 'pro_subscription.v2.join_pro',
    benefits: V2_BENEFITS,
    benefitDetails: V2_BENEFIT_DETAILS,
  },
};
