import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { isHardwareAccount } from '../../../../../util/address';

/**
 * Returns whether the current bridge source account is a hardware wallet.
 * Hardware wallet accounts must not use or display gas sponsorship (7702).
 * Use effectiveGasIncluded = !isHardwareWallet && gasIncluded7702 for UI and requests.
 */
export function useIsHardwareWalletForBridge(): boolean {
  const walletAddress = useSelector(selectSourceWalletAddress);

  return useMemo(
    () => Boolean(walletAddress && isHardwareAccount(walletAddress)),
    [walletAddress],
  );
}
