// Third party dependencies.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { KeyringTypes } from '@metamask/keyring-controller';

// External Dependencies.
import { doENSReverseLookup } from '../../../util/ENSUtils';
import { selectChainId } from '../../../selectors/networkController';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../../../selectors/accountsController';

// Internal dependencies
import {
  Account,
  EnsByAccountAddress,
  UseAccounts,
  UseAccountsParams,
} from './useAccounts.types';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  getFormattedAddressFromInternalAccount,
  isNonEvmAddress,
} from '../../../core/Multichain/utils';

/**
 * Hook that returns both wallet accounts and ens name information.
 *
 * @returns Object that contains both wallet accounts and ens name information.
 */
const useAccounts = ({
  isLoading = false,
  fetchENS = true,
}: UseAccountsParams = {}): UseAccounts => {
  const isMountedRef = useRef(false);
  const [ensByAccountAddress, setENSByAccountAddress] =
    useState<EnsByAccountAddress>({});
  const currentChainId = useSelector(selectChainId);
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const fetchENSNames = useCallback(
    async ({
      flattenedAccounts,
      startingIndex,
    }: {
      flattenedAccounts: Account[];
      startingIndex: number;
    }) => {
      // Ensure index exists in account list.
      let safeStartingIndex = startingIndex;
      let mirrorIndex = safeStartingIndex - 1;
      const latestENSbyAccountAddress: EnsByAccountAddress = {};
      let hasChanges = false;

      if (startingIndex < 0) {
        safeStartingIndex = 0;
      } else if (startingIndex > flattenedAccounts.length) {
        safeStartingIndex = flattenedAccounts.length - 1;
      }

      const fetchENSName = async (accountIndex: number) => {
        const { address } = flattenedAccounts[accountIndex];
        try {
          const ens: string | undefined = await doENSReverseLookup(
            address,
            currentChainId,
          );
          if (ens) {
            latestENSbyAccountAddress[address] = ens;
            hasChanges = true;
          }
        } catch (e) {
          // ENS either doesn't exist or failed to fetch.
        }
      };

      // Iterate outwards in both directions starting at the starting index.
      while (mirrorIndex >= 0 || safeStartingIndex < flattenedAccounts.length) {
        if (!isMountedRef.current) return;
        if (safeStartingIndex < flattenedAccounts.length) {
          await fetchENSName(safeStartingIndex);
        }
        if (mirrorIndex >= 0) {
          await fetchENSName(mirrorIndex);
        }
        mirrorIndex--;
        safeStartingIndex++;
      }
      // Only update state if we have new ENS names
      if (hasChanges && isMountedRef.current) {
        setENSByAccountAddress((prevState) => ({
          ...prevState,
          ...latestENSbyAccountAddress,
        }));
      }
    },
    [currentChainId],
  );

  const accounts = useMemo((): Account[] => {
    if (isLoading) return [];
    let yOffset = 0;
    return internalAccounts.map((internalAccount: InternalAccount) => {
      const formattedAddress =
        getFormattedAddressFromInternalAccount(internalAccount);
      const isSelected =
        selectedInternalAccount?.address === internalAccount.address;

      const mappedAccount: Account = {
        id: internalAccount.id,
        name: internalAccount.metadata.name,
        address: formattedAddress,
        type: internalAccount.metadata.keyring.type as KeyringTypes,
        yOffset,
        isSelected,
        // This only works for EOAs
        caipAccountId: `${internalAccount.scopes[0]}:${internalAccount.address}`,
        scopes: internalAccount.scopes,
        snapId: internalAccount.metadata.snap?.id,
        isLoadingAccount: false,
      };
      // Calculate height of the account item.
      yOffset += 78;
      if (internalAccount.metadata.keyring.type !== KeyringTypes.hd) {
        yOffset += 24;
      }
      return mappedAccount;
    });
  }, [isLoading, internalAccounts, selectedInternalAccount?.address]);

  const evmAccounts = useMemo(
    () => accounts.filter((account) => !isNonEvmAddress(account.address)),
    [accounts],
  );

  useEffect(() => {
    isMountedRef.current = true;
    if (fetchENS && accounts.length > 0) {
      const selectedIndex = accounts.findIndex((a) => a.isSelected);
      fetchENSNames({
        flattenedAccounts: accounts,
        startingIndex: selectedIndex >= 0 ? selectedIndex : 0,
      });
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [fetchENS, fetchENSNames, accounts]);

  return {
    accounts,
    evmAccounts,
    ensByAccountAddress,
  };
};

export default useAccounts;
