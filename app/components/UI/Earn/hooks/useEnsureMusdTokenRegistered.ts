import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { retryWithExponentialDelay } from '../../../../util/exponential-retry';
import { selectMusdTokenRegistrationChainIds } from '../selectors/featureFlags';
import { ensureMusdTokenRegistered } from '../utils/musdConversionTransaction';

/**
 * Registers the mUSD token in TokensController for all supported chains on mount.
 * mUSD being registered in the TokensController is necessary for the "Max" conversion flow.
 */
export function useEnsureMusdTokenRegistered(): void {
  const chainIdsToRegister = useSelector(selectMusdTokenRegistrationChainIds);

  useEffect(() => {
    const registerMusdTokens = async () => {
      for (const chainId of chainIdsToRegister as Hex[]) {
        try {
          const networkClientId =
            Engine.context.NetworkController.findNetworkClientIdByChainId(
              chainId,
            );

          await retryWithExponentialDelay(
            () => ensureMusdTokenRegistered({ chainId, networkClientId }),
            2, // 3 total attempts
          );
        } catch (error) {
          Logger.error(
            error as Error,
            `[mUSD] Failed to register mUSD token for chain ${chainId}`,
          );
        }
      }
    };

    registerMusdTokens().catch((error) => {
      Logger.error(error, '[mUSD] Unexpected error in registerMusdTokens');
    });
  }, [chainIdsToRegister]);
}
