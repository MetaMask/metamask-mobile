import { CardType } from '../types';

/**
 * Bounds how long the card is withheld waiting on its inputs. A missed
 * animation is recoverable, a card that never appears is not.
 */
export const CARD_ARRIVAL_PENDING_TIMEOUT_MS = 1500;

/** Beat before the reveal, so the motion reads as deliberate. */
export const CARD_ARRIVAL_START_DELAY_MS = 60;

/** Fade duration; long enough to read as one motion with the ~1.7s reveal. */
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
 * `animate` plays the arrival sequence, `skip` renders the dashboard normally,
 * and `pending` withholds the first paint while an input resolves. `pending` is
 * only ever returned for a user who could still go on to `animate` — anyone
 * ineligible must reach `skip` immediately, or every dashboard visit would
 * blank while the asynchronous inputs settle.
 */
export type CardArrivalDecision = 'pending' | 'animate' | 'skip';

export function resolveCardArrivalDecision({
  flagEnabled,
  alreadySeen,
  fromCardOnboarding,
  cardType,
  reduceMotion,
}: CardArrivalConditions): CardArrivalDecision {
  if (!flagEnabled || alreadySeen || !fromCardOnboarding) return 'skip';

  if (cardType === undefined) return 'pending';

  // Settled before reduce-motion is awaited: an ineligible card type is
  // already definitive, and that lookup cannot change the outcome.
  if (cardType !== CardType.VIRTUAL) return 'skip';

  if (reduceMotion === null) return 'pending';

  return reduceMotion ? 'skip' : 'animate';
}
