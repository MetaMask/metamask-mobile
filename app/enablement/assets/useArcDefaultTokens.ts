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
 * Adds USDC on Arc as a default token for every EVM account that doesn't
 * already have it, whenever the Arc network is present. Arc users realistically
 * only interact with USDC (which doubles as the native token), so it is shown
 * by default. Also backfills accounts created after Arc was added.
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

  const tokenDispatchInFlightRef = useRef<Set<string>>(new Set());
  const tokenDispatchCompletedRef = useRef<Set<string>>(new Set());
  const customAssetInFlightRef = useRef<Set<string>>(new Set());
  const customAssetDispatchCompletedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!networkConfigurations?.[NETWORKS_CHAIN_ID.ARC]) {
      return;
    }

    const networkClientId =
      Engine.context.NetworkController.findNetworkClientIdByChainId(
        NETWORKS_CHAIN_ID.ARC,
      );

    for (const account of evmAccounts) {
      if (
        !tokenDispatchInFlightRef.current.has(account.id) &&
        !tokenDispatchCompletedRef.current.has(account.id)
      ) {
        tokenDispatchInFlightRef.current.add(account.id);
        // Legacy TokensController
        Engine.context.TokensController.addToken({
          address: ARC_USDC_TOKEN_ADDRESS,
          symbol: ARC_USDC_METADATA.symbol,
          decimals: ARC_USDC_METADATA.decimals,
          name: ARC_USDC_METADATA.name,
          networkClientId,
          interactingAddress: account.address,
        })
          .then(() => {
            tokenDispatchCompletedRef.current.add(account.id);
          })
          .catch((error) => {
            Logger.error(error as Error, {
              message: 'Failed to add default Arc USDC token for account',
              accountId: account.id,
            });
          })
          .finally(() => {
            tokenDispatchInFlightRef.current.delete(account.id);
          });
      }

      // New AssetsController
      if (!isAssetsUnifyStateEnabled) {
        continue;
      }

      const accountAssets = customAssets[account.id] ?? [];
      if (accountAssets.includes(ARC_USDC_ASSET_ID)) {
        customAssetDispatchCompletedRef.current.add(account.id);
        continue;
      }

      if (
        customAssetInFlightRef.current.has(account.id) ||
        customAssetDispatchCompletedRef.current.has(account.id)
      ) {
        continue;
      }

      customAssetInFlightRef.current.add(account.id);
      Engine.context.AssetsController.addCustomAsset(
        account.id,
        ARC_USDC_ASSET_ID,
        ARC_USDC_METADATA,
      )
        .then(() => {
          customAssetDispatchCompletedRef.current.add(account.id);
        })
        .catch((error) => {
          Logger.error(error as Error, {
            message: 'Failed to add default Arc USDC custom asset for account',
            accountId: account.id,
          });
        })
        .finally(() => {
          customAssetInFlightRef.current.delete(account.id);
        });
    }
  }, [
    isAssetsUnifyStateEnabled,
    networkConfigurations,
    evmAccounts,
    customAssets,
  ]);
}
