import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { BtcScope, EthScope, SolScope } from '@metamask/keyring-api';
import type { AssetType } from '@metamask/assets-controller';
import { CaipChainId, Hex } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { selectIsAssetsUnifyStateEnabled } from '../../../../selectors/featureFlagController/assetsUnifyState';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { performEvmTokenRefresh } from '../util/tokenRefreshUtils';

/** Homepage token list: native + ERC-20 / SPL fungibles (not NFT collections). */
const REFRESH_ASSET_TYPES: AssetType[] = ['token', 'price', 'metadata'];

interface UseRefreshTokensOptions {
  /** EVM network configurations restricted to the chains that should be polled. */
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >;
}

/**
 * Refreshes tokens for the currently selected account group across all
 * supported scopes (EVM, Solana, Bitcoin):
 *
 * 1. When the unified assets state flag is enabled, force-refreshes the
 * AssetsController for every scoped account in the group.
 * 2. Triggers `MultichainBalancesController.updateBalance` for every non-EVM
 * scoped account (Solana, Bitcoin, …) — not just Solana.
 * 3. Runs the EVM token detection / balance / rate refresh.
 *
 * Steps 2 and 3 run in parallel since they target different controllers.
 */
export const useRefreshTokens = ({
  evmNetworkConfigurationsByChainId,
}: UseRefreshTokensOptions) => {
  const isAssetsUnifyStateEnabled = useSelector(
    selectIsAssetsUnifyStateEnabled,
  );
  const accountByScope = useSelector(selectSelectedInternalAccountByScope);

  // Resolve every scoped account that exists in the selected group.
  // Missing scopes (e.g. group with no Bitcoin account) resolve to undefined.
  const evmAccount = accountByScope(EthScope.Mainnet);
  const solanaAccount = accountByScope(SolScope.Mainnet);
  const bitcoinAccount = accountByScope(BtcScope.Mainnet);

  const refresh = useCallback(async () => {
    const { AssetsController, MultichainBalancesController } = Engine.context;

    const scopedAccounts: InternalAccount[] = [
      evmAccount,
      solanaAccount,
      bitcoinAccount,
    ].filter((account): account is InternalAccount => Boolean(account));

    // Non-EVM accounts whose balances are refreshed via the multichain
    // balances controller. EVM balances are refreshed separately below.
    const nonEvmAccounts: InternalAccount[] = [
      solanaAccount,
      bitcoinAccount,
    ].filter((account): account is InternalAccount => Boolean(account));

    if (isAssetsUnifyStateEnabled && scopedAccounts.length > 0) {
      const chainIds: CaipChainId[] = Object.values(
        evmNetworkConfigurationsByChainId,
      ).map(({ chainId }) => toEvmCaipChainId(chainId));

      try {
        await AssetsController.getAssets(scopedAccounts, {
          forceUpdate: true,
          chainIds,
          assetTypes: REFRESH_ASSET_TYPES,
        });
      } catch (error) {
        Logger.error(
          error as Error,
          'useRefreshTokens: AssetsController.getAssets failed',
        );
      }
    }

    await Promise.all([
      ...nonEvmAccounts.map(async (account) => {
        try {
          await MultichainBalancesController.updateBalance(account.id);
        } catch (error) {
          Logger.error(
            error as Error,
            `useRefreshTokens: failed to refresh balance for non-EVM account ${account.id}`,
          );
        }
      }),
      performEvmTokenRefresh(evmNetworkConfigurationsByChainId),
    ]);
  }, [
    isAssetsUnifyStateEnabled,
    evmAccount,
    solanaAccount,
    bitcoinAccount,
    evmNetworkConfigurationsByChainId,
  ]);

  return { refresh };
};
