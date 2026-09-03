/**
 * Guards the path matching in babel.config.js against separator regressions.
 *
 * Metro hands Babel platform-native paths — backslash-separated on Windows —
 * so every `ignore` and override `test` must match BOTH styles. A check that
 * only matches forward slashes silently never fires on Windows (see the
 * posixPath/pathIncludes comments in babel.config.js).
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs
const babelConfig = require('../babel.config');

type PathPredicate = (filename: string | undefined) => boolean;

interface BabelOverride {
  test: PathPredicate;
  plugins: unknown[];
}

const overrides: BabelOverride[] = babelConfig.overrides;
const ignoreFn: PathPredicate = babelConfig.ignore[0];

/** POSIX-relative needle → { posix, windows } absolute path variants. */
const toBothStyles = (posixRelative: string) => ({
  posix: `/home/dev/metamask-mobile${posixRelative}`,
  windows: `C:\\Users\\dev\\metamask-mobile${posixRelative.replace(
    /\//g,
    '\\',
  )}`,
});

describe('babel.config.js path matching', () => {
  describe('ignore', () => {
    it.each([
      '/node_modules/ses/dist/ses.cjs',
      '/node_modules/@lavamoat/react-native-lockdown/dist/ses-hermes.cjs',
      '/node_modules/@lavamoat/react-native-lockdown/src/repair.js',
      '/node_modules/expo/virtual/streams.js',
    ])('ignores %s in both path styles', (relativePath) => {
      const { posix, windows } = toBothStyles(relativePath);

      expect(ignoreFn(posix)).toBe(true);
      expect(ignoreFn(windows)).toBe(true);
    });

    it.each(['/app/index.js', '/app/core/Engine/Engine.ts'])(
      'does not ignore app file %s in either path style',
      (relativePath) => {
        const { posix, windows } = toBothStyles(relativePath);

        expect(ignoreFn(posix)).toBe(false);
        expect(ignoreFn(windows)).toBe(false);
      },
    );

    it('does not throw on undefined filename', () => {
      expect(ignoreFn(undefined)).toBe(false);
    });
  });

  describe('overrides', () => {
    // Every override in babel.config.js, keyed by a file each `test` must
    // match. Adding an override there requires adding a row here.
    const OVERRIDE_TARGETS = [
      '/node_modules/marked/src/marked.js',
      '/node_modules/@metamask/profile-sync-controller/dist/index.js',
      '/node_modules/@metamask/notification-services-controller/dist/index.js',
      '/node_modules/@metamask/bridge-controller/dist/index.js',
      '/node_modules/@nktkas/hyperliquid/dist/index.js',
      '/node_modules/@noble/secp256k1/index.js',
      '/node_modules/@metamask/rpc-errors/dist/index.js',
      '/app/lib/snaps/SnapsExecutionWebView.tsx',
      '/app/core/redux/ReduxService.ts',
      '/app/core/Engine/Engine.ts',
      '/app/core/NavigationService/NavigationService.ts',
      '/app/core/OAuthService/OAuthLoginHandlers/index.ts',
    ];

    it('covers every override with a target row', () => {
      expect(overrides).toHaveLength(OVERRIDE_TARGETS.length);
    });

    it.each(OVERRIDE_TARGETS)(
      'matches %s identically in both path styles',
      (relativePath) => {
        const { posix, windows } = toBothStyles(relativePath);

        const posixMatches = overrides.filter((o) => o.test(posix));
        const windowsMatches = overrides.filter((o) => o.test(windows));

        expect(posixMatches.length).toBeGreaterThan(0);
        expect(windowsMatches).toEqual(posixMatches);
      },
    );

    it('matches no override for an unrelated file in either path style', () => {
      const { posix, windows } = toBothStyles(
        '/app/components/Views/Wallet/index.tsx',
      );

      expect(overrides.some((o) => o.test(posix))).toBe(false);
      expect(overrides.some((o) => o.test(windows))).toBe(false);
    });

    it('does not throw on undefined filename', () => {
      overrides.forEach((o) => {
        expect(o.test(undefined)).toBe(false);
      });
    });
  });
});
