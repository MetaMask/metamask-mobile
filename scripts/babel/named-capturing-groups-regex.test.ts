import { transformSync } from '@babel/core';

/**
 * Regression guard for the `@react-native/babel-preset` patch
 * (.yarn/patches/@react-native-babel-preset-npm-0.83.6-*.patch).
 *
 * That patch disables `@babel/plugin-transform-named-capturing-groups-regex` on
 * the Hermes transform profile. The transform rewrites named-capture-group
 * regexes to use `@babel/runtime/helpers/wrapRegExp`, which breaks under SES
 * lockdown (frozen intrinsics): `RegExp.prototype.exec` returns `null` for
 * strings that should match — e.g. NetworkController's `INFURA_URL_REGEX`,
 * surfacing at runtime as "Could not derive Infura network".
 *
 * Modern Hermes supports named capture groups natively, so the group must
 * survive the transform untouched. The patch is version-pinned to the
 * `@react-native/babel-preset` version that `babel-preset-expo` pulls in
 * nested; an Expo SDK / React Native bump can silently drop it (Yarn does not
 * fail on an unused patch resolution). This test fails loudly if that happens.
 */
describe('named capturing group regex (Hermes profile)', () => {
  const transform = (src: string): string =>
    transformSync(src, {
      filename: 'named-capturing-groups-regex.guard.js',
      babelrc: false,
      configFile: false,
      // Mirror how Metro invokes babel-preset-expo for a native iOS bundle.
      caller: {
        name: 'metro',
        // @ts-expect-error - custom caller fields consumed by babel-preset-expo
        platform: 'ios',
        supportsStaticESM: true,
      },
      presets: [
        [
          require('babel-preset-expo'),
          {
            unstable_transformProfile: 'hermes-stable',
            // Keep the transform output focused on the regex under test.
            reanimated: false,
            worklets: false,
            enableBabelRuntime: false,
          },
        ],
      ],
    })?.code ?? '';

  it('preserves native named capture groups and does not inject wrapRegExp', () => {
    const output = transform('const re = /(?<year>\\d{4})-(?<month>\\d{2})/;');

    // The named groups must remain in the emitted source (Hermes runs them natively).
    expect(output).toContain('(?<year>');
    expect(output).toContain('(?<month>');

    // The down-leveling helper must NOT be introduced (it breaks under SES lockdown).
    expect(output).not.toMatch(/wrapRegExp/);
  });
});
