import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { SolScope } from '@metamask/keyring-api';
import Routes from '../../../constants/navigation/Routes';
import { useSwapBridgeNavigation, SwapBridgeNavigationLocation } from '../Bridge/hooks/useSwapBridgeNavigation';
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
    token: getNativeSourceToken(SolScope.Mainnet),
  });

  useEffect(() => {
    if (selectedAddress && isSolanaAddress(selectedAddress)) {
      // First kick them out of Swaps to the Home screen in case they press back in the Bridge UI
      navigation.navigate(Routes.WALLET.HOME, {
        screen: Routes.WALLET.TAB_STACK_FLOW,
        params: {
          screen: Routes.WALLET_VIEW,
        },
      });

      // Then send them to the Bridge UI to handle Solana single chain swaps
      goToSwaps();
    }
  }, [selectedAddress, goToSwaps, navigation]);

  return Boolean(selectedAddress && isSolanaAddress(selectedAddress));
}
