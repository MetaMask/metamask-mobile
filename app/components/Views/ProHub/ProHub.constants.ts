export interface ProHubNextPayment {
  /** Formatted currency string for the upcoming membership charge. */
  amount: string;
  /** Human-readable date of the next charge. */
  date: string;
}

/** Long-form date, formatted for display. */
export const MOCK_MEMBER_SINCE = '20 July 2026';

export const MOCK_NEXT_PAYMENT: ProHubNextPayment = {
  amount: '$49.99',
  date: 'Jul 20, 2027',
};

export type TradeAllowanceKind = 'currency' | 'count';

export interface TradeAllowanceItem {
  id: 'swaps' | 'perps' | 'predict';
  used: number;
  allowance: number;
  kind: TradeAllowanceKind;
}

// TODO: replace with real API data once the membership endpoint is available.
export const MOCK_TRADE_ALLOWANCES: TradeAllowanceItem[] = [
  { id: 'swaps', used: 310, allowance: 500, kind: 'currency' },
  { id: 'perps', used: 240, allowance: 1000, kind: 'currency' },
  { id: 'predict', used: 0, allowance: 1, kind: 'count' },
];

/**
 * Hub entrance sequence.
 *
 * The Rive icon plays through one rotation on its own before any content
 * arrives, mirroring the upsell's opening so joining and returning feel like
 * the same brand moment. The icon does not travel from the centre here: that
 * was the upsell's one-time hero, and the hub is a screen a member comes back
 * to, where a long hero animation on every visit would wear thin.
 *
 * `RIVE_SEQUENCE_MS` is a fixed guess rather than a completion signal — a
 * `.riv` is a binary we cannot introspect and this file emits no state-machine
 * event to hand off from. Dial it in on device.
 */
export const PRO_HUB_INTRO = {
  RIVE_SEQUENCE_MS: 1100,
  /** Beat between the icon settling and content starting to arrive. */
  POST_RIVE_MS: 160,
  ELEMENT_MS: 340,
  /**
   * Failsafe ceiling on waiting for the Rive file and Oswald. Deliberately
   * generous: both assets report success *or* failure, so this only fires if
   * one hangs without resolving either way. It must sit well clear of how long
   * Metro takes to serve them in development, or it would pre-empt the gate and
   * render the view without the font.
   */
  ASSET_WAIT_TIMEOUT_MS: 10000,
  /** Gap between the identity block, the section heading, and the rows. */
  ELEMENT_STAGGER_MS: 90,
  TRAVEL: 10,
} as const;

/** When the first piece of content after the icon animates in. */
export const proHubContentDelayMs = (): number =>
  PRO_HUB_INTRO.RIVE_SEQUENCE_MS + PRO_HUB_INTRO.POST_RIVE_MS;
