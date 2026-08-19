import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { isHardwareAccount } from '../../../../../util/address';

/**
 * Returns whether the current bridge source account is a hardware wallet.
 * Used to omit gas-included / 7702 params from bridge quote requests so responses
 * are non-sponsored for hardware signers.
 */
export function useIsHardwareWalletForBridge(): boolean {
  const walletAddress = useSelector(selectSourceWalletAddress);

  return useMemo(
    () => Boolean(walletAddress && isHardwareAccount(walletAddress)),
    [walletAddress],
  );
}
