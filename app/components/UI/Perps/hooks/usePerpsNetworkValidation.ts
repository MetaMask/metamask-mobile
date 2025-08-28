import { toHex } from '@metamask/controller-utils';
import { toCaipChainId } from '@metamask/utils';
import { useEffect, useRef } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { useNetworkEnablement } from '../../../hooks/useNetworkEnablement/useNetworkEnablement';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  ARBITRUM_TESTNET_CHAIN_ID,
} from '../constants/hyperLiquidConfig';
import { usePerpsNetwork } from './usePerpsNetwork';

/**
 * Hook to ensure Arbitrum network is enabled for perps operations
 * This prevents crashes when trying to deposit/withdraw when Arbitrum is not enabled
 *
 * @returns Object with validation state
 */
export const usePerpsNetworkValidation = () => {
  const { enableNetwork, isNetworkEnabled } = useNetworkEnablement();
  const perpsNetwork = usePerpsNetwork();
  const isTestnet = perpsNetwork === 'testnet';
  const hasValidated = useRef(false);

  useEffect(() => {
    // Only run once per mount
    if (hasValidated.current) return;

    const validateAndEnableArbitrum = async () => {
      try {
        // Determine which Arbitrum network to check based on environment
        const chainId = isTestnet
          ? ARBITRUM_TESTNET_CHAIN_ID
          : ARBITRUM_MAINNET_CHAIN_ID;

        // Convert to hex format for chain ID
        const hexChainId = toHex(parseInt(chainId, 10));

        // Create CAIP chain ID for network enablement check
        const caipChainId = toCaipChainId('eip155', hexChainId);

        DevLogger.log('🔍 Perps Network Validation: Checking Arbitrum', {
          isTestnet,
          chainId,
          hexChainId,
          caipChainId,
        });

        // Check if Arbitrum is enabled
        const isEnabled = isNetworkEnabled(caipChainId);

        if (!isEnabled) {
          DevLogger.log(
            '⚠️ Perps Network Validation: Arbitrum not enabled, enabling...',
            {
              caipChainId,
            },
          );

          // Enable Arbitrum network
          enableNetwork(caipChainId);

          DevLogger.log(
            '✅ Perps Network Validation: Arbitrum enabled successfully',
            {
              caipChainId,
            },
          );
        } else {
          DevLogger.log(
            '✅ Perps Network Validation: Arbitrum already enabled',
            {
              caipChainId,
            },
          );
        }

        hasValidated.current = true;
      } catch (error) {
        DevLogger.log(
          '❌ Perps Network Validation: Failed to validate/enable Arbitrum',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
            isTestnet,
          },
        );
      }
    };

    validateAndEnableArbitrum();
  }, [enableNetwork, isNetworkEnabled, isTestnet, perpsNetwork]);

  return {
    isValidated: hasValidated.current,
  };
};
