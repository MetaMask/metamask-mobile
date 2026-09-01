import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import {
  createRouteParamsProbe,
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../render';
import Routes from '../../../app/constants/navigation/Routes';
import BridgeView from '../../../app/components/UI/Bridge/Views/BridgeView';
import BlockExplorersModal from '../../../app/components/UI/Bridge/components/TransactionDetails/BlockExplorersModal';
import { initialStateBridge } from '../presets/bridge';
import { HardwareWalletProvider } from '../../../app/core/HardwareWallet/HardwareWalletProvider';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { Transaction } from '@metamask/keyring-api';

interface RenderBridgeViewOptions {
  overrides?: DeepPartial<RootState>;
  deterministicFiat?: boolean;
}

interface RenderBlockExplorersModalOptions {
  state: DeepPartial<RootState>;
  params: {
    evmTxMeta?: TransactionMeta;
    multiChainTx?: Transaction;
  };
}

/**
 * Wraps BridgeView in the HardwareWalletProvider so hooks like
 * `useBridgeConfirm` → `useHardwareWallet` resolve during tests.
 * Exported for tests that need to call `renderComponentViewScreen` /
 * `renderScreenWithRoutes` directly with a custom state builder.
 */
export function BridgeViewWithProviders() {
  return React.createElement(
    HardwareWalletProvider,
    null,
    React.createElement(BridgeView as unknown as React.ComponentType),
  );
}

/**
 * Renders BridgeView with a sensible default Bridge preset.
 * Pass overrides to tweak the state for each specific test.
 */
export function renderBridgeView(
  options: RenderBridgeViewOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const { overrides, deterministicFiat } = options;

  const builder = initialStateBridge({ deterministicFiat });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  return renderComponentViewScreen(
    BridgeViewWithProviders as unknown as React.ComponentType,
    { name: Routes.BRIDGE.BRIDGE_VIEW },
    { state },
  );
}

/**
 * Renders BlockExplorersModal with a WEBVIEW.MAIN params probe so explorer
 * presses can assert navigation without mocking useNavigation.
 */
export function renderBlockExplorersModal(
  options: RenderBlockExplorersModalOptions,
): ReturnType<typeof renderScreenWithRoutes> {
  return renderScreenWithRoutes(
    BlockExplorersModal as unknown as React.ComponentType,
    { name: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER },
    [
      {
        name: Routes.WEBVIEW.MAIN,
        Component: createRouteParamsProbe(Routes.WEBVIEW.MAIN),
      },
    ],
    { state: options.state },
    options.params as unknown as Record<string, unknown>,
  );
}
