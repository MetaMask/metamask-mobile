/** Shared constants for the registry-delivered venue profile contract.
 *
 * Kept in its own module so the profile parser, the build ceiling and the
 * resolver can import them without a cycle.
 */

/** The DSL levels this build renders. */
export const SUPPORTED_DSL = ['dsl-1'] as const;

/** The one profile id this build accepts. */
export const VENUE_PROFILE_ID = 'kalshi-demo-signing';

/** The intents this build signs. */
export type VenueIntentName =
  | 'order.place'
  | 'account.activate'
  | 'funding.deposit';
