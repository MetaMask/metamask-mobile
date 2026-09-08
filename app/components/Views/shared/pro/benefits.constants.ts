/**
 * Pro membership benefits shared by Join Pro and Pro Hub.
 * Lives under Views/shared so both route modules can import it (ADR 0020).
 */
import { IconName } from '@metamask/design-system-react-native';

/**
 * The canonical set of membership benefits.
 *
 * Typed as a union rather than `string` so that anything keyed by benefit —
 * notably the Pro Hub's entitlement state — cannot compile while a benefit is
 * missing. Adding a benefit here surfaces as a type error everywhere it needs
 * representing, which is what stops the hub silently showing a subset of what
 * the upsell sold.
 */
export type BenefitId =
  | 'member_pricing'
  | 'apy'
  | 'cashback'
  | 'atm_fees'
  | 'protection'
  | 'support'
  | 'app_icon';

export interface BenefitItem {
  /** Unique key — matches the `membership_benefits` i18n namespace segment. */
  id: BenefitId;
  /** i18n key passed to `strings()` for the row title. */
  title: string;
  /** i18n key passed to `strings()` for the row subtitle. */
  subtitle: string;
  /** i18n key for monthly-plan variant of the subtitle (used when plan = monthly). */
  subtitleMonthly?: string;
  /**
   * Leading icon for the row. Each benefit carries its own so the list is
   * scannable — a repeated checkmark conveys nothing per-row.
   */
  iconName: IconName;
  /**
   * Whether this benefit needs a detail sheet.
   *
   * Declared here rather than measured from rendered line count on purpose:
   * a measured rule would make the info affordance depend on Dynamic Type,
   * translation length and device width, so the same screen would show six
   * icons in one locale and one in another.
   *
   * The principle: prose can be inlined into a two-line subtitle; a covered
   * items list, an external link or a legal disclaimer cannot, at any line
   * count. Only benefits carrying that kind of structured detail get an icon.
   */
  hasDetail?: boolean;
}

/*
 * Order is deliberate, in four tiers:
 *
 * 1. Trade, then earn — "trade anything AND earn more", with earning
 *    subordinate to trading. Member pricing leads because it is trade-native,
 *    recurring, and realised by every member every month.
 * 2. The card benefits sit together (cashback, then ATM/FX) so the reader
 *    changes context once rather than twice.
 * 3. Confidence benefits (protection, support) — high reassurance, low
 *    frequency of use.
 * 4. Membership identity last. The app icon is the only non-financial benefit
 *    and the only one every member sees daily; it closes the list as a
 *    flourish rather than competing with the value claims. Leading with it
 *    would trivialise a paid membership.
 */
export const BENEFITS: BenefitItem[] = [
  {
    id: 'member_pricing',
    iconName: IconName.SwapHorizontal,
    title: 'pro_subscription.benefits.member_pricing.title',
    subtitle: 'pro_subscription.benefits.member_pricing.subtitle',
  },
  {
    id: 'apy',
    iconName: IconName.TrendUp,
    title: 'pro_subscription.benefits.apy.title',
    subtitle: 'pro_subscription.benefits.apy.subtitle',
  },
  {
    id: 'cashback',
    iconName: IconName.Card,
    title: 'pro_subscription.benefits.cashback.title',
    subtitle: 'pro_subscription.benefits.cashback.subtitle',
    subtitleMonthly: 'pro_subscription.benefits.cashback.subtitle_monthly',
  },
  {
    id: 'atm_fees',
    iconName: IconName.Bank,
    title: 'pro_subscription.benefits.atm_fees.title',
    subtitle: 'pro_subscription.benefits.atm_fees.subtitle',
    subtitleMonthly: 'pro_subscription.benefits.atm_fees.subtitle_monthly',
  },
  {
    id: 'protection',
    iconName: IconName.SecurityTick,
    hasDetail: true,
    title: 'pro_subscription.benefits.protection.title',
    subtitle: 'pro_subscription.benefits.protection.subtitle',
  },
  {
    id: 'support',
    iconName: IconName.Messages,
    title: 'pro_subscription.benefits.support.title',
    subtitle: 'pro_subscription.benefits.support.subtitle',
  },
  {
    id: 'app_icon',
    iconName: IconName.Sparkle,
    title: 'pro_subscription.benefits.app_icon.title',
    subtitle: 'pro_subscription.benefits.app_icon.subtitle',
  },
];
