import { useSelector } from 'react-redux';
import {
  selectWalletHomeOnboardingTradeSwapPair,
  type WalletHomeOnboardingTradeSwapPair,
} from './walletHomeOnboardingTradeSwapBalances';

/**
 * Subscribes to mainnet balances and resolves trade-step swap defaults (TMCU-681).
 */
export function useWalletHomeOnboardingTradeSwapPair():
  | WalletHomeOnboardingTradeSwapPair
  | undefined {
  return useSelector(selectWalletHomeOnboardingTradeSwapPair);
}
