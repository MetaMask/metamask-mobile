import path from 'path';
import { transformSync } from '@babel/core';

/**
 * Regression guard for the `unstable_transformProfile: 'hermes-stable'` pin in
 * babel.config.js.
 *
 * Without that pin, babel-preset-expo falls back to its `hermes-v0` profile
 * (the React Native CLI never sets the Babel caller's `engine`), which runs
 * `@babel/plugin-transform-named-capturing-groups-regex`. The transform
 * rewrites named-capture-group regexes to use
 * `@babel/runtime/helpers/wrapRegExp`, which breaks under SES lockdown (frozen
 * intrinsics): matches succeed with `match.groups === undefined` — e.g.
 * NetworkController's `INFURA_URL_REGEX`, surfacing at runtime as "Could not
 * derive Infura network".
 *
 * Modern Hermes supports named capture groups natively, so the group must
 * survive the transform untouched when compiled with the project config.
 */
describe('named capturing group regex (Hermes profile)', () => {
  const projectRoot = path.resolve(__dirname, '../..');

  const transform = (src: string, platform: 'ios' | 'android'): string =>
    transformSync(src, {
      filename: path.join(projectRoot, 'app/named-capturing-groups-regex.js'),
      cwd: projectRoot,
      root: projectRoot,
      configFile: path.join(projectRoot, 'babel.config.js'),
      babelrc: false,
      // Mirror how Metro invokes the project Babel config for a native bundle.
      caller: {
        name: 'metro',
        // @ts-expect-error - custom caller fields consumed by babel-preset-expo
        platform,
        supportsStaticESM: true,
      },
    })?.code ?? '';

  it.each(['ios', 'android'] as const)(
    'preserves native named capture groups and does not inject wrapRegExp on %s',
    (platform) => {
      const output = transform(
        'const re = /(?<year>\\d{4})-(?<month>\\d{2})/;',
        platform,
      );

      // The named groups must remain in the emitted source (Hermes runs them natively).
      expect(output).toContain('(?<year>');
      expect(output).toContain('(?<month>');

      // The down-leveling helper must NOT be introduced (it breaks under SES lockdown).
      expect(output).not.toMatch(/wrapRegExp/);
    },
  );
});
