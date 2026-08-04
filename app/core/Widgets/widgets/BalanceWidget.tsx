import { createMetaMaskWidget } from '../createMetaMaskWidget';

// See createMetaMaskWidget.ts — widgets are iOS-only, so this base file is
// the non-iOS fallback. Kept the same exported shape as BalanceWidget.ios.tsx
// (name, props type, `BalanceWidget` instance) so `WidgetUpdaterService`
// (platform-agnostic) can import this module without a Platform.OS branch.
//
// This file is `.tsx` despite containing no JSX, and that is load-bearing: it
// MUST use the same extension as its `.ios` counterpart. Metro loops over
// `sourceExts` (`['ts', 'tsx', ...]`) on the outside and platform on the
// inside, so `./BalanceWidget` matches `BalanceWidget.ts` before it ever tries
// `BalanceWidget.ios.tsx`. Named `.ts`, this no-op fallback would silently win
// on iOS too — and pass its `() => undefined` layout into the real native
// `createWidget`, which throws at import time.
//
// `BalanceWidgetProps` is duplicated here rather than imported from
// `./BalanceWidget.ios` — even a type-only import of an explicit `.ios`
// path risks Metro adding it as a real dependency edge and bundling that
// file (with its `@expo/ui/swift-ui` imports) into the Android build.
export interface BalanceWidgetProps {
  balanceDisplay: string;
  label: string;
}

export const BALANCE_WIDGET_NAME = 'BalanceWidget';

export const BalanceWidget = createMetaMaskWidget<BalanceWidgetProps>(
  BALANCE_WIDGET_NAME,
  () => undefined,
);
