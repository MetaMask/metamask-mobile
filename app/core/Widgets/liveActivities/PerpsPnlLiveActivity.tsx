import { createMetaMaskLiveActivity } from '../createMetaMaskLiveActivity';

// See createMetaMaskLiveActivity.ts — Live Activities are an iOS-only OS
// feature, so this base file is the non-iOS fallback. It keeps the same
// exported shape as PerpsPnlLiveActivity.ios.tsx (name, props type, factory
// instance) so PerpsLiveActivityService (platform-agnostic) can import this
// module without a Platform.OS branch.
//
// It is `.tsx` despite containing no JSX so that its extension matches the
// `.ios` counterpart — see the same note in ../widgets/BalanceWidget.tsx for
// why a `.ts` fallback would shadow an `.ios.tsx` file on iOS.
//
// `PerpsPnlLiveActivityProps` is duplicated here rather than imported from
// `./PerpsPnlLiveActivity.ios` — even a type-only import of an explicit
// `.ios` path risks Metro adding it as a real dependency edge and bundling
// that file (with its `@expo/ui/swift-ui` imports) into the Android build.
export interface PerpsPnlLiveActivityProps {
  symbol: string;
  directionLabel: string;
  isProfit: boolean;
  pnlLabel: string;
  pnlDisplay: string;
  roeDisplay: string;
  entryPriceLabel: string;
  entryPriceDisplay: string;
  markPriceLabel: string;
  markPriceDisplay: string;
}

export const PERPS_PNL_LIVE_ACTIVITY_NAME = 'PerpsPnlLiveActivity';

export const PerpsPnlLiveActivity =
  createMetaMaskLiveActivity<PerpsPnlLiveActivityProps>(
    PERPS_PNL_LIVE_ACTIVITY_NAME,
    () => undefined,
  );
