import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import type { Caip19AssetId } from '@metamask/assets-controller';
import { Hex, createProjectLogger } from '@metamask/utils';
import Engine from '../../../../../core/Engine';
import { selectIsAssetsUnifyStateEnabled } from '../../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { toAssetId } from '../../../../UI/Bridge/hooks/useAssetMetadata/utils';

const log = createProjectLogger('pay-token-ensure');

export interface EnsurePayTokenParams {
  address: Hex;
  chainId: Hex;
  symbol: string;
  decimals: number;
  name?: string;
}

/**
 * Returns a callback that ensures a token can be resolved by the pay
 * controller before it is selected as a receive/pay token.
 *
 * In unified assets state the pay controller reads token metadata from
 * AssetsController, so a freshly-selected withdraw destination token (one the
 * user does not already hold) must be registered there via `addCustomAsset`.
 * The token's fiat rate is also refreshed best-effort. Failures are logged and
 * swallowed so token selection is never blocked.
 */
export function useEnsurePayToken(): (
  token: EnsurePayTokenParams,
) => Promise<void> {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  return useCallback(
    async ({
      address,
      chainId,
      symbol,
      decimals,
      name,
    }: EnsurePayTokenParams) => {
      const { AssetsController, TokenRatesController } = Engine.context;
      const caipChainId = toEvmCaipChainId(chainId);
      const caipAssetType = toAssetId(address, caipChainId);

      // Register the token in unified assets state so the pay controller can
      // resolve its metadata (legacy metadata is added by the caller via
      // TokensController.addTokens).
      if (
        isAssetsUnifyStateEnabled &&
        evmAccount?.id &&
        caipAssetType &&
        AssetsController?.addCustomAsset
      ) {
        try {
          await AssetsController.addCustomAsset(
            evmAccount.id,
            caipAssetType as Caip19AssetId,
            { address, chainId, decimals, name: name ?? symbol, symbol },
          );
        } catch (error) {
          log('addCustomAsset failed', { address, chainId, error });
        }
      }

      // Refresh the token's fiat/market rate (best-effort). When unavailable
      // for the token's chain, the pay controller resolves without it for
      // post-quote/withdraw destinations.
      try {
        if (isAssetsUnifyStateEnabled) {
          if (evmAccount && caipAssetType && AssetsController?.getAssets) {
            await AssetsController.getAssets([evmAccount], {
              chainIds: [caipChainId],
              dataTypes: ['price'],
              forceUpdate: true,
              assetsForPriceUpdate: [caipAssetType as Caip19AssetId],
            });
          }
          return;
        }

        const nativeCurrency = networkConfigurations?.[chainId]?.nativeCurrency;

        if (nativeCurrency && TokenRatesController?.updateExchangeRates) {
          await TokenRatesController.updateExchangeRates([
            { chainId, nativeCurrency },
          ]);
        }
      } catch (error) {
        log('Failed to refresh pay token fiat rate', {
          address,
          chainId,
          error,
        });
      }
    },
    [isAssetsUnifyStateEnabled, evmAccount, networkConfigurations],
  );
}
