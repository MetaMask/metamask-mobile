/**
 * What a member *holds*, as opposed to what they have extracted.
 *
 * The Pro Hub's original data model was three formatted currency strings
 * (lifetime earnings, Money balance, mUSD back), which meant only the benefits
 * with a dollar figure attached could be rendered. Protection, ATM/FX fees,
 * priority support and the Orange app icon had no representation anywhere in
 * the members' area — not because they were designed out, but because the
 * schema had nowhere to put them.
 *
 * Every row here follows one grammar, so the list scans:
 *
 * icon | label + rate badge | sublabel (what has accrued) | optional action
 *
 * Rates live in a green badge beside the label rather than buried in prose:
 * "7%" is the reason the member is holding the benefit, so it reads as a
 * property of the benefit, not a detail of it. The sublabel is then free to
 * report only what has actually accrued.
 *
 * Lives under Views/shared alongside the benefits list so both the upsell and
 * the hub can import it (ADR 0020).
 */
import { IconName } from '@metamask/design-system-react-native';
import { BENEFITS, type BenefitId } from './benefits.constants';

/**
 * Rows are separated by a divider wherever the group changes. Grouping only,
 * no group headings: a heading would indent the icons beneath it and break the
 * single left edge that makes the list scannable.
 */
export type EntitlementGroup = 'trading' | 'card' | 'protection' | 'membership';

/** A row action. Resolved to a route by the hub, so this stays route-agnostic. */
export type EntitlementAction = 'card' | 'support' | 'app_icon';

export interface EntitlementAllowance {
  used: number;
  limit: number;
  unit: 'currency' | 'count';
}

export interface EntitlementRowAction {
  kind: EntitlementAction;
  /** Short verb — it sits in a button beside the label. */
  labelKey: string;
}

export interface HubBenefitRow {
  /** Unique row key. */
  id: string;
  /** The sold benefit this row represents. Several rows may share one. */
  benefitId: BenefitId;
  group: EntitlementGroup;
  iconName: IconName;
  labelKey: string;
  /** The rate, shown as a green badge beside the label. */
  badgeKey?: string;
  /** What has accrued, or the current configuration state. */
  sublabelKey: string;
  /**
   * A monthly consumable. The trailing value is derived as what remains,
   * because a member cares what is left rather than what is spent.
   */
  allowance?: EntitlementAllowance;
  /**
   * What the benefit has earned, pre-formatted. Rendered ahead of the
   * sublabel, and in green when it is a gain (leading `+`).
   */
  accrued?: string;
  action?: EntitlementRowAction;
}

const K = 'pro_hub.entitlements';

/*
 * Grouped by the benefit each row derives from, so a `BenefitId` cannot be
 * left unrepresented: the `Record` forces an entry for every one, and ordering
 * comes from `BENEFITS` below. Member pricing fans out into its three markets
 * — the parent row was only a header, and it pushed every icon beneath it out
 * of alignment with the rest of the list.
 *
 * TODO: replace with real API data once the membership endpoint is available.
 */
const ROWS_BY_BENEFIT: Record<BenefitId, HubBenefitRow[]> = {
  member_pricing: [
    {
      id: 'swaps',
      benefitId: 'member_pricing',
      group: 'trading',
      iconName: IconName.SwapHorizontal,
      labelKey: `${K}.swaps.label`,
      sublabelKey: `${K}.swaps.sublabel`,
      allowance: { used: 310, limit: 500, unit: 'currency' },
    },
    {
      id: 'perps',
      benefitId: 'member_pricing',
      group: 'trading',
      iconName: IconName.Candlestick,
      labelKey: `${K}.perps.label`,
      sublabelKey: `${K}.perps.sublabel`,
      allowance: { used: 240, limit: 1000, unit: 'currency' },
    },
    {
      id: 'predict',
      benefitId: 'member_pricing',
      group: 'trading',
      iconName: IconName.PieChart,
      labelKey: `${K}.predict.label`,
      sublabelKey: `${K}.predict.sublabel`,
      allowance: { used: 0, limit: 1, unit: 'count' },
    },
  ],
  apy: [
    {
      id: 'apy',
      benefitId: 'apy',
      group: 'card',
      iconName: IconName.TrendUp,
      labelKey: `${K}.apy.label`,
      badgeKey: `${K}.apy.badge`,
      sublabelKey: `${K}.apy.sublabel`,
      accrued: '+$48.92',
    },
  ],
  /*
   * Two rows: the benefit, and the thing standing between the member and it.
   * Previously one row tried to be both, so it read "3% mUSD back · $0.00"
   * with a card upsell banner stacked above saying the same thing again.
   * The `get_card` row is conditional on not holding a card — once ordered it
   * drops out and cashback simply starts reporting a real figure.
   */
  cashback: [
    {
      id: 'cashback',
      benefitId: 'cashback',
      group: 'card',
      iconName: IconName.Cash,
      labelKey: `${K}.cashback.label`,
      badgeKey: `${K}.cashback.badge`,
      sublabelKey: `${K}.cashback.sublabel`,
      accrued: '$0.00',
    },
    {
      id: 'get_card',
      benefitId: 'cashback',
      group: 'card',
      iconName: IconName.AddCard,
      labelKey: `${K}.get_card.label`,
      sublabelKey: `${K}.get_card.sublabel`,
      action: { kind: 'card', labelKey: `${K}.get_card.action` },
    },
  ],
  atm_fees: [
    {
      id: 'atm_fees',
      benefitId: 'atm_fees',
      group: 'card',
      iconName: IconName.Bank,
      labelKey: `${K}.atm_fees.label`,
      sublabelKey: `${K}.atm_fees.sublabel`,
    },
  ],
  protection: [
    {
      id: 'protection',
      benefitId: 'protection',
      group: 'protection',
      iconName: IconName.SecurityTick,
      labelKey: `${K}.protection.label`,
      sublabelKey: `${K}.protection.sublabel`,
      allowance: { used: 0, limit: 100, unit: 'count' },
    },
  ],
  /*
   * No action: support has no destination anywhere in the app yet —
   * `Membership`'s own "Contact support" row is a TODO no-op — so the row
   * states its standing rather than offering a button that goes nowhere.
   */
  support: [
    {
      id: 'support',
      benefitId: 'support',
      group: 'protection',
      iconName: IconName.Messages,
      labelKey: `${K}.support.label`,
      sublabelKey: `${K}.support.sublabel`,
    },
  ],
  /*
   * The sublabel reports whether the icon is actually applied. Saying
   * "members only" there was wasted words on a screen only members can reach.
   * Swap to `sublabel_applied` and drop the action once applied — wiring the
   * action itself needs native alternate-icon work.
   */
  app_icon: [
    {
      id: 'app_icon',
      benefitId: 'app_icon',
      group: 'membership',
      iconName: IconName.Palette,
      labelKey: `${K}.app_icon.label`,
      sublabelKey: `${K}.app_icon.sublabel_pending`,
      action: { kind: 'app_icon', labelKey: `${K}.app_icon.action` },
    },
  ],
};

/**
 * Ordered by the shared benefits list, so the hub presents what the member was
 * sold, in the order they were sold it.
 */
export const HUB_BENEFIT_ROWS: HubBenefitRow[] = BENEFITS.flatMap(
  (benefit) => ROWS_BY_BENEFIT[benefit.id],
);
