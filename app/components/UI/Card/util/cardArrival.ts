import { CardType } from '../types';

/**
 * How long the card is withheld while waiting for card data and the
 * reduce-motion setting. Past this the reveal is abandoned and the card renders
 * normally: a missed animation is recoverable, a card that never appears is not.
 */
export const CARD_ARRIVAL_PENDING_TIMEOUT_MS = 1500;

/**
 * Beat between the dashboard settling and the reveal starting, so the motion
 * reads as deliberate rather than as part of the screen appearing.
 */
export const CARD_ARRIVAL_START_DELAY_MS = 60;

/**
 * How long the card takes to fade in. Runs alongside the asset's own reveal,
 * which is roughly 1.7s end to end, so a long fade keeps the two reading as one
 * motion rather than the fade finishing while the card is still moving.
 */
export const CARD_ARRIVAL_FADE_DURATION_MS = 800;

export interface CardArrivalConditions {
  /** Remote/env kill-switch for the arrival animation. */
  flagEnabled: boolean;
  /** True once the one-shot has already been consumed for this user. */
  alreadySeen: boolean;
  /** True when the user reached the dashboard by completing card onboarding. */
  fromCardOnboarding: boolean;
  /** The issued card's type, or undefined while card data is still loading. */
  cardType: CardType | undefined;
  /** The OS "reduce motion" setting, or null while the async lookup runs. */
  reduceMotion: boolean | null;
}

/**
 * `animate` plays the two-phase arrival sequence, `skip` renders the dashboard
 * normally, and `pending` means this user is eligible but an input has not
 * resolved yet, so the dashboard withholds its first paint.
 *
 * `pending` is only ever returned for a user who could still go on to
 * `animate`. Anyone ineligible must reach `skip` immediately, or every
 * card-dashboard visit would blank while the asynchronous inputs settle.
 */
export type CardArrivalDecision = 'pending' | 'animate' | 'skip';

export function resolveCardArrivalDecision({
  flagEnabled,
  alreadySeen,
  fromCardOnboarding,
  cardType,
  reduceMotion,
}: CardArrivalConditions): CardArrivalDecision {
  // Synchronously known inputs first. Anyone failing these is never eligible,
  // so they must never reach `pending` — otherwise every visit to the card
  // dashboard would withhold its first paint while the asynchronous inputs
  // below settle.
  if (!flagEnabled || alreadySeen || !fromCardOnboarding) return 'skip';

  if (cardType === undefined || reduceMotion === null) return 'pending';

  if (cardType !== CardType.VIRTUAL) return 'skip';

  return reduceMotion ? 'skip' : 'animate';
}
