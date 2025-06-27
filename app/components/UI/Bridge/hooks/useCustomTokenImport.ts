import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { BridgeToken } from '../types';
import { Hex, CaipChainId } from '@metamask/utils';

const LOG_PREFIX = 'Bridge Custom Token Import';

/**
 * Hook to handle custom token imports in the Bridge UI
 * Ensures custom tokens are properly added to the TokensController
 * before attempting to bridge/swap them
 */
export const useCustomTokenImport = () => {
  const importCustomToken = useCallback(
    async (token: BridgeToken, networkClientId?: string) => {
      if (!token || !token.address) {
        Logger.log(LOG_PREFIX, 'No token to import');
        return;
      }

      try {
        const { TokensController } = Engine.context;
        
        // Check if token already exists
        const existingTokens = await TokensController.getTokens();
        const tokenExists = existingTokens.some(
          (t: any) => 
            t.address.toLowerCase() === token.address.toLowerCase() &&
            t.chainId === token.chainId
        );

        if (!tokenExists) {
          Logger.log(LOG_PREFIX, 'Importing custom token', token);
          
          await TokensController.addToken({
            address: token.address,
            symbol: token.symbol,
            decimals: token.decimals,
            name: token.name,
            image: token.image,
            networkClientId,
          });
          
          Logger.log(LOG_PREFIX, 'Custom token imported successfully', token);
        } else {
          Logger.log(LOG_PREFIX, 'Token already exists, skipping import', token);
        }
      } catch (error) {
        Logger.error(error as Error, `${LOG_PREFIX}: Failed to import custom token`);
        // Don't throw, just log - we still want to try the transaction
      }
    },
    []
  );

  return { importCustomToken };
};