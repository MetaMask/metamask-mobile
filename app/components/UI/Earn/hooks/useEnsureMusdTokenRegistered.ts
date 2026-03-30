import { useEffect } from 'react';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ensureMusdTokenRegistered } from '../utils/musdConversionTransaction';
import { CHAIN_IDS } from '@metamask/transaction-controller';

/**
 * Registers the mUSD token in TokensController for all supported chains on mount.
 * mUSD being registered in the TokensController is necessary for the "Max" conversion flow.
 */
// TODO: Consider creating a remote feature flag for this.
const CHAIN_IDS_TO_REGISTER = [CHAIN_IDS.MAINNET, CHAIN_IDS.LINEA_MAINNET];

export function useEnsureMusdTokenRegistered(): void {
  useEffect(() => {
    const registerMusdTokens = async () => {
      for (const chainId of CHAIN_IDS_TO_REGISTER) {
        const networkClientId =
          Engine.context.NetworkController.findNetworkClientIdByChainId(
            chainId,
          );

        if (!networkClientId) {
          continue;
        }

        try {
          await ensureMusdTokenRegistered({ chainId, networkClientId });
        } catch (error) {
          Logger.error(
            error as Error,
            `[mUSD] Failed to register mUSD token for chain ${chainId}`,
          );
        }
      }
    };

    registerMusdTokens();
  }, []);
}
