/**
 * Code toggle for the ASSETS-4016 scroll-aware token-details nav header.
 *
 * When `true`, `TokenDetailsInlineHeader` renders the new V2 layout
 * (compact by default: back + star + bell + share only — the token
 * identity fades in as the user scrolls past the hero section).
 *
 * When `false`, the header falls back to its pre-ASSETS-4016 behaviour
 * (identity always visible).
 *
 * This single boolean exists so the feature can be flipped without a
 * dynamic feature-flag wire-up; a LaunchDarkly flag is tracked
 * separately and will replace this constant once it lands.
 */
export const TOKEN_DETAILS_HEADER_V2_ENABLED = true;
