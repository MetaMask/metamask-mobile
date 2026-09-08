/**
 * Orange brand colours, shared by the upsell and the hub.
 *
 * Raw hex because these are new brand values that are not in
 * @metamask/design-tokens yet. They live here rather than in either route so
 * the two surfaces cannot drift apart — the flow reads as one brand moment
 * from joining through to returning. Promote to tokens once they land.
 *
 * Precedent for a brand gradient declared this way:
 * app/components/UI/Card/Views/CardWelcome.
 */

/** Deep plum at the top fading to black. Applied at the container. */
export const ORANGE_GRADIENT_COLORS = [
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- spike only
  '#28001A',
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- spike only
  '#000000',
];

export const ORANGE_GRADIENT_START = { x: 0.5, y: 0 };
export const ORANGE_GRADIENT_END = { x: 0.5, y: 1 };

/**
 * The key-visual sweep, orange into violet. Used for the upsell's CTA and the
 * hub's allowance bars.
 */
export const ORANGE_SWEEP_ORANGE =
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- spike only
  '#FA4B00';
export const ORANGE_SWEEP_VIOLET =
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- spike only
  '#C66EF5';
