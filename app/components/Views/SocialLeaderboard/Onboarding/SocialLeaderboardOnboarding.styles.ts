import { StyleSheet } from 'react-native';

// The overlay copy renders over a brand-fixed dark-purple Rive artboard (same in
// light + dark), so it must stay white in every theme — theme-adaptive design
// tokens would flip to dark text in dark mode and become unreadable here.
const OVERLAY_TITLE_COLOR =
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex
  '#FFFFFF';
const OVERLAY_DESCRIPTION_COLOR = 'rgba(255, 255, 255, 0.8)';

/**
 * Brand purple backdrop rendered behind the Rive artboard. `Wallet` only
 * navigates here once trader data is cached, so this is NOT a data-loading
 * state — it covers the brief window where the artboard's native view is warming
 * up and hasn't painted its first frame yet. These are the artboard's own
 * backdrop colors from the Figma spec (`linear-gradient(180deg, #3D065F 0%,
 * #8F44E4 100%)`), so the animation paints seamlessly on top with no seam.
 * Fixed (non-theme) because the artboard backdrop itself is fixed across
 * light/dark.
 */
export const ONBOARDING_GRADIENT_COLORS = [
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex
  '#3D065F',
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex
  '#8F44E4',
];

/**
 * Vertical gap (px) added to the top safe-area inset before the title/description
 * overlay. Sized so the copy clears the Rive artboard's progress bar with the
 * breathing room from the Figma spec (node 616-4566) — the same on every step.
 */
export const OVERLAY_TOP_OFFSET = 80;

/**
 * The onboarding is a single full-screen Rive artboard that renders every
 * visual (background, trader cards, buttons). In the v4 ("hybrid") artboard the
 * step title + description are NOT baked into the Rive, so React Native renders
 * them as a non-interactive overlay pinned to the top of the screen, above the
 * Rive element which fills the container via `StyleSheet.absoluteFillObject`.
 */
const createStyles = () =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    textOverlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      alignItems: 'center',
      paddingHorizontal: 32,
    },
    // Full-width wrapper that stacks the live copy layer and the outgoing
    // (fading-out) copy layer on top of each other so they cross-fade in place.
    textStack: {
      width: '100%',
      alignItems: 'center',
    },
    // The outgoing copy layer during a step cross-fade — pinned over the live
    // layer (same width + centering) so both sets of text line up exactly.
    textLayerFadingOut: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    // Matches the notifications pre-prompt toast leading-icon spacing so the
    // Social Leaderboard toast reads identically to the rest of the app.
    toastAccessory: {
      alignSelf: 'flex-start',
      marginRight: 12,
      paddingTop: 4,
    },
    title: {
      fontSize: 28,
      lineHeight: 34,
      fontWeight: '700',
      color: OVERLAY_TITLE_COLOR,
      textAlign: 'center',
    },
    description: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 20,
      color: OVERLAY_DESCRIPTION_COLOR,
      textAlign: 'center',
    },
  });

export default createStyles;
