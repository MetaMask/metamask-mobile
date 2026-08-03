import { createMetaMaskWidget } from '../createMetaMaskWidget.android';

// See createMetaMaskWidget.android.ts — widgets are iOS-only. Kept the same
// exported shape as BalanceWidget.ios.tsx (name, props type, `BalanceWidget`
// instance) so `WidgetUpdaterService` (platform-agnostic) can import this
// module without a Platform.OS branch.
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
