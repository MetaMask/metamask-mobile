/**
 * Pure-black preview override.
 *
 * Mutates `brandColor` and `darkTheme.colors` from `@metamask/design-tokens`
 * at module-load time, BEFORE `@metamask/design-system-twrnc-preset` imports
 * them. The twrnc preset bakes token values into its Tailwind config at
 * import time (see `themeColors` in the preset's `colors.ts`), so the only
 * way to make `bg-default` / `border-muted` / etc. resolve to pure-black
 * values is to mutate the upstream token objects first.
 *
 * Contract: this file MUST be the first import in `index.js`, before any
 * other module that transitively imports `@metamask/design-tokens` or the
 * twrnc preset. If the DS team ever freezes the exported token objects,
 * this approach breaks and we fall back to forking the preset.
 *
 * Flag source: `MM_PURE_BLACK_PREVIEW` in `.js.env`. Inlined at bundle time
 * by `babel-plugin-transform-inline-environment-variables`. Default is off;
 * set to `"true"` in `.js.env` (or in a CI build profile's env) and rebuild.
 *
 * Values mirror the DS preview branch `cursor/background-default-pure-black-2ad1`
 * commit c84e301a "feat: Refine pure black colors (#1137)". Re-diff and update
 * when the preview branch advances.
 */
/* eslint-disable @metamask/design-tokens/color-no-hex */
import { brandColor, darkTheme } from '@metamask/design-tokens';

const PURE_BLACK_ENABLED = process.env.MM_PURE_BLACK_PREVIEW === 'true';

if (PURE_BLACK_ENABLED) {
  Object.assign(brandColor, {
    grey600: '#2b2b30',
    grey700: '#222226',
    grey800: '#18181b',
    grey900: '#0d0d0f',
    grey1000: '#000000',
  });

  Object.assign(darkTheme.colors.background, {
    default: brandColor.grey1000,
    alternative: brandColor.grey900,
    section: brandColor.grey800,
    subsection: brandColor.grey700,
    muted: '#e2e2ff1b',
    defaultHover: '#18181b',
    defaultPressed: '#222226',
    mutedHover: '#e2e2ff26',
    mutedPressed: '#e2e2ff30',
    hover: '#e2e2ff1b',
    pressed: '#e2e2ff30',
  });

  Object.assign(darkTheme.colors.text, {
    muted: brandColor.grey500,
  });

  Object.assign(darkTheme.colors.icon, {
    muted: brandColor.grey500,
  });

  Object.assign(darkTheme.colors.border, {
    muted: '#e2e2ff26',
  });
}
