import {
  createWidget,
  type Widget,
  type WidgetEnvironment,
} from 'expo-widgets';

import type { WithWidgetTheme } from './types';

/**
 * Thin, typed wrapper around `expo-widgets`' `createWidget`.
 *
 * IMPORTANT — read before "improving" this function: `layout` is typed as a
 * function for authoring ergonomics, but it is NOT a real function by the
 * time this module runs. `babel-preset-expo`'s widgets plugin (active
 * whenever `expo-widgets` is installed — see
 * node_modules/babel-preset-expo/build/index.js) rewrites any function whose
 * body starts with the `'widget'` directive into a **string literal** of its
 * own source, discarding the surrounding closure entirely. That means:
 *
 * - You CANNOT wrap `layout` in another function here to inject values
 * (e.g. theme) via closure — the serialized string only contains
 * `layout`'s own params + body, so a reference like `getWidgetTheme(...)`
 * would be an undefined global at runtime inside the widget process.
 * - `theme` must arrive as a genuine prop, computed by the caller (see
 * `WidgetUpdaterService`) and passed into `.updateSnapshot()` /
 * `.updateTimeline()`. This wrapper only *type-checks* that `layout`'s
 * props extend `WithWidgetTheme`, as a reminder to destructure `theme`
 * from props rather than importing it.
 *
 * See docs/widgets/README.md ("How widget code actually runs") for the full
 * explanation, and app/core/Widgets/widgets/BalanceWidget.ios.tsx for a
 * worked example.
 */
export function createMetaMaskWidget<TProps extends object = object>(
  name: string,
  layout: (
    props: TProps & WithWidgetTheme,
    environment: WidgetEnvironment,
  ) => React.JSX.Element,
): Widget<TProps & WithWidgetTheme> {
  return createWidget<TProps & WithWidgetTheme>(name, layout);
}
