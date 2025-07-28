// Third party dependencies.
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { KeyringTypes } from '@metamask/keyring-controller';

// External Dependencies.
import { doENSReverseLookup } from '../../../util/ENSUtils';
import { selectChainId } from '../../../selectors/networkController';
import { selectIsMultiAccountBalancesEnabled } from '../../../selectors/preferencesController';
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
import { useMultichainBalancesForAllAccounts } from '../useMultichainBalances';

/**
 * Hook that returns both wallet accounts and ens name information.
 *
 * @returns Object that contains both wallet accounts and ens name information.
 */
const useAccounts = ({
  checkBalanceError: checkBalanceErrorFn,
  isLoading = false,
}: UseAccountsParams = {}): UseAccounts => {
  const isMountedRef = useRef(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [evmAccounts, setEVMAccounts] = useState<Account[]>([]);
  const [ensByAccountAddress, setENSByAccountAddress] =
    useState<EnsByAccountAddress>({});
  const currentChainId = useSelector(selectChainId);
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const { multichainBalancesForAllAccounts } =
    useMultichainBalancesForAllAccounts();

  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
  );
  const checkBalanceError = useCallback(
    (balance: string) => checkBalanceErrorFn?.(balance),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
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

  // Memoize the balance calculation to prevent it from causing re-renders
  const accountBalances = useMemo(() => {
    const balances: Record<
      string,
      {
        displayBalance: string;
        balanceError: string | undefined;
        isLoadingAccount: boolean;
      }
    > = {};

    internalAccounts.forEach((account) => {
      const balanceForAccount = multichainBalancesForAllAccounts?.[account.id];
      const displayBalance = balanceForAccount
        ? `${balanceForAccount.displayBalance}\n${balanceForAccount.totalNativeTokenBalance} ${balanceForAccount.nativeTokenUnit}`
        : '';

      const error =
        balanceForAccount.totalFiatBalance !== undefined
          ? checkBalanceError?.(balanceForAccount.totalFiatBalance.toString())
          : undefined;

      balances[account.id] = {
        displayBalance,
        balanceError: typeof error === 'string' ? error : undefined,
        isLoadingAccount: balanceForAccount.isLoadingAccount,
      };
    });

    return balances;
  }, [internalAccounts, multichainBalancesForAllAccounts, checkBalanceError]);

  const getAccounts = useCallback(() => {
    if (!isMountedRef.current) return;
    // Keep track of the Y position of account item. Used for scrolling purposes.
    let yOffset = 0;
    let selectedIndex = 0;
    const flattenedAccounts: Account[] = internalAccounts.map(
      (internalAccount: InternalAccount, index: number) => {
        const formattedAddress =
          getFormattedAddressFromInternalAccount(internalAccount);
        const isSelected =
          selectedInternalAccount?.address === internalAccount.address;
        if (isSelected) {
          selectedIndex = index;
        }

        const accountBalance = accountBalances[internalAccount.id] || {
          displayBalance: '',
          balanceError: undefined,
        };

        const isBalanceAvailable = isMultiAccountBalancesEnabled || isSelected;
        const mappedAccount: Account = {
          id: internalAccount.id,
          name: internalAccount.metadata.name,
          address: formattedAddress,
          type: internalAccount.metadata.keyring.type as KeyringTypes,
          yOffset,
          isSelected,
          // TODO - Also fetch assets. Reference AccountList component.
          // assets
          assets:
            isBalanceAvailable && accountBalance.displayBalance
              ? {
                  fiatBalance: accountBalance.displayBalance,
                }
              : undefined,
          balanceError: accountBalance.balanceError,
          // This only works for EOAs
          caipAccountId: `${internalAccount.scopes[0]}:${internalAccount.address}`,
          scopes: internalAccount.scopes,
          snapId: internalAccount.metadata.snap?.id,
          isLoadingAccount: accountBalance.isLoadingAccount,
        };
        // Calculate height of the account item.
        yOffset += 78;
        if (accountBalance.balanceError) {
          yOffset += 22;
        }
        if (internalAccount.metadata.keyring.type !== KeyringTypes.hd) {
          yOffset += 24;
        }
        return mappedAccount;
      },
    );

    setAccounts(flattenedAccounts);
    setEVMAccounts(
      flattenedAccounts.filter((account) => !isNonEvmAddress(account.address)),
    );
    fetchENSNames({ flattenedAccounts, startingIndex: selectedIndex });
  }, [
    internalAccounts,
    fetchENSNames,
    selectedInternalAccount?.address,
    accountBalances, // Use the memoized balances instead of multichainBalancesForAllAccounts
    isMultiAccountBalancesEnabled,
  ]);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
    }
    if (isLoading) return;
    getAccounts();
    return () => {
      isMountedRef.current = false;
    };
  }, [getAccounts, isLoading]);

  return {
    accounts,
    evmAccounts,
    ensByAccountAddress,
  };
};

export default useAccounts;
