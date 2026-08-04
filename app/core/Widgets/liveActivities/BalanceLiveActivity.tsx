import { createMetaMaskLiveActivity } from '../createMetaMaskLiveActivity';

// See createMetaMaskLiveActivity.ts — Live Activities are an iOS-only OS
// feature, so this base file is the non-iOS fallback. It keeps the same
// exported shape as BalanceLiveActivity.ios.tsx (name, props type, factory
// instance) so BalanceLiveActivityService (platform-agnostic) can import this
// module without a Platform.OS branch.
//
// It is `.tsx` despite containing no JSX so that its extension matches the
// `.ios` counterpart — see the same note in ../widgets/BalanceWidget.tsx for
// why a `.ts` fallback would shadow an `.ios.tsx` file on iOS.
//
// `BalanceLiveActivityProps` is duplicated here rather than imported from
// `./BalanceLiveActivity.ios` — even a type-only import of an explicit `.ios`
// path risks Metro adding it as a real dependency edge and bundling that file
// (with its `@expo/ui/swift-ui` imports) into the Android build.
export interface BalanceLiveActivityProps {
  accountLabel: string;
  label: string;
  balanceDisplay: string;
}

export const BALANCE_LIVE_ACTIVITY_NAME = 'BalanceLiveActivity';

export const BalanceLiveActivity =
  createMetaMaskLiveActivity<BalanceLiveActivityProps>(
    BALANCE_LIVE_ACTIVITY_NAME,
    () => undefined,
  );
