import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { SolScope } from '@metamask/keyring-api';
import Routes from '../../../constants/navigation/Routes';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../Bridge/hooks/useSwapBridgeNavigation';
import { getNativeSourceToken } from '../Bridge/hooks/useInitialSourceToken';

/**
 * Hook to handle chain-specific redirection logic
 * Currently handles Solana chain redirection to Bridge UI
 * @param selectedAddress - The currently selected address
 * @returns boolean indicating if redirection is in progress
 */
export function useChainRedirect(selectedAddress: string): boolean {
  const navigation = useNavigation();

  // Get Solana native asset and bridge navigation
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Swaps,
    sourcePage: 'Legacy Swaps',
    sourceToken: getNativeSourceToken(SolScope.Mainnet),
  });

  useEffect(() => {
    if (selectedAddress && isSolanaAddress(selectedAddress)) {
      // First navigate to Home screen in case they press back after they are in the Bridge UI
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET_VIEW,
      });

      // Wait for next render cycle, then navigate to bridge
      // Without this we are stuck on Home screen
      const frameId = requestAnimationFrame(() => {
        goToSwaps();
      });

      // Cleanup function
      return () => cancelAnimationFrame(frameId);
    }
  }, [selectedAddress, goToSwaps, navigation]);

  return Boolean(selectedAddress && isSolanaAddress(selectedAddress));
}
