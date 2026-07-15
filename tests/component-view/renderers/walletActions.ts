import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import WalletActions from '../../../app/components/Views/WalletActions';
import { initialStateWalletActions } from '../presets/walletActions';

interface RenderWalletActionsViewOptions {
  overrides?: DeepPartial<RootState>;
  isEvmSelected?: boolean;
}

export function renderWalletActionsView(
  options: RenderWalletActionsViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, isEvmSelected } = options;

  const builder = initialStateWalletActions({ isEvmSelected });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    WalletActions as unknown as React.ComponentType,
    { name: Routes.MODAL.WALLET_ACTIONS },
    { state },
  );
}
