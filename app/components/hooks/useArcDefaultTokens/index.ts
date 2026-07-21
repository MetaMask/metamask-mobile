import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { isEvmAccountType } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { CaipAssetType } from '@metamask/utils';
import { NETWORK_CHAIN_ID } from '../../../util/networks/customNetworks';
import { selectEvmNetworkConfigurationsByChainId } from '../../../selectors/networkController';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { getMultiChainAssetsControllerAccountsAssets } from '../../../selectors/assets/assets-migration';
import Engine from '../../../core/Engine';

export const ARC_USDC_ASSET_ID: CaipAssetType =
  'eip155:5042/erc20:0x3600000000000000000000000000000000000000';

export const ARC_NATIVE_ASSET_ID: CaipAssetType =
  'eip155:5042/erc20:0x0000000000000000000000000000000000000000';

/**
 * Adds ERC-20 USDC on Arc for all EVM accounts that don't already have it,
 * whenever the Arc network is present in the user's network list.
 *
 * On Arc the native gas token IS USDC, so the ERC-20 USDC at 0x3600… needs
 * to be imported so the assets controller tracks it — even though the UI
 * hides it as a duplicate of the native token.
 */
export function useArcDefaultTokens() {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const allAccounts = useSelector(selectInternalAccounts);
  const accountsAssets = useSelector(
    getMultiChainAssetsControllerAccountsAssets,
  );

  // Track account IDs we've already dispatched for so we don't re-call on
  // every render while the controller state is catching up.
  const dispatchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!networkConfigurations?.[NETWORK_CHAIN_ID.ARC]) {
      return;
    }

    for (const account of allAccounts as InternalAccount[]) {
      if (!isEvmAccountType(account.type)) {
        continue;
      }
      if (dispatchedRef.current.has(account.id)) {
        continue;
      }

      const existingAssets: string[] = accountsAssets?.[account.id] ?? [];
      const alreadyPresent = existingAssets.some(
        (id) => id.toLowerCase() === ARC_USDC_ASSET_ID.toLowerCase(),
      );

      if (alreadyPresent) {
        dispatchedRef.current.add(account.id);
        continue;
      }

      dispatchedRef.current.add(account.id);
      Engine.context.MultichainAssetsController.addAssets(
        [ARC_USDC_ASSET_ID],
        account.id,
      ).catch((err: unknown) => {
        console.error('useArcDefaultTokens: failed to add Arc USDC', err);
        // Allow retry on next render by removing from the dispatched set.
        dispatchedRef.current.delete(account.id);
      });
    }
  }, [networkConfigurations, allAccounts, accountsAssets]);
}
