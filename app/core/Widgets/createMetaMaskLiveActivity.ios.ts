import {
  createLiveActivity,
  type LiveActivityComponent,
  type LiveActivityFactory,
} from 'expo-widgets';

import type { WithWidgetTheme } from './types';

/**
 * Thin, typed wrapper around `expo-widgets`' `createLiveActivity`.
 *
 * Same closure/serialization caveats as `createMetaMaskWidget` apply here —
 * `liveActivity` becomes a string literal at build time via the same
 * `'widget'`-directive Babel transform, so `theme` must be supplied as a
 * genuine prop by whoever calls `.start(props)` / `.update(props)`, not
 * injected by wrapping the function. See docs/widgets/README.md.
 *
 * This is foundation only: no MetaMask Live Activity (e.g. a Perps P/L
 * activity) is registered in `ios/ExpoWidgetsTarget/index.swift` yet. Adding
 * one requires both a `createMetaMaskLiveActivity(...)` call here on the JS
 * side AND — since `WidgetLiveActivity()` (expo-widgets' generic Live
 * Activity renderer) is already included in the widget bundle — no further
 * native changes for the *first* Live Activity. See
 * docs/widgets/README.md#live-activities for the full walkthrough.
 */
export function createMetaMaskLiveActivity<TProps extends object = object>(
  name: string,
  liveActivity: LiveActivityComponent<TProps & WithWidgetTheme>,
): LiveActivityFactory<TProps & WithWidgetTheme> {
  return createLiveActivity<TProps & WithWidgetTheme>(name, liveActivity);
}
