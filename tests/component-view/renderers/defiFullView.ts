import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import DeFiFullView from '../../../app/components/Views/DeFiFullView';
import { initialStateWallet } from '../presets/wallet';

interface RenderDeFiFullViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

export function renderDeFiFullView(
  options: RenderDeFiFullViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;
  const builder = initialStateWallet({ deterministicFiat });

  if (overrides) {
    builder.withOverrides(overrides);
  }

  const state = builder.build();

  return renderComponentViewScreen(
    DeFiFullView as unknown as React.ComponentType,
    { name: Routes.WALLET.DEFI_FULL_VIEW },
    { state },
  );
}
