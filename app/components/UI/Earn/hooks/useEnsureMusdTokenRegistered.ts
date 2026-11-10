import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import Logger from '../../../../util/Logger';
import { retryWithExponentialDelay } from '../../../../util/exponential-retry';
import { selectMusdTokenRegistrationChainIds } from '../selectors/featureFlags';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { ensureMusdTokenRegistered } from '../utils/musdConversionTransaction';

/**
 * Registers the mUSD token in unified assets state for all supported chains
 * on mount. mUSD being registered is necessary for the "Max" conversion flow.
 */
export function useEnsureMusdTokenRegistered(): void {
  const chainIdsToRegister = useSelector(selectMusdTokenRegistrationChainIds);
  const selectedEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );

  useEffect(() => {
    const accountId = selectedEvmAccount?.id;
    if (!accountId) {
      return;
    }

    const registerMusdTokens = async () => {
      for (const chainId of chainIdsToRegister as Hex[]) {
        try {
          await retryWithExponentialDelay(
            () => ensureMusdTokenRegistered({ chainId, accountId }),
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
  }, [chainIdsToRegister, selectedEvmAccount]);
}
