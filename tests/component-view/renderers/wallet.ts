import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import Wallet from '../../../app/components/Views/Wallet';
import { initialStateWallet } from '../presets/wallet';

interface RenderWalletViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

/**
 * Renders Wallet view with a sensible default Wallet preset.
 * Pass overrides to tweak the state for each specific test.
 */
export function renderWalletView(
  options: RenderWalletViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;

  const builder = initialStateWallet({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    Wallet as unknown as React.ComponentType,
    { name: Routes.WALLET_VIEW },
    { state },
  );
}
