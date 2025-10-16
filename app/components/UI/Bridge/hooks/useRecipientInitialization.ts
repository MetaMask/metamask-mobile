import { useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectDestAddress,
  setDestAddress,
  selectDestToken,
} from '../../../../core/redux/slices/bridge';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import {
  isNonEvmAddress,
  isNonEvmChainId,
} from '../../../../core/Multichain/utils';
import { useDestinationAccounts } from './useDestinationAccounts';

export const useRecipientInitialization = (
  hasInitializedRecipient: React.MutableRefObject<boolean>,
) => {
  const dispatch = useDispatch();
  const { destinationAccounts } = useDestinationAccounts();
  const currentlySelectedAccount = useSelector(selectSelectedAccountGroup);

  const destAddress = useSelector(selectDestAddress);
  const destToken = useSelector(selectDestToken);

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

    // Check if current destAddress matches the destination chain type
    const isDestChainNonEvm =
      destToken?.chainId && isNonEvmChainId(destToken.chainId);
    const isDestAddressNonEvm = destAddress && isNonEvmAddress(destAddress);

    // Address format should match the destination chain type:
    // - If dest chain is non-EVM (e.g., Solana, Bitcoin), dest address should be non-EVM
    // - If dest chain is EVM, dest address should be EVM
    const doesDestAddrMatchNetworkType =
      destAddress &&
      destToken?.chainId &&
      isDestChainNonEvm === isDestAddressNonEvm;

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
    destToken,
    destinationAccounts,
    handleSelectAccount,
    currentlySelectedAccount,
    hasInitializedRecipient,
  ]);
};
