import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectDestAddress,
  setDestAddress,
  selectIsEvmToSolana,
  selectIsSolanaToEvm,
} from '../../../../core/redux/slices/bridge';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { isNonEvmAddress } from '../../../../core/Multichain/utils';
import { useDestinationAccounts } from './useDestinationAccounts';

export const useRecipientInitialization = (
  hasInitializedRecipient: React.MutableRefObject<boolean>,
) => {
  const dispatch = useDispatch();
  const { destinationAccounts } = useDestinationAccounts();
  const currentlySelectedAccount = useSelector(selectSelectedAccountGroup);

  const destAddress = useSelector(selectDestAddress);
  const isEvmToSolana = useSelector(selectIsEvmToSolana);
  const isSolanaToEvm = useSelector(selectIsSolanaToEvm);

  const handleSelectAccount = useCallback(
    (caipAccountId: CaipAccountId | undefined) => {
      const address = caipAccountId
        ? parseCaipAccountId(caipAccountId).address
        : undefined;
      dispatch(setDestAddress(address));
    },
    [dispatch],
  );

  // Initialize default recipient account
  useEffect(() => {
    // Only initialize if we haven't done so before, or if the current address doesn't match the network type
    if (destinationAccounts.length === 0) {
      return;
    }

    // Check if current destAddress matches the network type
    const doesDestAddrMatchNetworkType =
      destAddress &&
      ((isSolanaToEvm && !isNonEvmAddress(destAddress)) || // Solana→EVM: dest address should be EVM
        (isEvmToSolana && isNonEvmAddress(destAddress))); // EVM→Solana: dest address should be Solana

    // Only initialize in these specific cases:
    // 1. Never initialized AND no destAddress set
    // 2. destAddress doesn't match the current network type (user switched networks)
    const shouldInitialize =
      (!hasInitializedRecipient.current && !destAddress) ||
      !doesDestAddrMatchNetworkType;

    if (shouldInitialize) {
      // Find an account from the currently selected account group that supports the destination network
      let defaultAccount = destinationAccounts[0]; // fallback to first account
      if (currentlySelectedAccount && destinationAccounts.length > 0) {
        const accountFromCurrentGroup = destinationAccounts.find((account) =>
          currentlySelectedAccount.accounts.includes(account.id),
        );

        if (accountFromCurrentGroup) {
          defaultAccount = accountFromCurrentGroup;
        }
      }

      handleSelectAccount(defaultAccount.caipAccountId);
      hasInitializedRecipient.current = true;
    }
  }, [
    destAddress,
    isEvmToSolana,
    isSolanaToEvm,
    destinationAccounts,
    handleSelectAccount,
    currentlySelectedAccount,
    hasInitializedRecipient,
  ]);
};
