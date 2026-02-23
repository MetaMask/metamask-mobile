import { useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectDestAddress,
  setDestAddress,
  selectDestToken,
} from '../../../../core/redux/slices/bridge';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { CaipAccountId, parseCaipAccountId } from '@metamask/utils';
import { isAddress as isSolanaAddress } from '@solana/addresses';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { useDestinationAccounts } from './useDestinationAccounts';
import { areAddressesEqual, isEthAddress } from '../../../../util/address';

export const useRecipientInitialization = (
  hasInitializedRecipient: React.MutableRefObject<boolean>,
) => {
  const dispatch = useDispatch();
  const { destinationAccounts } = useDestinationAccounts();
  const currentlySelectedAccount = useSelector(selectSelectedAccountGroup);
  const internalAccounts = useSelector(selectInternalAccounts);

  const destAddress = useSelector(selectDestAddress);
  const destToken = useSelector(selectDestToken);

  const isExternalAddressCompatibleWithDestChain = useCallback(
    (address: string, chainId: string) => {
      if (isSolanaChainId(chainId)) {
        return isSolanaAddress(address);
      }

      const isEvmChainId =
        chainId.startsWith('0x') || chainId.startsWith('eip155:');
      return isEvmChainId ? isEthAddress(address) : true;
    },
    [],
  );

  const handleSelectAccount = useCallback(
    (caipAccountId: CaipAccountId | undefined) => {
      const address = caipAccountId
        ? parseCaipAccountId(caipAccountId).address
        : undefined;
      dispatch(setDestAddress(address));
    },
    [dispatch],
  );

  // Check if current destAddress is a valid destination account for the current destination chain
  // This properly handles switching between different non-EVM chains (e.g., BTC → SOL)
  // by checking if the address exists in the filtered destination accounts list
  const isDestAddressValidForDestChain = useMemo(() => {
    if (!destAddress || !destToken?.chainId) {
      return false;
    }

    const isInternalDestAddress = internalAccounts.some((internalAccount) =>
      areAddressesEqual(internalAccount.address, destAddress),
    );

    // Preserve external recipients only if they are compatible with dest chain.
    if (!isInternalDestAddress) {
      return isExternalAddressCompatibleWithDestChain(
        destAddress,
        destToken.chainId,
      );
    }

    if (destinationAccounts.length === 0) {
      return false;
    }

    // Check if the current destAddress matches any of the valid destination accounts
    // destinationAccounts is already filtered by selectValidDestInternalAccountIds
    // which uses account scopes to filter for the specific destination chain
    return destinationAccounts.some((account) =>
      areAddressesEqual(account.address, destAddress),
    );
  }, [
    destAddress,
    destToken?.chainId,
    destinationAccounts,
    internalAccounts,
    isExternalAddressCompatibleWithDestChain,
  ]);

  // Initialize default recipient account
  useEffect(() => {
    // Only initialize if we haven't done so before, or if the current address doesn't match the network type
    if (destinationAccounts.length === 0) {
      return;
    }

    // Initialize/reinitialize in these cases:
    // 1. No destAddress is set (missing or cleared)
    // 2. destAddress is not valid for the current destination chain (user switched networks)
    //    This handles switching between different non-EVM chains (e.g., BTC → SOL)
    // Note: isDestAddressValidForDestChain returns false when destAddress is falsy,
    const shouldInitialize = !isDestAddressValidForDestChain;

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
    destinationAccounts,
    handleSelectAccount,
    currentlySelectedAccount,
    hasInitializedRecipient,
    isDestAddressValidForDestChain,
  ]);
};
