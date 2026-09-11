import { CardType } from '../types';

/** A missed animation is recoverable, a card that never appears is not. */
export const CARD_ARRIVAL_PENDING_TIMEOUT_MS = 1500;

export const CARD_ARRIVAL_START_DELAY_MS = 60;

/** Long enough to read as one motion with the ~1.7s authored reveal. */
export const CARD_ARRIVAL_FADE_DURATION_MS = 800;

export interface CardArrivalConditions {
  flagEnabled: boolean;
  alreadySeen: boolean;
  fromCardOnboarding: boolean;
  /** Undefined while card data is still loading. */
  cardType: CardType | undefined;
  /** Null while the async OS lookup runs. */
  reduceMotion: boolean | null;
}

/**
 * `pending` withholds the first paint, so it is only ever returned for a user
 * who could still go on to `animate` — anyone ineligible must reach `skip`
 * immediately, or every dashboard visit would blank while the async inputs
 * settle.
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

  // Settled before reduce-motion is awaited: an ineligible card type is already
  // definitive, and that lookup cannot change the outcome.
  if (cardType !== CardType.VIRTUAL) return 'skip';

  if (reduceMotion === null) return 'pending';

  return reduceMotion ? 'skip' : 'animate';
}
