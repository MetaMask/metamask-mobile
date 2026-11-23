import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { parseRoutes, findRegistrations, parseImports, findDefinition, buildViewIndex, guessByName, objectSpans } from './views.mjs';

const ROUTES = `
const Routes = {
  MAIN_FLOW: 'Main',
  WALLET: {
    HOME: 'WalletTabHome',
    NESTED: {
      DEEP: 'Deep', // comment
    },
  },
  SETTINGS: { // trailing comment
    ROOT: 'Settings',
  },
  AFTER: "After",
};
export default Routes;
`;

test('parseRoutes flattens nested constants into dotted paths', () => {
  const r = parseRoutes(ROUTES);
  assert.equal(r.get('MAIN_FLOW'), 'Main');
  assert.equal(r.get('WALLET.HOME'), 'WalletTabHome');
  assert.equal(r.get('WALLET.NESTED.DEEP'), 'Deep');
  assert.equal(r.get('SETTINGS.ROOT'), 'Settings');
  assert.equal(r.get('AFTER'), 'After');
});

test('findRegistrations reads names from Routes constants and literals, even with arrows in props', () => {
  const routes = parseRoutes(ROUTES);
  const text = `
const A = () => (
  <Stack.Navigator>
    <Stack.Screen name={Routes.WALLET.HOME} component={Home as ScreenComponent} options={() => ({ title: 'x > y' })} />
    <Stack.Screen
      name={'Literal'}
      component={Lit}
    />
    <Tab.Screen name="Quoted" component={Quoted} />
    <Stack.Screen name={dynamicName} component={Skipped} />
  </Stack.Navigator>
);`;
  const regs = findRegistrations(text, routes);
  assert.deepEqual(regs.map((r) => [r.name, r.component]), [['WalletTabHome', 'Home'], ['Literal', 'Lit'], ['Quoted', 'Quoted']]);
  assert.equal(regs[0].line, 4);
});

test('parseImports handles default, named, renamed and namespace imports', () => {
  const m = parseImports(`
import Foo from './Foo';
import { Bar, Baz as Qux } from '#app/Bar';
import Def, { type Named } from './Def';
import * as Views from './views';
`);
  assert.deepEqual(m.get('Foo'), { spec: './Foo', imported: 'default' });
  assert.deepEqual(m.get('Qux'), { spec: '#app/Bar', imported: 'Baz' });
  assert.deepEqual(m.get('Def'), { spec: './Def', imported: 'default' });
  assert.deepEqual(m.get('Named'), { spec: './Def', imported: 'Named' });
  assert.deepEqual(m.get('Views'), { spec: './views', imported: '*' });
});

test('findDefinition finds const, function and class declarations', () => {
  const text = 'import x from "y";\n\nexport const A = () => null;\nfunction B() {}\nexport default class C {}\n';
  assert.equal(findDefinition(text, 'A'), 3);
  assert.equal(findDefinition(text, 'B'), 4);
  assert.equal(findDefinition(text, 'C'), 5);
  assert.equal(findDefinition(text, 'D'), null);
});

function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'foxy-views-'));
  for (const [rel, body] of Object.entries(files)) {
    const file = join(root, rel);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, body);
  }
  return root;
}

test('buildViewIndex links a screen to its component, through aliases, re-exports and wrappers', () => {
  const root = fixture({
    'app/constants/navigation/Routes.ts': ROUTES,
    'app/Nav/Main.tsx': [
      "import Routes from '../constants/navigation/Routes';",
      "import Home from '../Views/Home';",
      "import { Settings } from '#app/Views/Settings';",
      "import Wrapped from '../Views/Wrapped';",
      "import FromPackage from 'some-package';",
      '',
      'const Local = () => null;',
      'export const Nav = () => (',
      '  <Stack.Navigator>',
      '    <Stack.Screen name={Routes.WALLET.HOME} component={Home} />',
      '    <Stack.Screen name={Routes.SETTINGS.ROOT} component={Settings} />',
      "    <Stack.Screen name={'Wrapped'} component={Wrapped} />",
      "    <Stack.Screen name={'Local'} component={Local} />",
      "    <Stack.Screen name={'Pkg'} component={FromPackage} />",
      '  </Stack.Navigator>',
      ');',
    ].join('\n'),
    'app/Views/Home/index.ts': "export { default } from './Home';\n",
    'app/Views/Home/Home.tsx': 'import React from "react";\n\nconst Home = () => null;\n\nexport default Home;\n',
    'app/Views/Settings/index.ts': "export { Settings } from './Settings';\n",
    'app/Views/Settings/Settings.tsx': 'export const Settings = () => null;\n',
    'app/Views/Wrapped.tsx': [
      'const mapState = (s) => s;',
      'const Wrapped = () => null;',
      'export default connect(mapState)(withTheme(Wrapped));',
    ].join('\n'),
  });
  try {
    const idx = buildViewIndex(root, { files: ['app/Nav/Main.tsx'] });
    assert.deepEqual(idx.WalletTabHome, { component: 'Home', registeredIn: { file: 'app/Nav/Main.tsx', line: 10 }, file: 'app/Views/Home/Home.tsx', line: 3, resolved: true });
    assert.equal(idx.Settings.file, 'app/Views/Settings/Settings.tsx');
    assert.equal(idx.Settings.line, 1);
    assert.equal(idx.Wrapped.file, 'app/Views/Wrapped.tsx');
    assert.equal(idx.Wrapped.line, 2, 'points at the component, not at mapState or the connect() call');
    assert.deepEqual([idx.Local.file, idx.Local.line], ['app/Nav/Main.tsx', 7]);
    assert.deepEqual([idx.Pkg.resolved, idx.Pkg.file, idx.Pkg.line], [false, 'app/Nav/Main.tsx', 14], 'falls back to where it is registered');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('guessByName finds a view file or folder named after the route', () => {
  const root = fixture({
    'app/Views/Wallet/Wallet.tsx': 'const Wallet = () => null;\n',
    'app/Views/Swaps/SwapsAmountView/index.tsx': '\nexport default function SwapsAmountView() { return null; }\n',
  });
  try {
    const files = ['app/Views/Wallet/Wallet.tsx', 'app/Views/Swaps/SwapsAmountView/index.tsx'];
    assert.deepEqual(guessByName(root, files, 'Wallet'), { component: 'Wallet', file: 'app/Views/Wallet/Wallet.tsx', line: 1, registeredIn: null, resolved: true, guess: true });
    assert.equal(guessByName(root, files, 'SwapsAmountView').file, 'app/Views/Swaps/SwapsAmountView/index.tsx');
    assert.equal(guessByName(root, files, 'Nope'), null);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('objectSpans ignores braces in strings and comments, and apostrophes in JSX text', () => {
  const text = [
    "const a = { label: 'a } b', // } comment",
    '  /* { */ c: `x ${ {} } y`, };',
    '<Text>Don\'t {stop} here</Text>',
    'const b = { d: { e: 1 } };',
  ].join('\n');
  const bodies = objectSpans(text).map((s) => text.slice(s.start, s.end + 1));
  assert.ok(bodies.includes("{ label: 'a } b', // } comment\n  /* { */ c: `x ${ {} } y`, }"), bodies.join(' | '));
  assert.ok(bodies.includes('{ e: 1 }'));
  assert.ok(bodies.includes('{ d: { e: 1 } }'));
  assert.ok(bodies.includes('{stop}'));
});

test('config objects join a screen name to a component through a shared key', () => {
  const root = fixture({
    'app/constants/navigation/Routes.ts': "const Routes = {\n  WALLET: {\n    HOME: 'WalletTabHome',\n  },\n  EXPLORE: 'TrendingView',\n};\nexport default Routes;\n",
    'app/Nav/tabs/useTabs.ts': [
      "import Routes from '../../constants/navigation/Routes';",
      'export const useTabs = () => [',
      "  { key: 'home', name: Routes.WALLET.HOME, iconKey: 'wallet' },",
      "  { key: 'explore', name: Routes.EXPLORE, iconKey: 'trend', onPress: () => ({ a: 1 }) },",
      "  { key: 'social', name: 'Social', iconKey: 'x' }, // only one entry: not joined",
      '];',
    ].join('\n'),
    'app/Nav/Main.tsx': [
      "import { WalletStack } from '../Views/Wallet';",
      'const ExploreFeed = () => null;',
      'const Tab = withTheme(ExploreFeed);',
      'const TAB_COMPONENTS = {',
      '  home: WalletStack,',
      '  explore: Tab,',
      '  rewards: Missing,',
      '} satisfies Record<string, unknown>;',
    ].join('\n'),
    'app/Views/Wallet/index.tsx': [
      "import { NativeStack } from 'x';",
      'const WalletWithMessenger = () => null;',
      'export const WalletStack = () => (',
      '  <NativeStack.Navigator initialRouteName={\'WalletView\'}>',
      "    <NativeStack.Screen name=\"WalletView\" component={WalletWithMessenger} />",
      '  </NativeStack.Navigator>',
      ');',
    ].join('\n'),
  });
  try {
    const idx = buildViewIndex(root, { files: ['app/Nav/tabs/useTabs.ts', 'app/Nav/Main.tsx', 'app/Views/Wallet/index.tsx'] });
    assert.deepEqual(idx.WalletTabHome.registeredIn, { file: 'app/Nav/Main.tsx', line: 5 }, 'registered at the map entry');
    assert.equal(idx.WalletTabHome.file, 'app/Views/Wallet/index.tsx', 'follows the stack to the screen it opens first');
    assert.equal(idx.WalletTabHome.line, 2);
    assert.equal(idx.WalletView.file, 'app/Views/Wallet/index.tsx');
    assert.equal(idx.TrendingView.file, 'app/Nav/Main.tsx', 'a wrapper const is followed to the component it wraps');
    assert.equal(idx.TrendingView.line, 2, 'the wrapped ExploreFeed is declared on line 2');
    assert.equal(idx.TrendingView.component, 'Tab');
    assert.equal(idx.Social, undefined, 'a lone name with no component map is not indexed');
    assert.equal(idx.Missing, undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a key that names two different screens is ambiguous and is not joined', () => {
  const root = fixture({
    'app/constants/navigation/Routes.ts': "const Routes = {\n  A: 'ScreenA',\n  B: 'ScreenB',\n};\nexport default Routes;\n",
    'app/Nav/one.ts': "export const one = [{ key: 'dup', name: Routes.A, x: 1 }, { key: 'dup', name: Routes.B, x: 2 }];\n",
    'app/Nav/Main.tsx': 'const Foo = () => null;\nconst M = { dup: Foo, other: Foo };\n',
  });
  try {
    const idx = buildViewIndex(root, { files: ['app/Nav/one.ts', 'app/Nav/Main.tsx'] });
    assert.ok(idx.ScreenA === undefined && idx.ScreenB === undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
