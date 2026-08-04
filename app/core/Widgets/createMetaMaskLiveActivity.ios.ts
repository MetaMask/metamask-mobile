import {
  createLiveActivity,
  type LiveActivityComponent,
  type LiveActivityFactory,
} from 'expo-widgets';

import type { WithWidgetTheme } from './types';

/**
 * The second argument every Live Activity layout function receives, the
 * counterpart of `WidgetEnvironment` for widgets.
 *
 * `expo-widgets` defines this type but omits it from the re-export list in its
 * package root (node_modules/expo-widgets/src/index.ts) while exporting
 * `LiveActivityComponent`, which consumes it. Deriving it from there keeps us
 * off the non-public `expo-widgets/src/Widgets.types` deep import.
 */
export type LiveActivityEnvironment = Parameters<LiveActivityComponent>[1];

/**
 * Thin, typed wrapper around `expo-widgets`' `createLiveActivity`.
 *
 * Same closure/serialization caveats as `createMetaMaskWidget` apply here —
 * `liveActivity` becomes a string literal at build time via the same
 * `'widget'`-directive Babel transform, so `theme` must be supplied as a
 * genuine prop by whoever calls `.start(props)` / `.update(props)`, not
 * injected by wrapping the function. See docs/widgets/README.md.
 *
 * Registering a Live Activity needs NO native change at all: `WidgetLiveActivity()`
 * (expo-widgets' generic renderer) is already in the widget bundle, and this
 * call writes the stringified layout into the shared App Group container at
 * import time, keyed by `name`, for the extension to read back at render
 * time. See `./liveActivities/PerpsPnlLiveActivity.ios.tsx` for the worked
 * example and docs/widgets/README.md#live-activities for the walkthrough.
 */
export function createMetaMaskLiveActivity<TProps extends object = object>(
  name: string,
  liveActivity: LiveActivityComponent<TProps & WithWidgetTheme>,
): LiveActivityFactory<TProps & WithWidgetTheme> {
  return createLiveActivity<TProps & WithWidgetTheme>(name, liveActivity);
}
