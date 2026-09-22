import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen, renderScreenWithRoutes } from '../render';
import QuickBuyRoot from '../../../app/components/UI/QuickBuy/QuickBuyRoot';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from '../../../app/components/UI/QuickBuy/features';
import type {
  QuickBuyAnalyticsContext,
  QuickBuyTarget,
} from '../../../app/components/UI/QuickBuy/types';
import { USDC_DEST } from '../../../app/components/UI/Bridge/_mocks_/bridgeViewTestConstants';
import { BridgeSessionProvider } from '../../../app/components/UI/Bridge/providers/BridgeSessionProvider';
import { SwapQuotesProvider } from '../../../app/components/UI/Bridge/providers/SwapQuotesProvider';
import { initialStateQuickBuy } from '../presets/quickBuy';
import { wireQuickBuySwapQuotePolling } from '../api-mocking/quickBuy';
import { FeatureId } from '@metamask/bridge-controller';

const QuickBuySessionTree = ({ children }: { children: React.ReactNode }) => (
  <BridgeSessionProvider featureId={FeatureId.QUICK_BUY_EXPLORE}>
    <SwapQuotesProvider>{children}</SwapQuotesProvider>
  </BridgeSessionProvider>
);

export const QUICK_BUY_SHEET_ROUTE = 'QuickBuySheet';

export const DEFAULT_QUICK_BUY_TARGET: QuickBuyTarget = {
  tokenAddress: USDC_DEST.address,
  tokenSymbol: USDC_DEST.symbol,
  tokenName: USDC_DEST.name ?? 'USD Coin',
  chain: 'eip155:1',
};

function QuickBuySheetHarness({
  target,
  onClose,
  analyticsContext,
}: {
  target: QuickBuyTarget;
  onClose: () => void;
  analyticsContext?: QuickBuyAnalyticsContext;
}) {
  return (
    <QuickBuySessionTree>
      <QuickBuyRoot
        isVisible
        target={target}
        onClose={onClose}
        features={TOP_TRADERS_QUICK_BUY_FEATURES}
        analyticsContext={analyticsContext}
      />
    </QuickBuySessionTree>
  );
}

export const renderQuickBuySheet = ({
  overrides,
  target = DEFAULT_QUICK_BUY_TARGET,
  onClose = () => undefined,
  analyticsContext,
  extraRoutes,
}: {
  overrides?: DeepPartial<RootState>;
  target?: QuickBuyTarget;
  onClose?: () => void;
  analyticsContext?: QuickBuyAnalyticsContext;
  extraRoutes?: { name: string }[];
} = {}): ReturnType<typeof renderComponentViewScreen> => {
  const builder = initialStateQuickBuy({ deterministicFiat: true });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  const Screen = () => (
    <QuickBuySheetHarness
      target={target}
      onClose={onClose}
      analyticsContext={analyticsContext}
    />
  );

  const screen = extraRoutes?.length
    ? renderScreenWithRoutes(
        Screen as unknown as React.ComponentType,
        { name: QUICK_BUY_SHEET_ROUTE },
        extraRoutes,
        { state },
      )
    : renderComponentViewScreen(
        Screen as unknown as React.ComponentType,
        { name: QUICK_BUY_SHEET_ROUTE },
        { state },
      );

  wireQuickBuySwapQuotePolling(screen.store);
  return screen;
};
