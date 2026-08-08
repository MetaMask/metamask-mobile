import '../mocks';
import React from 'react';
import type { DeepPartial } from '../../../app/util/test/renderWithProvider';
import type { RootState } from '../../../app/reducers';
import { renderComponentViewScreen } from '../render';
import NetworkMultiSelector from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector';
import Tokens from '../../../app/components/UI/Tokens/index';
import {
  initialStateNetworkManager,
  initialStateTokenList,
} from '../presets/networkManager';

interface RenderNetworkMultiSelectorOptions {
  overrides?: DeepPartial<RootState>;
  /** Which networks are enabled. Defaults to Ethereum only. */
  enabledNetworks?: Record<string, Record<string, boolean>>;
  /** Active EVM chain ID (hex). Defaults to '0x1'. */
  activeEvmChainId?: string;
  /** Include custom/testnet networks in config. */
  includeCustomNetworks?: boolean;
}

/**
 * Renders NetworkMultiSelector (the Popular networks tab content)
 * with mock callbacks for modal management.
 */
export function renderNetworkMultiSelector(
  options: RenderNetworkMultiSelectorOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const {
    overrides,
    enabledNetworks,
    activeEvmChainId,
    includeCustomNetworks,
  } = options;

  const builder = initialStateNetworkManager({
    enabledNetworks,
    activeEvmChainId,
    includeCustomNetworks,
  });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  const mockDismissModal = jest.fn();
  const mockOpenModal = jest.fn();
  const mockOpenRpcModal = jest.fn();

  const NetworkMultiSelectorWrapper = () => (
    <NetworkMultiSelector
      openModal={mockOpenModal}
      dismissModal={mockDismissModal}
      openRpcModal={mockOpenRpcModal}
    />
  );

  return renderComponentViewScreen(
    NetworkMultiSelectorWrapper,
    { name: 'NetworkMultiSelectorTest' },
    { state },
  );
}

// ─── Token List ──────────────────────────────────────────────

interface RenderTokenListOptions {
  overrides?: DeepPartial<RootState>;
  enabledNetworks?: Record<string, Record<string, boolean>>;
  activeEvmChainId?: string;
  includeCustomNetworks?: boolean;
}

/**
 * Renders the Tokens component (full view) with token data seeded
 * across multiple networks. Uses the initialStateTokenList preset.
 */
export function renderTokenList(
  options: RenderTokenListOptions = {},
): ReturnType<typeof renderComponentViewScreen> {
  const {
    overrides,
    enabledNetworks,
    activeEvmChainId,
    includeCustomNetworks,
  } = options;

  const builder = initialStateTokenList({
    enabledNetworks,
    activeEvmChainId,
    includeCustomNetworks,
  });
  if (overrides) {
    builder.withOverrides(overrides);
  }
  const state = builder.build();

  const TokensWrapper = () => <Tokens isFullView />;

  return renderComponentViewScreen(
    TokensWrapper,
    { name: 'TokenListTest' },
    { state },
  );
}
