/**
 * Mobile-only Perps analytics property keys that are not yet exported from
 * `@metamask/perps-controller` `PERPS_EVENT_PROPERTY`.
 *
 * Values must match the Segment schema (snake_case). Prefer the controller
 * constant when Core adds it.
 */

/**
 * Prior leverage on Perp UI Interaction `leverage_changed` events.
 * Segment property: `previous_leverage`.
 */
export const PERPS_ANALYTICS_PREVIOUS_LEVERAGE = 'previous_leverage' as const;
