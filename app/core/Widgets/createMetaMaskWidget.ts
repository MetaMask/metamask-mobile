import type { WithWidgetTheme } from './types';

/**
 * `expo-widgets` is iOS-only (see node_modules/expo-widgets/expo-module.config.json,
 * `"platforms": ["apple"]`) and its JS entry point calls the *throwing*
 * `requireNativeModule('ExpoWidgets')` at import time, not the optional
 * variant — importing it anywhere reachable from the Android bundle crashes
 * the app at startup. This base `.ts` file (paired with
 * `createMetaMaskWidget.ios.ts`) is what Metro's platform-extension
 * resolution falls back to on every platform other than iOS, keeping
 * `expo-widgets` out of the Android bundle graph entirely.
 *
 * Never import `expo-widgets` or `@expo/ui/swift-ui` from a file that lacks
 * an `.ios.` extension — see docs/widgets/README.md.
 */
export interface NoopWidget<TProps extends object> {
  reload(): void;
  updateTimeline(entries: { date: Date; props: TProps }[]): void;
  updateSnapshot(props: TProps): void;
  getTimeline(): Promise<{ date: Date; props: TProps }[]>;
}

function createNoopWidget<TProps extends object>(): NoopWidget<TProps> {
  return {
    reload: () => undefined,
    updateTimeline: () => undefined,
    updateSnapshot: () => undefined,
    getTimeline: async () => [],
  };
}

export function createMetaMaskWidget<TProps extends object = object>(
  _name: string,
  _layout: (props: TProps & WithWidgetTheme, environment: unknown) => unknown,
): NoopWidget<TProps & WithWidgetTheme> {
  return createNoopWidget<TProps & WithWidgetTheme>();
}
