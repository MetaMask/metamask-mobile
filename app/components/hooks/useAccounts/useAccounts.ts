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
import { useMultichainBalances } from '../useMultichainBalances';

/**
 * Hook that returns both wallet accounts and ens name information.
 *
 * @returns Object that contains both wallet accounts and ens name information.
 */
const useAccounts = ({
  checkBalanceError: checkBalanceErrorFn,
  isLoading = false,
}: UseAccountsParams = {}): UseAccounts => {
  const renderCount = useRef(0);
  const isMountedRef = useRef(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [evmAccounts, setEVMAccounts] = useState<Account[]>([]);
  const [ensByAccountAddress, setENSByAccountAddress] =
    useState<EnsByAccountAddress>({});
  const chainId = useSelector(selectChainId);
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const { multichainBalancesForAllAccounts } = useMultichainBalances();

  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
  );
  const checkBalanceError = useCallback(
    (balance: string) => checkBalanceErrorFn?.(balance),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    renderCount.current += 1;
    // eslint-disable-next-line no-console
    console.log('useAccounts rendered', renderCount.current);
  });
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
            chainId,
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
    [chainId],
  );

  // Memoize the balance calculation to prevent it from causing re-renders
  const accountBalances = useMemo(() => {
    const balances: Record<
      string,
      {
        displayBalance: string;
        balanceError: string | undefined;
      }
    > = {};

    internalAccounts.forEach((account) => {
      // Type assertion to make TypeScript happy with the index access
      const balanceForAccount =
        multichainBalancesForAllAccounts?.[
          account.id as keyof typeof multichainBalancesForAllAccounts
        ];
      const displayBalance = balanceForAccount
        ? `${balanceForAccount.displayBalance}\n${balanceForAccount.totalNativeTokenBalance} ${balanceForAccount.nativeTokenUnit}`
        : '';

      const error =
        balanceForAccount?.totalFiatBalance !== undefined
          ? checkBalanceError?.(balanceForAccount.totalFiatBalance.toString())
          : undefined;

      balances[account.id] = {
        displayBalance,
        balanceError: typeof error === 'string' ? error : undefined,
      };
    });

    return balances;
  }, [internalAccounts, multichainBalancesForAllAccounts, checkBalanceError]);

  // Optimize getAccounts to be more stable
  const getAccounts = useCallback(() => {
    if (!isMountedRef.current) return;

    // Keep track of the Y position of account item. Used for scrolling purposes.
    let yOffset = 0;
    let selectedIndex = 0;
    const selectedAddress = selectedInternalAccount?.address;

    const flattenedAccounts: Account[] = internalAccounts.map(
      (internalAccount: InternalAccount, index: number) => {
        const formattedAddress =
          getFormattedAddressFromInternalAccount(internalAccount);
        const isSelected = selectedAddress === internalAccount.address;
        if (isSelected) {
          selectedIndex = index;
        }

        const accountBalance = accountBalances[internalAccount.id] || {
          displayBalance: '',
          balanceError: undefined,
        };

        const isBalanceAvailable = isMultiAccountBalancesEnabled || isSelected;
        const mappedAccount: Account = {
          name: internalAccount.metadata.name,
          address: formattedAddress,
          type: internalAccount.metadata.keyring.type as KeyringTypes,
          yOffset,
          isSelected,
          assets:
            isBalanceAvailable && accountBalance.displayBalance
              ? {
                  fiatBalance: accountBalance.displayBalance,
                }
              : undefined,
          balanceError: accountBalance.balanceError,
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
    selectedInternalAccount?.address,
    accountBalances,
    isMultiAccountBalancesEnabled,
    fetchENSNames,
    internalAccounts,
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
