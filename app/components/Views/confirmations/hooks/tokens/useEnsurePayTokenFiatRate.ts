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

const log = createProjectLogger('pay-token-fiat-rate');

/**
 * Returns a callback that ensures a market/fiat rate is available for a token
 * before it is selected as a pay/receive token.
 *
 * The pay controller resolves a token only when it has BOTH metadata and a
 * fiat rate; adding a token to the wallet populates metadata but not price, so
 * a freshly-selected withdraw destination token (e.g. a token the user does
 * not yet hold) can otherwise fail to resolve. Best-effort: failures are
 * logged and swallowed so token selection is never blocked.
 */
export function useEnsurePayTokenFiatRate(): (token: {
  address: Hex;
  chainId: Hex;
}) => Promise<void> {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  return useCallback(
    async ({ address, chainId }: { address: Hex; chainId: Hex }) => {
      try {
        const { AssetsController, TokenRatesController } = Engine.context;

        if (isAssetsUnifyStateEnabled) {
          const caipChainId = toEvmCaipChainId(chainId);
          const caipAssetType = toAssetId(address, caipChainId);

          if (!evmAccount || !caipAssetType || !AssetsController?.getAssets) {
            return;
          }

          await AssetsController.getAssets([evmAccount], {
            chainIds: [caipChainId],
            dataTypes: ['price'],
            forceUpdate: true,
            assetsForPriceUpdate: [caipAssetType as Caip19AssetId],
          });
          return;
        }

        const nativeCurrency = networkConfigurations?.[chainId]?.nativeCurrency;

        if (!nativeCurrency || !TokenRatesController?.updateExchangeRates) {
          return;
        }

        await TokenRatesController.updateExchangeRates([
          { chainId, nativeCurrency },
        ]);
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
