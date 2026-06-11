import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { CaipAssetType } from '@metamask/utils';
import Engine from '../../core/Engine';
import { NETWORKS_CHAIN_ID } from '../../constants/network';
import { selectInternalEvmAccounts } from '../../selectors/accountsController';
import { selectIsAssetsUnifyStateEnabled } from '../../selectors/featureFlagController/assetsUnifyState';
import { selectEvmNetworkConfigurationsByChainId } from '../../selectors/networkController';
import { getCustomAssets } from '../../selectors/assets/assets-controller';
import Logger from '../../util/Logger';

const ARC_USDC_TOKEN_ADDRESS = '0x3600000000000000000000000000000000000000';

const ARC_USDC_ASSET_ID =
  `eip155:5042/erc20:${ARC_USDC_TOKEN_ADDRESS}` as CaipAssetType;

const ARC_USDC_METADATA = {
  address: ARC_USDC_TOKEN_ADDRESS,
  chainId: NETWORKS_CHAIN_ID.ARC,
  symbol: 'USDC',
  name: 'USDC',
  decimals: 6,
};

/**
 * Adds USDC on Arc as a custom asset for every EVM account that doesn't already
 * have it, whenever the Arc network is present. Arc users realistically only
 * interact with USDC (which doubles as the native token), so it is shown by
 * default. Also backfills accounts created after Arc was added.
 *
 * No-op unless the unified assets state is enabled, since the AssetsController
 * is the source of custom assets in that mode.
 */
export function useArcDefaultTokensEffect() {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const evmAccounts = useSelector(selectInternalEvmAccounts);
  const customAssets = useSelector(getCustomAssets);

  // Tracks account IDs we've already dispatched for, to avoid re-dispatching on
  // every render while the controller state catches up.
  const dispatchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isAssetsUnifyStateEnabled) {
      return;
    }

    if (!networkConfigurations?.[NETWORKS_CHAIN_ID.ARC]) {
      return;
    }

    for (const account of evmAccounts) {
      if (dispatchedRef.current.has(account.id)) {
        continue;
      }

      const accountAssets = customAssets[account.id] ?? [];
      if (accountAssets.includes(ARC_USDC_ASSET_ID)) {
        // Already present — mark as handled so we never re-dispatch.
        dispatchedRef.current.add(account.id);
        continue;
      }

      dispatchedRef.current.add(account.id);

      Engine.context.AssetsController.addCustomAsset(
        account.id,
        ARC_USDC_ASSET_ID,
        ARC_USDC_METADATA,
      ).catch((error) => {
        Logger.error(error as Error, {
          message: 'Failed to add default Arc USDC for account',
          accountId: account.id,
        });
      });
    }
  }, [
    isAssetsUnifyStateEnabled,
    networkConfigurations,
    evmAccounts,
    customAssets,
  ]);
}
