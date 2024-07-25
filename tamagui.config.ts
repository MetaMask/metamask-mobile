// @tamagui/core doesn't include `createMedia` so that it can avoid
// a dependency on react-native. If you are using tamagui, you can
// import createMedia from there directly and avoid this line:

import { createMedia, createFont, createTamagui, createTokens } from 'tamagui';
import { lightTheme, darkTheme } from '@metamask/design-tokens';

// Importning shorthands
import { shorthands } from '@tamagui/shorthands';

// Create a font:
// To work with the tamagui UI kit styled components (which is optional)

// you'd want the keys used for `size`, `lineHeight`, `weight` and

// `letterSpacing` to be consistent. The `createFont` function

// will fill-in any missing values if `lineHeight`, `weight` or

// `letterSpacing` are subsets of `size`.
const interFont = createFont({
  family: 'Euclid Circular B, Helvetica, Arial, sans-serif',

  size: {
    1: 12,

    2: 14,

    3: 15,
  },

  lineHeight: {
    // 1 will be 22

    2: 22,
  },

  weight: {
    1: '300',

    // 2 will be 300

    3: '600',
  },

  letterSpacing: {
    1: 0,

    2: -1,

    // 3 will be -1
  },

  // (native only) swaps out fonts by face/style

  face: {
    300: { normal: 'InterLight', italic: 'InterItalic' },

    600: { normal: 'InterBold' },
  },
});
// Set up our tokens
// The keys can be whatever you want, but we do recommend keeping them

// consistent across the different token categories and intended for

// usage together to make nice designs - eg for a Button to use.
const size = {
  0: 0,

  1: 5,

  2: 10,

  // ....
};
export const tokens = createTokens({
  size,

  space: { ...size, '-1': -5, '-2': -10 },

  radius: { 0: 0, 1: 3 },

  zIndex: { 0: 0, 1: 100, 2: 200 },

  color: {
    white: '#fff',

    black: '#000',
  },
});

const config = createTamagui({
  onlyAllowShorthands: true,
  shorthands,
  fonts: {
    // for tamagui, heading and body are assumed

    heading: interFont,

    body: interFont,
  },

  tokens,
  // For more on themes, see the Themes page

  themes: {
    light: {
      backgroundDefault: lightTheme.colors.background.default,
      backgroundDefaultHover: lightTheme.colors.background.defaultHover,
      backgroundDefaultPressed: lightTheme.colors.background.defaultPressed,
      backgroundAlternative: lightTheme.colors.background.alternative,
      backgroundAlternativeHover: lightTheme.colors.background.alternativeHover,
      backgroundAlternativePressed:
        lightTheme.colors.background.alternativePressed,
      backgroundHover: lightTheme.colors.background.hover,
      backgroundPressed: lightTheme.colors.background.pressed,

      textDefault: lightTheme.colors.text.default,
      textAlternative: lightTheme.colors.text.alternative,
      textMuted: lightTheme.colors.text.muted,

      iconDefault: lightTheme.colors.icon.default,
      iconAlternative: lightTheme.colors.icon.alternative,
      iconMuted: lightTheme.colors.icon.muted,

      borderDefault: lightTheme.colors.border.default,
      borderMuted: lightTheme.colors.border.muted,

      overlayDefault: lightTheme.colors.overlay.default,
      overlayAlternative: lightTheme.colors.overlay.alternative,
      overlayInverse: lightTheme.colors.overlay.inverse,

      shadowDefault: lightTheme.colors.shadow.default,
      shadowPrimary: lightTheme.colors.shadow.primary,
      shadowError: lightTheme.colors.shadow.error,

      primaryDefault: lightTheme.colors.primary.default,
      primaryDefaultHover: lightTheme.colors.primary.defaultHover,
      primaryDefaultPressed: lightTheme.colors.primary.defaultPressed,
      primaryAlternative: lightTheme.colors.primary.alternative,
      primaryMuted: lightTheme.colors.primary.muted,
      primaryInverse: lightTheme.colors.primary.inverse,

      errorDefault: lightTheme.colors.error.default,
      errorDefaultHover: lightTheme.colors.error.defaultHover,
      errorDefaultPressed: lightTheme.colors.error.defaultPressed,
      errorAlternative: lightTheme.colors.error.alternative,
      errorMuted: lightTheme.colors.error.muted,
      errorInverse: lightTheme.colors.error.inverse,

      warningDefault: lightTheme.colors.warning.default,
      warningDefaultHover: lightTheme.colors.warning.defaultHover,
      warningDefaultPressed: lightTheme.colors.warning.defaultPressed,
      warningMuted: lightTheme.colors.warning.muted,
      warningInverse: lightTheme.colors.warning.inverse,

      successDefault: lightTheme.colors.success.default,
      successDefaultHover: lightTheme.colors.success.defaultHover,
      successDefaultPressed: lightTheme.colors.success.defaultPressed,
      successMuted: lightTheme.colors.success.muted,
      successInverse: lightTheme.colors.success.inverse,

      infoDefault: lightTheme.colors.info.default,
      infoMuted: lightTheme.colors.info.muted,
      infoInverse: lightTheme.colors.info.inverse,

      flaskDefault: lightTheme.colors.flask.default,
      flaskInverse: lightTheme.colors.flask.inverse,
    },

    dark: {
      backgroundDefault: darkTheme.colors.background.default,
      backgroundDefaultHover: darkTheme.colors.background.defaultHover,
      backgroundDefaultPressed: darkTheme.colors.background.defaultPressed,
      backgroundAlternative: darkTheme.colors.background.alternative,
      backgroundAlternativeHover: darkTheme.colors.background.alternativeHover,
      backgroundAlternativePressed:
        darkTheme.colors.background.alternativePressed,
      backgroundHover: darkTheme.colors.background.hover,
      backgroundPressed: darkTheme.colors.background.pressed,

      textDefault: darkTheme.colors.text.default,
      textAlternative: darkTheme.colors.text.alternative,
      textMuted: darkTheme.colors.text.muted,

      iconDefault: darkTheme.colors.icon.default,
      iconAlternative: darkTheme.colors.icon.alternative,
      iconMuted: darkTheme.colors.icon.muted,

      borderDefault: darkTheme.colors.border.default,
      borderMuted: darkTheme.colors.border.muted,

      overlayDefault: darkTheme.colors.overlay.default,
      overlayAlternative: darkTheme.colors.overlay.alternative,
      overlayInverse: darkTheme.colors.overlay.inverse,

      shadowDefault: darkTheme.colors.shadow.default,
      shadowPrimary: darkTheme.colors.shadow.primary,
      shadowError: darkTheme.colors.shadow.error,

      primaryDefault: darkTheme.colors.primary.default,
      primaryDefaultHover: darkTheme.colors.primary.defaultHover,
      primaryDefaultPressed: darkTheme.colors.primary.defaultPressed,
      primaryAlternative: darkTheme.colors.primary.alternative,
      primaryMuted: darkTheme.colors.primary.muted,
      primaryInverse: darkTheme.colors.primary.inverse,

      errorDefault: darkTheme.colors.error.default,
      errorDefaultHover: darkTheme.colors.error.defaultHover,
      errorDefaultPressed: darkTheme.colors.error.defaultPressed,
      errorAlternative: darkTheme.colors.error.alternative,
      errorMuted: darkTheme.colors.error.muted,
      errorInverse: darkTheme.colors.error.inverse,

      warningDefault: darkTheme.colors.warning.default,
      warningDefaultHover: darkTheme.colors.warning.defaultHover,
      warningDefaultPressed: darkTheme.colors.warning.defaultPressed,
      warningMuted: darkTheme.colors.warning.muted,
      warningInverse: darkTheme.colors.warning.inverse,

      successDefault: darkTheme.colors.success.default,
      successDefaultHover: darkTheme.colors.success.defaultHover,
      successDefaultPressed: darkTheme.colors.success.defaultPressed,
      successMuted: darkTheme.colors.success.muted,
      successInverse: darkTheme.colors.success.inverse,

      infoDefault: darkTheme.colors.info.default,
      infoMuted: darkTheme.colors.info.muted,
      infoInverse: darkTheme.colors.info.inverse,

      flaskDefault: darkTheme.colors.flask.default,
      flaskInverse: darkTheme.colors.flask.inverse,
    },
  },
  // For web-only, media queries work out of the box and you can avoid the

  // `createMedia` call here by passing the media object directly.

  // If you are going to target React Native, use `createMedia` (it's an identity

  // function on web so you can import it there without concern).

  media: createMedia({
    sm: { maxWidth: 860 },

    gtSm: { minWidth: 860 + 1 },

    short: { maxHeight: 820 },

    hoverNone: { hover: 'none' },

    pointerCoarse: { pointer: 'coarse' },
  }),
  // Shorthands

  // Adds <View m={10} /> to <View margin={10} />

  // See Settings section on this page to only allow shorthands

  // Be sure to have `as const` at the end

  shorthands: {
    px: 'paddingHorizontal',

    f: 'flex',

    m: 'margin',

    w: 'width',
  } as const,
  // Change the default props for any styled() component with a name.

  // We are discouraging the use of this and have deprecated it, prefer to use

  // styled() on any component to change it's styles.

  defaultProps: {
    Text: {
      color: 'green',
    },
  },
});

console.log('Tamagui Config:', config); // Detailed log for Tamagui configuration

type AppConfig = typeof config;
// this will give you types for your components

// note - if using your own design system, put the package name here instead of tamagui

declare module 'tamagui' {
  type TamaguiCustomConfig = AppConfig;
  // if you want types for group styling props, define them like so:

  interface TypeOverride {
    groupNames(): 'a' | 'b' | 'c';
  }
}
export default config;
