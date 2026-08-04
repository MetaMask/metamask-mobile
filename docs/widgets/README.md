# iOS Widgets & Live Activities

This is the platform foundation that lets any feature team add an iOS home
screen widget or a Live Activity (Dynamic Island / Lock Screen) to MetaMask
Mobile, on top of [`expo-widgets`](https://docs.expo.dev/versions/latest/sdk/widgets/)
and [`@expo/ui`](https://docs.expo.dev/versions/latest/sdk/ui/).

**iOS only.** `expo-widgets` has no Android equivalent (Android home screen
widgets are a completely different, native-Kotlin/Jetpack Glance system that
would be its own separate foundation). Everything described here compiles out
to no-ops on Android — see [Platform split](#platform-split-iosts--base-ts).

If you just want to add a new widget, skip to
[Adding a new widget](#adding-a-new-widget) or use the
`.cursor/rules/widget-development.mdc` rule / Claude skill, which encodes this
whole document as agent-usable instructions.

## Table of contents

- [Why this exists](#why-this-exists)
- [Architecture at a glance](#architecture-at-a-glance)
- [How widget code actually runs](#how-widget-code-actually-runs)
- [Platform split (`.ios.ts` / base `.ts`)](#platform-split-iosts--base-ts)
- [Theming](#theming)
- [Data flow: `WidgetUpdaterService`](#data-flow-widgetupdaterservice)
- [Feature flag: `MM_WIDGETS_ENABLED`](#feature-flag-mm_widgets_enabled)
- [The reference widget: `BalanceWidget`](#the-reference-widget-balancewidget)
- [Adding a new widget](#adding-a-new-widget)
- [Adding a Live Activity](#adding-a-live-activity)
- [Testing widgets](#testing-widgets)
- [Possibilities](#possibilities)
- [Limitations](#limitations)
- [Provisioning for device and IPA builds](#provisioning-for-device-and-ipa-builds)
- [Troubleshooting](#troubleshooting)

## Why this exists

Feature teams (Perps, Predict, Rewards, ...) want to surface glanceable data
— balances, an open prediction, a live P/L — on the iOS home screen or Lock
Screen without each team having to:

- learn WidgetKit, SwiftUI, and the App Group / target-embedding dance from
  scratch,
- re-derive MetaMask's colors/typography by hand for a context that can't use
  `useTailwind()` or `@metamask/design-system-react-native`,
- or figure out how to get Redux data into a separate, sandboxed process.

This foundation solves those three problems once, in `app/core/Widgets/` and
`ios/ExpoWidgetsTarget/`, so a new widget is "write a props interface + a
small SwiftUI-in-JS layout function", not "set up a new Xcode target".

## Architecture at a glance

```
app/core/Widgets/
├── types.ts                          Shared, serializable types (WidgetTheme, WithWidgetTheme, ...)
├── WidgetTheme.ts                    @metamask/design-tokens -> WidgetTheme (pure, testable)
├── WidgetTheme.test.ts
├── createMetaMaskWidget.ios.ts       Typed wrapper around expo-widgets' createWidget
├── createMetaMaskWidget.ts           No-op fallback (keeps expo-widgets out of the Android bundle)
├── createMetaMaskLiveActivity.ios.ts     Typed wrapper around expo-widgets' createLiveActivity
├── createMetaMaskLiveActivity.ts         No-op fallback
├── WidgetUpdaterService.ts           Subscribes to Redux, computes + pushes props to every widget
├── index.ts                          Barrel (WidgetUpdaterService, WidgetTheme helpers, types)
└── widgets/
    ├── BalanceWidget.ios.tsx         Reference widget: layout + registration
    └── BalanceWidget.ts              No-op fallback with the same exported shape

ios/ExpoWidgetsTarget/                The WidgetKit app extension (a *second*, separate iOS target)
├── Info.plist                        NSExtensionPointIdentifier = com.apple.widgetkit-extension
├── ExpoWidgetsTarget.entitlements    App Group entitlement (data sharing with the main app)
├── index.swift                       @main WidgetBundle — lists every widget kind + WidgetLiveActivity()
└── BalanceWidget.swift               One `Widget` per widget kind (name must match the JS name)

scripts/ios/setup-expo-widgets-target.rb   Created the Xcode target; re-run only to recreate it (see below)
```

Two processes are involved at runtime:

1. **The main MetaMask app** (React Native / Hermes) — where `WidgetUpdaterService`
   lives. It reads Redux state, formats it, and calls
   `SomeWidget.updateSnapshot(props)` from `expo-widgets`, which serializes
   `props` into the shared **App Group** container
   (`group.io.metamask.MetaMask`).
2. **`ExpoWidgetsTarget`** — a separate iOS app extension process, only
   spun up by iOS when WidgetKit needs to render a widget/Live Activity. It
   reads the same App Group container, and runs the widget's layout function
   in an embedded **JavaScriptCore** VM (not Hermes, not the main app's JS
   runtime) to produce SwiftUI views.

These two processes never share memory, imports, or module state — the only
channel between them is the serialized `props` object. That constraint is
the source of almost every rule in this document.

### Why a checked-in Xcode target instead of the config plugin

`expo-widgets` ships an Expo **config plugin** that normally does all of the
native wiring above automatically via `expo prebuild`. That plugin never
executes here, for two independent reasons:

1. This repo is a bare React Native project with a checked-in `ios/`
   directory. `expo run:ios` only calls `expo prebuild` when the `ios/`
   directory is _absent_ — with it present, it resolves the existing Xcode
   project and runs `xcodebuild` directly. `scripts/build.sh`'s
   `prebuild_ios()` is unrelated despite the name: it only writes CI
   xcconfig stubs, runs `git submodule update`, and decodes
   `GoogleService-Info.plist`.
2. `app.config.js` declares a nested `expo:` object. `@expo/config`'s
   `getConfig()` reduces via `config.expo ?? config`, which discards every
   top-level key — `plugins` included — before any Expo tool sees the file
   (it even logs `Ignoring extra keys in Expo config` if something does
   evaluate it through `@expo/config`). `@expo/repack-app`, used for OTA
   repackaging, only reads `name`/`ios`/`android` off the top level via a
   raw `require()` that bypasses `@expo/config` entirely, which is why those
   three keys still matter but `plugins` never has.

So the `expo-widgets` entry in `app.config.js` is inert — like every other
entry in that `plugins` array (`expo-build-properties`, `expo-font`, etc. are
equally unable to run here). It's kept anyway as the canonical declaration of
each widget's metadata, exactly like `expo-font`'s `fonts` array is declared
there even though the actual `UIAppFonts` list is hand-committed into
`ios/MetaMask/Info.plist`. For widgets, the native wiring is committed
instead in `ios/ExpoWidgetsTarget/` and `ios/Podfile`.

`ios/ExpoWidgetsTarget/BalanceWidget.swift`, `index.swift`, `Info.plist`, and
the entitlements file are exactly what the plugin's
`withWidgetSourceFiles.ts` would generate for the `app.config.js` entry —
`scripts/ios/setup-expo-widgets-target.rb` was run once to hand-apply the
rest of what the plugin would have done (the Xcode target itself, the
Podfile block). Keep both in sync by hand: if `expo prebuild` were ever run
against this project, `withWidgetSourceFiles.ts` deletes and regenerates the
entire `ios/ExpoWidgetsTarget/` directory from the `app.config.js` entry
alone, discarding any drift.

You will not normally need to re-run the script — see its own header
comment for the concrete triggers (a missing Xcode target after a
`project.pbxproj` merge conflict, or a misordered "Embed Foundation
Extensions" build phase).

## How widget code actually runs

This is the single most important section — skipping it leads to widgets
that crash at runtime with confusing errors.

`babel-preset-expo` ships a Babel plugin (active automatically whenever
`expo-widgets` is installed) that looks for functions whose body starts with
a `'widget'` directive:

```tsx
function MyWidgetLayout(props, environment) {
  'widget'; // <-- this line
  return <Text>{props.someValue}</Text>;
}
```

At **build time** (including under Jest — `babel.config.tests.js` uses the
same preset), the plugin replaces the _entire function_ with a **string
literal** of its own regenerated source:

```js
var MyWidgetLayout = `function(props,environment){return React.createElement(Text,null,props.someValue);}`;
```

That string is what actually gets sent to `createWidget(name, MyWidgetLayout)`.
`expo-widgets` ships this string to the `ExpoWidgetsTarget` extension, which
`eval`s it inside a fresh JavaScriptCore context whenever WidgetKit asks it to
render.

This has consequences that are easy to get wrong:

- **No closures.** The stringified function only contains its own parameter
  list and body — any reference to a module-scope variable, imported
  function, or constant (`getWidgetTheme()`, a Redux selector, an i18n
  `strings()` call, a `console.log`, anything) is `undefined` inside the JSC
  sandbox, because none of the surrounding module ever gets there. **Every
  value the layout function needs must arrive as a prop.**
- **No arbitrary imports.** The only things safe to reference inside a
  `'widget'`-directive function are the values `expo-widgets`' own bundle
  prelude injects as sandbox globals — in practice, `@expo/ui/swift-ui`
  components/modifiers and plain JS (string/number/array/object methods).
  Anything else (Redux, `@metamask/client-utils`, `Logger`, i18n, hooks)
  must be resolved _outside_ the layout function, by whoever calls
  `.updateSnapshot(props)` — that's `WidgetUpdaterService`'s job.
- **The function can't be unit-tested as a function.** Since it becomes a
  string, `import`ing the module and calling `MyWidgetLayout(props, env)` in
  a test does not run your JSX — it returns a string. See
  [Testing widgets](#testing-widgets) for how to structure code so the real
  logic stays testable.
- **This applies inside `.ios.tsx` files under Jest too**, not just in the
  real widget extension — `babel.config.tests.js` uses `babel-preset-expo`,
  so the transform is applied to test runs as well.

Keep every `'widget'`-directive function as small and "dumb" as possible:
destructure pre-computed props, arrange `@expo/ui/swift-ui` components. Do
all data-fetching, formatting, and business logic in `WidgetUpdaterService`
(or an equivalent, testable, non-widget-directive function it calls).

## Platform split (`.ios.ts` / base `.ts`)

`expo-widgets`' JS entry point calls the _throwing_ variant of
`requireNativeModule('ExpoWidgets')` at **import time** — merely importing
`expo-widgets` (or `@expo/ui/swift-ui`, which does the same for `'ExpoUI'`)
anywhere reachable from the Android bundle crashes the app at startup, since
neither native module is registered on Android.

Every module in `app/core/Widgets/` that touches `expo-widgets` or
`@expo/ui` therefore ships as a pair: a real `.ios.ts(x)` implementation, and
a plain, extensionless `.ts` fallback (same exported names/types, does
nothing) that Metro/`tsc` resolve on every other platform:

| File                                | Runs on         | Behavior                                  |
| ----------------------------------- | --------------- | ----------------------------------------- |
| `createMetaMaskWidget.ios.ts`       | iOS             | Real `expo-widgets` wrapper               |
| `createMetaMaskWidget.ts`           | Everywhere else | No-op fallback, same call signature       |
| `createMetaMaskLiveActivity.ios.ts` | iOS             | Real `expo-widgets` wrapper               |
| `createMetaMaskLiveActivity.ts`     | Everywhere else | No-op fallback                            |
| `widgets/BalanceWidget.ios.tsx`     | iOS             | Real widget (SwiftUI-in-JS layout)        |
| `widgets/BalanceWidget.ts`          | Everywhere else | No-op fallback, same exported names/types |

Metro's bundler resolves an **extensionless** import (`import { BalanceWidget } from './widgets/BalanceWidget'`)
to `BalanceWidget.ios.tsx` on iOS and falls back to the plain `BalanceWidget.ts`
everywhere else, excluding the other file from that platform's bundle
entirely. `WidgetUpdaterService.ts` relies on this — it imports every widget
module extensionlessly so it works, unmodified, on both platforms (no-op on
Android). `tsc` uses its own default (non-platform-aware) module resolution
for the same extensionless import, which also lands on the plain `.ts`
fallback — that's fine, since each platform file is still fully type-checked
on its own when `tsc` walks it directly, and the fallback is written to
mirror the `.ios` file's exported shape exactly.

**Rule of thumb:** never write `import ... from 'expo-widgets'` or
`from '@expo/ui/swift-ui'` in a file that doesn't have an `.ios.` extension,
and never `import` an `.ios.ts(x)` file via its literal `.ios` suffix from a
file that isn't itself `.ios`-only (an explicit `./Foo.ios` import bypasses
Metro's platform exclusion and _will_ get bundled into the Android build).
Prefer importing types from the extensionless fallback module (e.g.
`import type { BalanceWidgetProps } from './widgets/BalanceWidget'`) rather
than the explicit `.ios` path, even though a `type`-only import of an `.ios`
path is technically safe (fully erased by Babel before Metro ever sees it) —
resolving through the fallback keeps the import consistent regardless of
that erasure.

## Theming

Widgets can't use `useTailwind()`, `@metamask/design-system-react-native`, or
any NativeWind/Tailwind runtime — there is no such runtime inside the JSC
sandbox. Instead, `app/core/Widgets/WidgetTheme.ts` builds a small,
serializable snapshot of the design system, shaped for direct use with
`@expo/ui/swift-ui`'s component/modifier props:

```ts
export interface WidgetTheme {
  colorScheme: 'light' | 'dark';
  colors: {
    background;
    surface;
    textDefault;
    textAlternative;
    textMuted;
    primary;
    success;
    error;
    border;
    icon;
  };
  typography: { amountDisplay; headingMd; bodyMd; bodySm; bodyXs }; // { size, weight }
  spacing: { xs; sm; md; lg }; // 4px-based scale, in points
}
```

Two details matter if you extend this:

- **Only solid hex colors are included.** `@expo/ui` parses an 8-digit hex
  string as `#AARRGGBB` (SwiftUI's native order), while
  `@metamask/design-tokens`'s alpha-suffixed tokens (e.g. `border.muted`,
  `background.muted`) are `#RRGGBBAA`. Mixing the two silently produces the
  wrong color. `WidgetTheme` therefore only pulls **solid** tokens (e.g.
  `border.default` instead of `border.muted`). If you need a new color, add
  a solid token here, not an alpha one — or convert it explicitly.
- **Font weights are mapped, not passed through.** Design tokens encode
  weight as a CSS-style string (`'400' | '500' | '600'`);
  `@expo/ui`'s `font({ weight })` modifier expects SwiftUI's semantic names.
  `WidgetTheme.ts` maps `'400' -> 'regular'`, `'500' -> 'medium'`,
  `'600' -> 'bold'`, falling back to `'regular'` for anything unrecognized.

### Light/dark: always pass both

Every widget's props extend `WithWidgetTheme`:

```ts
export interface WithWidgetTheme {
  theme: { light: WidgetTheme; dark: WidgetTheme };
}
```

**Both** variants are always provided — never just "the current" one. The
widget sandbox has no way to react to an OS appearance change other than the
`colorScheme` field on the `environment` argument WidgetKit passes to the
layout function on every render:

```tsx
function BalanceWidgetLayout(
  props: BalanceWidgetProps & WithWidgetTheme,
  environment: WidgetEnvironment,
) {
  'widget';
  const theme =
    environment.colorScheme === 'dark' ? props.theme.dark : props.theme.light;
  // ...
}
```

If you instead resolved "the current theme" in `WidgetUpdaterService` and
passed only one variant, the widget would only pick up a light/dark switch on
the _next_ app-triggered push (e.g. next foreground) — not instantly, the way
every other iOS widget does. Widgets always follow the **system** appearance,
never MetaMask's in-app theme override (Settings → General → Theme) —
`WidgetEnvironment.colorScheme` comes from WidgetKit/the OS and has no
visibility into the host app's Redux state. This matches standard iOS widget
behavior.

## Data flow: `WidgetUpdaterService`

`app/core/Widgets/WidgetUpdaterService.ts` is the **only** place in the app
that should read Redux state on behalf of a widget (widget layout functions
themselves can't use selectors or hooks — see above). It's a singleton,
initialized once from `app/store/index.ts` after persisted state has
rehydrated:

```ts
WidgetUpdaterService.initialize();
```

`initialize()` is a no-op unless `MM_WIDGETS_ENABLED` is `'true'` — a
build-time flag declared in `builds.yml`'s `_public_envs` (see
[Feature flag](#feature-flag-mm_widgets_enabled) below), inlined into the JS
bundle by `transform-inline-environment-variables` (same mechanism as every
other `process.env.MM_*` flag in this repo).

What it does:

1. Subscribes to the Redux store (no-op on Android, see the platform split).
2. On every store change, **debounces** for 2 seconds (`UPDATE_DEBOUNCE_MS`)
   to coalesce rapid updates (e.g. balances streaming in token-by-token)
   into a single native write.
3. After the debounce settles, recomputes props for every registered widget
   in one `pushUpdates()` method (one `push<Widget>Update` private method
   per widget kind) and calls `SomeWidget.updateSnapshot(props)`.
4. Skips the native call entirely if the newly computed props are
   `JSON.stringify`-identical to the last push, to avoid redundant App Group
   writes / WidgetKit reloads.
5. `cleanup()` unsubscribes and cancels any pending debounce timer.

### Adding a widget's data here

Each widget gets one `private computeXProps()` method and one
`private pushXWidgetUpdate()` method, called from `pushUpdates()`. Put
**all** selector reads, formatting (`@metamask/client-utils`'s
`createFormatters`), privacy-mode masking, and i18n (`strings()`) here —
never in the widget's own `.ios.tsx` file.

## Feature flag: `MM_WIDGETS_ENABLED`

The whole foundation is gated behind one build-time flag,
`MM_WIDGETS_ENABLED`, checked in `WidgetUpdaterService.initialize()`. It
defaults to `'false'` in `builds.yml`'s `_public_envs` — every build
(`main-prod`, `main-dev`, etc.) ships with widgets disabled while this
feature is still in development, even though `ExpoWidgetsTarget` is compiled
and embedded and a user could still add the widget from the home screen
gallery; it would just never receive data.

- **To enable for a specific `builds.yml` build**, override it under that
  build's `env:` block (same pattern as any other flag override, e.g.
  `RAMPS_ENVIRONMENT` under `main-test`).
- **To enable for local development**, set
  `export MM_WIDGETS_ENABLED="true"` in your `.js.env` (see
  `.js.env.example`) — local `.js.env` takes precedence over `builds.yml`.
  Restart Metro after changing it; like every `process.env.MM_*` flag in
  this repo, the value is inlined into the bundle at build/transform time by
  Babel's `transform-inline-environment-variables`, not read at runtime.
- **In tests**, `jest.config.js` defaults it to `'true'` so
  `WidgetUpdaterService.test.ts`'s suite exercises the enabled path; that
  file is excluded from the inline-environment-variables transform (see
  `babel.config.tests.js`) specifically so its own test can still toggle the
  flag to `'false'` at runtime to cover the disabled no-op path.

## The reference widget: `BalanceWidget`

`app/core/Widgets/widgets/BalanceWidget.ios.tsx` is the worked example this
whole foundation is built to support. Read it alongside this document — it
shows the full pattern: a `BalanceWidgetProps` interface, a minimal
`'widget'`-directive layout function that only destructures props and
renders `@expo/ui/swift-ui` components, and a `createMetaMaskWidget(...)`
registration.

`WidgetUpdaterService.computeBalanceWidgetProps()` shows the data side: it
reads `selectBalanceBySelectedAccountGroup()` and `selectPrivacyMode`, formats
the balance with `createFormatters(...).formatCurrency(...)`, masks it with
`'•'.repeat(9)` when privacy mode is on (matching `SensitiveTextLength.Medium`
used elsewhere in the app), and reads the label from
`strings('widgets.balance_widget.label')`.

## Adding a new widget

1. **Design the props.** Decide what data the widget needs, as a flat,
   JSON-serializable `MyWidgetProps` interface. Don't include anything that
   needs formatting/i18n at render time — pre-format it.
2. **JS/TS layout — `app/core/Widgets/widgets/MyWidget.ios.tsx`:**
   - Define `MyWidgetProps`.
   - Write `function MyWidgetLayout(props: MyWidgetProps & WithWidgetTheme, environment: WidgetEnvironment) { 'widget'; ... }`
     using only `@expo/ui/swift-ui` (+ `/modifiers`) and the theme resolved
     via `environment.colorScheme` (see [Theming](#theming)).
   - Export `export const MY_WIDGET_NAME = 'MyWidget';` and
     `export const MyWidget = createMetaMaskWidget<MyWidgetProps>(MY_WIDGET_NAME, MyWidgetLayout);`.
3. **Non-iOS fallback — `app/core/Widgets/widgets/MyWidget.ts`:**
   Duplicate the `MyWidgetProps` interface (don't type-import it from the
   `.ios.tsx` file's _value_ export — see [Platform split](#platform-split-iosts--base-ts)),
   and call `createMetaMaskWidget<MyWidgetProps>(MY_WIDGET_NAME, () => undefined)`
   from `../createMetaMaskWidget`.
4. **Data — `WidgetUpdaterService.ts`:** add `computeMyWidgetProps()` and
   `pushMyWidgetUpdate()` methods (mirroring the Balance ones), and call the
   push method from `pushUpdates()`.
5. **Swift target file — `ios/ExpoWidgetsTarget/MyWidget.swift`:** copy
   `BalanceWidget.swift`, replacing `name` (must exactly equal
   `MY_WIDGET_NAME` from step 2), `configurationDisplayName`, `description`,
   and `supportedFamilies`.
6. **Register in the bundle — `ios/ExpoWidgetsTarget/index.swift`:** add
   `MyWidget()` inside the `WidgetBundle`'s `body`. WidgetKit limits a single
   `WidgetBundle` to 4 widgets — if you're adding a 4th+1 widget, you'll need
   to chain a second nested bundle (see the comments in that file).
7. **Document in `app.config.js`.** Add an entry to the `expo-widgets`
   plugin's `widgets` array with `name` (must exactly equal `MY_WIDGET_NAME`
   from step 2), `displayName`, `description`, `supportedFamilies`, and
   `contentMarginsDisabled` matching what you put in step 5's Swift file.
   This entry is never evaluated by any Expo tool in this bare-workflow repo
   (see [Why a checked-in Xcode target instead of the config plugin](#why-a-checked-in-xcode-target-instead-of-the-config-plugin))
   — it exists purely as the canonical, human-readable declaration of the
   widget's metadata, mirroring every other plugin entry in that file.
8. **Add the file to the Xcode target.** The new `.swift` file needs to be a
   member of the `ExpoWidgetsTarget` target, not just exist on disk. Add it
   via Xcode (select the target's membership checkbox in the File Inspector)
   — `scripts/ios/setup-expo-widgets-target.rb` does not help here; it only
   registers files that already existed when the target itself was first
   created, and early-returns once the target exists (see that script's
   header comment).
9. **Tests.** See [Testing widgets](#testing-widgets).
10. **Verify in a simulator.** Build and run the dev app, long-press the
    home screen → "+" → search for the widget's `displayName`, add it, and
    check both light/dark mode and that it updates after changing the
    underlying data in-app.

## Adding a Live Activity

The foundation includes `createMetaMaskLiveActivity` (iOS) / a plain `.ts`
no-op fallback, mirroring `createMetaMaskWidget`. `WidgetLiveActivity()`
— `expo-widgets`' built-in generic Live Activity renderer — is already
included in `ios/ExpoWidgetsTarget/index.swift`'s bundle, so **no further
native/Xcode changes are needed for the first Live Activity** you register.

To add one (e.g. a Perps P/L Live Activity, a natural follow-up to this PR):

1. Define `MyActivityProps` (JSON-serializable content, e.g. `{ symbol, pnl, entryPrice, currentPrice }`).
2. Write a `.ios.ts(x)` file with a `'widget'`-directive component and
   `export const MyActivity = createMetaMaskLiveActivity<MyActivityProps>('MyActivity', MyActivityLayout);`,
   plus a plain `.ts` no-op counterpart (same pattern as widgets).
3. Wherever the feature's state machine knows an activity should start (e.g.
   a Perps position opening), call
   `MyActivity.start(initialProps)` and keep the returned `LiveActivity`
   instance around; call `.update(newProps)` on subsequent changes and
   `.end()` when it should go away. This is feature-owned, not part of
   `WidgetUpdaterService` (Live Activities are usually driven by an event/state
   machine, not a Redux-subscription debounce).
4. Follow the same theming rules — pass both `theme.light`/`theme.dark`.

## Testing widgets

Because a `'widget'`-directive function becomes a **string literal** at
build time (see [How widget code actually runs](#how-widget-code-actually-runs)),
you cannot render its JSX in a test, even with React Testing Library. Test
each layer at the boundary where it's still real code:

- **`WidgetTheme.ts`** — pure functions, test normally
  (`WidgetTheme.test.ts`): color/typography mapping, spacing scale, weight
  fallback, singleton exports.
- **`createMetaMaskWidget.ios.ts` / `createMetaMaskLiveActivity.ios.ts`** —
  assert they delegate to `expo-widgets`' `createWidget`/`createLiveActivity`
  with the right `(name, layout)` args (mocked via `app/__mocks__/expo-widgets.ts`).
- **`createMetaMaskWidget.ts` / `createMetaMaskLiveActivity.ts`** (the non-iOS
  fallbacks) — assert every method is a safe no-op and never throws.
- **A widget's own `*.ios.tsx` file** (see `BalanceWidget.test.ts`) — you can
  still assert the _registration_ (widget name matches the Swift file /
  `createWidget` was called with the right name and that its "layout" arg is
  now a `string`, not a function — a useful regression check that the babel
  transform actually ran) and that the returned object exposes
  `updateSnapshot`/`reload`. You cannot assert anything about the rendered
  UI from this file.
- **`WidgetUpdaterService.ts`** — this is where the real logic (formatting,
  privacy-mode masking, debouncing, redundant-push skipping) lives, and
  where it's actually testable. Mock `ReduxService.store`, the selectors, and
  the widget module (`jest.mock('./widgets/BalanceWidget', ...)`), then drive
  the captured `store.subscribe` listener with `jest.useFakeTimers()` to
  assert debounce/skip/cleanup behavior. See `WidgetUpdaterService.test.ts`
  for the full pattern.

Two Jest infrastructure pieces make any of this possible at all — both are
registered in `jest.config.js`'s `moduleNameMapper` (this project always
explicitly maps native-module mocks there; it doesn't rely on the
auto-discovered root `__mocks__/` convention):

- `app/__mocks__/expo-widgets.ts` — mocks `Widget`/`LiveActivity`/
  `LiveActivityFactory`/`createWidget`/`createLiveActivity`, since the real
  module's JS entry point calls a throwing `requireNativeModule` at import
  time.
- `app/__mocks__/@expo/ui/swift-ui.ts` and `swift-ui-modifiers.ts` — stub
  `@expo/ui/swift-ui`'s components/modifiers for the same reason
  (`requireNativeView`/`requireNativeModule` at import time). Since a
  widget's JSX never actually executes under Jest (it's a string), these
  stubs exist purely so the _import statements_ at the top of `.ios.tsx`
  files resolve without crashing — the components themselves are never
  invoked.

## Possibilities

- Home screen widgets in `systemSmall`/`systemMedium`/`systemLarge` (and any
  other `WidgetFamily` `@expo/ui`/WidgetKit supports) showing any
  JSON-serializable snapshot of app state (balances, an open prediction, a
  DeFi position, ...).
- Live Activities (Lock Screen + Dynamic Island) for anything with a
  start/update/end lifecycle (an open Perps position's live P/L, a pending
  swap, a bridge transaction in flight).
- Consistent, on-brand styling by default via `WidgetTheme`, while still
  allowing full custom SwiftUI-in-JS layout per widget (this is not a rigid
  template system — every widget author writes their own layout function).
- Automatic light/dark mode following the system, matching stock iOS widget
  behavior, no matter how MetaMask's own in-app theme is set.
- Widgets keep working (showing stale-but-present data) even if the main app
  is killed — WidgetKit renders from the last data written to the App Group,
  not by relaunching the app.
- Deep linking from a widget tap back into the app is supported by
  `expo-widgets` (`widgetURL` modifier / Live Activity `url` param) — not yet
  wired up for `BalanceWidget`, but available for a future widget that needs
  it.

## Limitations

- **Disabled by default while in development.** `WidgetUpdaterService`
  never pushes data unless `MM_WIDGETS_ENABLED` is `'true'` — see
  [Feature flag](#feature-flag-mm_widgets_enabled).
- **iOS only.** No Android widget support exists or is planned as part of
  this foundation.
- **No closures / no arbitrary imports inside a layout function** — see
  [How widget code actually runs](#how-widget-code-actually-runs). This is
  the single biggest adjustment for engineers new to this system.
- **No live Redux/hook access inside a widget.** Data is push-only, batched
  and debounced by `WidgetUpdaterService`; a widget cannot subscribe to
  anything itself. Expect a delay of up to `UPDATE_DEBOUNCE_MS` (2s) after a
  relevant Redux change, plus WidgetKit's own OS-level refresh-budget
  throttling (widgets are refreshed a limited number of times per day by
  iOS, regardless of how often the app pushes updates — this is an OS
  policy, not something this foundation controls).
- **No Tailwind/NativeWind, no `@metamask/design-system-react-native`
  components.** Only `@expo/ui/swift-ui` primitives + the `WidgetTheme`
  token snapshot.
- **Only solid (non-alpha) design tokens are exposed** in `WidgetTheme`, to
  avoid an `#RRGGBBAA` vs `#AARRGGBB` mismatch with SwiftUI. If a widget
  needs an alpha color, add explicit conversion rather than piping an alpha
  design token straight through.
- **A widget's own file can't be meaningfully unit-tested for rendering
  output** — only its registration and the data layer (`WidgetUpdaterService`)
  are testable. See [Testing widgets](#testing-widgets).
- **This repo's native project is bare/checked-in**, so `expo prebuild` never
  runs and `expo-widgets`' config plugin never executes — every native
  change (new widget kind, new entitlement, ...) must be hand-applied to
  `ios/`. See [Why a checked-in Xcode target](#why-a-checked-in-xcode-target-instead-of-the-config-plugin).
- **WidgetKit's 4-widgets-per-`WidgetBundle` limit** applies once this
  foundation has 5+ widget kinds — see the chunking note in
  `ios/ExpoWidgetsTarget/index.swift`.
- **No push-based remote updates** are wired up yet (Live Activities support
  APNs push updates via `getPushToken()`/`addPushTokenListener()` on
  `expo-widgets`' API, but no server-side integration exists in this repo).
- **`MetaMask-Flask` ships without widgets.** `ExpoWidgetsTarget` is only
  embedded in and depended on by the `MetaMask` scheme/target — the
  `MetaMask-Flask` scheme has no dependency on it and no
  "Embed Foundation Extensions" phase referencing it, and the extension's
  hardcoded `PRODUCT_BUNDLE_IDENTIFIER` (`io.metamask.MetaMask.ExpoWidgetsTarget`)
  is not a valid child of `io.metamask.MetaMask-Flask` in any case. This is
  intentional for now — widgets are a `main`-build-type feature. Shipping
  them on Flask too would require a second, parallel extension target (its
  own bundle id, entitlements, and provisioning) rather than a config
  change; open an issue/RFC before taking that on.
- **Device/IPA builds require additional Apple Developer portal setup that
  does not exist yet** — see [Provisioning for device and IPA builds](#provisioning-for-device-and-ipa-builds).
  Simulator builds and E2E are unaffected.

## Provisioning for device and IPA builds

`ExpoWidgetsTarget` currently signs with `CODE_SIGN_STYLE = Automatic` and no
`PROVISIONING_PROFILE_SPECIFIER`, which is sufficient for local
Xcode-managed device runs but not for the manually-signed archives this repo's
CI produces. Before a device or IPA build with widgets present will succeed,
someone with Apple Developer portal access needs to:

1. **Enable the App Group capability** on the existing `Bitrise AppStore io.metamask.MetaMask`
   and `development-metamask` provisioning profiles (`ios/MetaMask/MetaMask.entitlements`
   and `MetaMaskDebug.entitlements` now declare
   `com.apple.security.application-groups: group.io.metamask.MetaMask`, which
   the app's existing profiles don't yet grant).
2. **Create two new provisioning profiles** for the extension's bundle id,
   `io.metamask.MetaMask.ExpoWidgetsTarget`, mirroring the app's own
   development and App Store distribution profiles, both with the same App
   Group capability enabled.
3. **Add `provisioningProfiles` entries** for `io.metamask.MetaMask.ExpoWidgetsTarget`
   to `ios/MetaMask/IosExportOptionsMetaMaskDevelopment.plist` and
   `IosExportOptionsMetaMaskRelease.plist` (the two plists `MetaMask`-scheme
   `xcodebuild -exportArchive` calls use) — currently they only map the app's
   own bundle id, and `-exportArchive` will fail to export an archive
   containing an embedded extension it has no mapping for.
4. **Switch `ExpoWidgetsTarget` to `CODE_SIGN_STYLE = Manual`** with a
   `PROVISIONING_PROFILE_SPECIFIER` pointing at the new profile from step 2,
   matching how the `MetaMask` target itself signs.
5. **Revisit `scripts/build.sh`'s `archiveOverrides`** (used when
   `PROFILE=development`). `xcodebuild` command-line build-setting overrides
   apply to every target in the archive, including the embedded extension —
   today's override hardcodes `PROVISIONING_PROFILE_SPECIFIER=development-metamask`,
   which is the _app's_ profile name, not the extension's. See the `NOTE
(widgets)` comment at that call site.

Until this is done, `PROFILE=development` (and any distribution) archive of
the `MetaMask` scheme with `ExpoWidgetsTarget` embedded will fail at the
signing step for the extension. This does not affect `yarn start:ios`,
`yarn build:ios:main:dev` simulator builds, or E2E, which don't go through
`xcodebuild archive`/`-exportArchive`.

## Troubleshooting

- **"Widget not appearing in the simulator's widget gallery"** — confirm the
  widget's `.swift` file is a member of the `ExpoWidgetsTarget` build target
  (Xcode → file inspector → Target Membership), that `index.swift` lists it
  in the `WidgetBundle`, and that you've done a full rebuild (not just
  Metro reload — widget code lives in a separate native binary).
- **"Widget shows stale/blank data"** — check that `WidgetUpdaterService.initialize()`
  ran (it's called once, from `app/store/index.ts`, after persisted state
  loads) and that the App Group identifier matches exactly across
  `ios/MetaMask/Info.plist`'s `ExpoWidgetsAppGroupIdentifier`,
  `MetaMask.entitlements`, `MetaMaskDebug.entitlements`, and
  `ExpoWidgetsTarget/Info.plist` + `ExpoWidgetsTarget.entitlements`
  (`group.io.metamask.MetaMask` everywhere). Mismatched entitlements silently
  fail to share data instead of erroring. Also remember the ~2s debounce.
- **"`ReferenceError` for some variable inside the widget at runtime on
  device, but it looked fine in the editor"** — you referenced something
  outside the layout function's own params (a closure, an import, a
  module-scope constant). Re-read [How widget code actually runs](#how-widget-code-actually-runs)
  and move the value into props.
- **"Jest throws trying to `require` an `.ios.tsx` widget file"** — you're
  likely missing a `moduleNameMapper` entry for a new `@expo/ui` submodule
  path you imported; add it next to the existing `@expo/ui/swift-ui`
  entries in `jest.config.js` and create the matching stub in
  `app/__mocks__/@expo/ui/`.
- **"App crashes on Android after touching `app/core/Widgets/`"** — you
  imported `expo-widgets` or `@expo/ui` from a file without an `.ios.`
  extension, or used an explicit `.ios` suffix on a _value_ import from a
  file that isn't itself iOS-only. See [Platform split](#platform-split-iosts--base-ts).
- **"Two entries for the same widget in the simulator's widget gallery"** —
  a stale WidgetKit registration from before the `ExpoWidgetsTarget` Xcode
  target's identity last changed (e.g. after re-running
  `setup-expo-widgets-target.rb`, or switching branches across a target
  rename), not a code defect — `pluginkit -m -p com.apple.widgetkit-extension`
  (run via `xcrun simctl spawn <udid> pluginkit ...` for a simulator) will
  show only one entry for `io.metamask.MetaMask.ExpoWidgetsTarget` if the
  extension itself is registered correctly. Erase the simulator
  (`xcrun simctl erase <udid>`) or delete the app from a device, wipe
  DerivedData, and reinstall.
- **"`pod install` fails: `Unable to find a target named 'ExpoWidgetsTarget'
in project 'MetaMask.xcodeproj'`"** — the Xcode target itself is missing,
  most likely from a `project.pbxproj` merge/rebase conflict resolved by
  taking one side wholesale. Run `ruby scripts/ios/setup-expo-widgets-target.rb`
  to recreate it (idempotent — safe even if you're unsure whether it's
  actually missing), then rerun `pod install`.
