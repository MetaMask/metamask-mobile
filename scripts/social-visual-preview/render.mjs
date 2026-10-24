/**
 * Browser preview of a few Social screens for screenshot checks on Linux.
 *
 * Install the web renderer outside this Yarn workspace (a nested Yarn 4
 * install rewrites the root project), then start this file. It serves the
 * HTML pages and writes dist/port.txt.
 *
 *   mkdir -p /tmp/social-web-modules
 *   cp scripts/social-visual-preview/web-modules/package.json /tmp/social-web-modules/
 *   cd /tmp/social-web-modules && corepack yarn@1.22.22 install
 *   cd /workspace && node scripts/social-visual-preview/render.mjs
 *
 * Screenshots: puppeteer-core against /usr/bin/google-chrome, opening
 * http://127.0.0.1:<port>/{feed-before,feed-translate,feed-translated,profile,username}.html
 */
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const outDir = path.join(here, 'dist');
const webModuleRoots = [
  path.join(here, 'web-modules/node_modules'),
  '/tmp/social-web-modules/node_modules',
].filter((candidate) => fs.existsSync(candidate));

const screens = [
  'feed-before',
  'feed-translate',
  'feed-translated',
  'profile',
  'username',
];

const stub = (specifier) => {
  if (specifier.includes('locales/i18n')) {
    return path.join(here, 'i18n-stub.js');
  }
  if (
    specifier.endsWith('/util/theme') ||
    specifier.includes('/util/theme/index')
  ) {
    return path.join(here, 'theme-stub.js');
  }
  if (specifier.includes('/util/haptics')) {
    return path.join(here, 'haptics-stub.js');
  }
  if (specifier.includes('/util/deviceCapability')) {
    return path.join(here, 'device-stub.js');
  }
  if (specifier.endsWith('/hooks/useNetworkTier')) {
    return path.join(here, 'network-stub.js');
  }
  if (specifier === 'react-native-reanimated') {
    return path.join(here, 'reanimated-stub.cjs');
  }
  if (specifier === 'react-native-svg') {
    return path.join(here, 'svg-stub.cjs');
  }
  if (specifier === 'expo-image') {
    return path.join(here, 'image-stub.cjs');
  }
  if (specifier.endsWith('formatters') || specifier.includes('/formatters')) {
    return path.join(here, 'formatters-stub.js');
  }
  if (specifier.includes('/MyProfileView/components/ProfileAvatar')) {
    return path.join(here, 'avatar-stub.js');
  }
  if (specifier.includes('/MyProfileView/avatarPresets')) {
    return path.join(here, 'avatar-presets-stub.js');
  }
  if (
    specifier === 'react-native-safe-area-context' ||
    specifier.startsWith('react-native-safe-area-context/')
  ) {
    return path.join(here, 'safe-area-stub.cjs');
  }
  if (
    specifier === 'react-native-gesture-handler' ||
    specifier.startsWith('react-native-gesture-handler/')
  ) {
    return path.join(here, 'gesture-stub.cjs');
  }
  if (specifier.startsWith('react-native/')) {
    return path.join(here, 'rn-deep-stub.cjs');
  }
  return null;
};

const plugin = {
  name: 'social-preview-stubs',
  setup(build) {
    const allowApp = [
      '/scripts/social-visual-preview/',
      '/app/components/UI/SocialFeed/components/FeedPost.tsx',
      '/app/components/UI/SocialFeed/components/PostTranslationComment.tsx',
      '/app/components/UI/SocialFeed/components/PositionCardComment.tsx',
      '/app/components/UI/SocialFeed/components/TraderAvatar.tsx',
      '/app/components/UI/SocialFeed/components/WinRateTag.tsx',
      '/app/components/UI/SocialFeed/components/SocialFeedPositionCard.testIds.ts',
      '/app/components/UI/SocialFeed/translation/',
      '/app/components/UI/SocialFeed/mocks/socialV1Feed.mock.ts',
      '/app/components/UI/SocialFeed/SocialFeedSurface.tsx',
      '/app/components/UI/SocialFeed/mockMarker.ts',
      '/app/components/UI/SocialFeed/utils/avatarFallback.ts',
      '/app/components/Views/SocialLeaderboard/TraderProfileView/components/ProfileHeader.tsx',
      '/app/components/Views/SocialLeaderboard/TraderProfileView/components/TraderProfileCompactStats.tsx',
      '/app/components/Views/SocialLeaderboard/TraderProfileView/utils/getTraderHeadlineStatsDisplay.ts',
      '/app/components/Views/SocialLeaderboard/TraderProfileView/TraderProfileView.testIds.ts',
      '/app/components/Views/SocialLeaderboard/ProfileOnboarding/UsernameClaimStep.tsx',
      '/app/components/Views/SocialLeaderboard/ProfileOnboarding/UsernameShuffleDie.tsx',
      '/app/components/Views/SocialLeaderboard/ProfileOnboarding/SocialProfileOnboardingView.testIds.ts',
      '/app/constants/time.ts',
    ];

    const reactPackageRoot = path.join(repoRoot, 'node_modules/react');
    const reactDomPackageRoot =
      '/tmp/social-web-modules/node_modules/react-dom';
    const pinnedPackages = {
      react: path.join(reactPackageRoot, 'index.js'),
      'react/jsx-runtime': path.join(reactPackageRoot, 'jsx-runtime.js'),
      'react/jsx-dev-runtime': path.join(
        reactPackageRoot,
        'jsx-dev-runtime.js',
      ),
      'react-dom': path.join(reactDomPackageRoot, 'index.js'),
      'react-dom/client': path.join(reactDomPackageRoot, 'client.js'),
    };

    build.onResolve({ filter: /.*/ }, async (args) => {
      const pinned = pinnedPackages[args.path];
      if (pinned) {
        return { path: pinned };
      }
      if (args.path.includes('/social-web-modules/node_modules/react/')) {
        const suffix = args.path.split(
          '/social-web-modules/node_modules/react/',
        )[1];
        return { path: path.join(reactPackageRoot, suffix) };
      }
      if (args.path === 'react-native') {
        return build.resolve('react-native-web', {
          resolveDir: repoRoot,
          kind: args.kind,
        });
      }
      const redirected = stub(args.path);
      if (redirected) {
        return { path: redirected };
      }
      return null;
    });

    build.onLoad({ filter: /\.svg$/ }, (args) => {
      const svg = fs.readFileSync(args.path);
      const src = `data:image/svg+xml;base64,${svg.toString('base64')}`;
      return {
        contents: `import React from 'react';
const src = ${JSON.stringify(src)};
export default function SvgIcon(props) {
  return React.createElement('img', {
    alt: '',
    width: props.width,
    height: props.height,
    src,
    style: props.style,
  });
}
`,
        loader: 'js',
      };
    });

    build.onLoad({ filter: /\.(ts|tsx|js|jsx)$/ }, (args) => {
      if (!args.path.includes('/workspace/app/')) {
        return null;
      }
      if (allowApp.some((part) => args.path.includes(part))) {
        return null;
      }
      return {
        contents:
          'const noop=()=>null; const stub=new Proxy(noop,{get:()=>stub,apply:()=>stub}); export default stub;',
        loader: 'js',
      };
    });
  },
};

fs.mkdirSync(outDir, { recursive: true });

await esbuild.build({
  absWorkingDir: repoRoot,
  entryPoints: [path.join(here, 'PreviewApp.tsx')],
  bundle: true,
  outfile: path.join(outDir, 'preview.js'),
  format: 'esm',
  platform: 'browser',
  jsx: 'automatic',
  loader: {
    '.js': 'jsx',
    '.mjs': 'jsx',
    '.cjs': 'jsx',
    '.png': 'dataurl',
    '.jpg': 'dataurl',
    '.riv': 'dataurl',
  },
  plugins: [plugin],
  define: {
    'process.env.NODE_ENV': '"development"',
    __DEV__: 'true',
  },
  nodePaths: [path.join(repoRoot, 'node_modules'), ...webModuleRoots],
  mainFields: ['browser', 'module', 'main'],
  conditions: ['browser', 'import', 'module', 'default'],
  logLevel: 'info',
});

const htmlFor = (screen) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${screen}</title>
    <style>
      html, body, #root { margin: 0; background: #ffffff; }
      body { width: 390px; font-family: system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>window.__SOCIAL_PREVIEW_SCREEN__ = ${JSON.stringify(screen)};</script>
    <script type="module" src="./preview.js"></script>
  </body>
</html>
`;

for (const screen of screens) {
  fs.writeFileSync(path.join(outDir, `${screen}.html`), htmlFor(screen));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const filePath = path.join(outDir, decodeURIComponent(url.pathname));
  if (!filePath.startsWith(outDir) || !fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  const type = filePath.endsWith('.js')
    ? 'text/javascript'
    : 'text/html; charset=utf-8';
  res.writeHead(200, { 'content-type': type });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
console.log(`preview server http://127.0.0.1:${port}`);
fs.writeFileSync(path.join(outDir, 'port.txt'), String(port));
