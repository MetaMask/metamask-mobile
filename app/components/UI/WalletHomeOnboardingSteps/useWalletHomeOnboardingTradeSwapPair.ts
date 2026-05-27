import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import type { RootState } from '../../../reducers';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import {
  resolveWalletHomeOnboardingTradeSwapPair,
  type WalletHomeOnboardingTradeSwapPair,
} from './walletHomeOnboardingTradeSwapBalances';

/**
 * Subscribes to mainnet balances and resolves trade-step swap defaults (TMCU-681).
 */
export function useWalletHomeOnboardingTradeSwapPair():
  | WalletHomeOnboardingTradeSwapPair
  | undefined {
  const accountAddress = useSelector(selectSelectedInternalAccountAddress);

  return useSelector((state: RootState) => {
    if (!accountAddress) {
      return undefined;
    }

    return resolveWalletHomeOnboardingTradeSwapPair(
      state,
      accountAddress as Hex,
    );
  });
}
