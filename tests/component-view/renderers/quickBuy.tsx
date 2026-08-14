import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import QuickBuyRoot from '../../../app/components/UI/QuickBuy/QuickBuyRoot';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from '../../../app/components/UI/QuickBuy/features';
import type { QuickBuyTarget } from '../../../app/components/UI/QuickBuy/types';
import { USDC_DEST } from '../../../app/components/UI/Bridge/_mocks_/bridgeViewTestConstants';
import { initialStateQuickBuy } from '../presets/quickBuy';

export const QUICK_BUY_SHEET_ROUTE = 'QuickBuySheet';

export const DEFAULT_QUICK_BUY_TARGET: QuickBuyTarget = {
  tokenAddress: USDC_DEST.address,
  tokenSymbol: USDC_DEST.symbol,
  tokenName: USDC_DEST.name,
  chain: 'eip155:1',
};

interface RenderQuickBuySheetOptions {
  overrides?: DeepPartial<RootState>;
  target?: QuickBuyTarget;
  onClose?: () => void;
}

function QuickBuySheetHarness({
  target,
  onClose,
}: {
  target: QuickBuyTarget;
  onClose: () => void;
}) {
  return (
    <QuickBuyRoot
      isVisible
      target={target}
      onClose={onClose}
      features={TOP_TRADERS_QUICK_BUY_FEATURES}
    />
  );
}

export function renderQuickBuySheet(
  options: RenderQuickBuySheetOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const {
    overrides,
    target = DEFAULT_QUICK_BUY_TARGET,
    onClose = () => undefined,
  } = options;

  const builder = initialStateQuickBuy({ deterministicFiat: true });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  const Screen = () => (
    <QuickBuySheetHarness target={target} onClose={onClose} />
  );

  return renderComponentViewScreen(
    Screen as unknown as React.ComponentType,
    { name: QUICK_BUY_SHEET_ROUTE },
    { state },
  );
}
