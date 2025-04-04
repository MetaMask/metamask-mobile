// Third party dependencies.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { KeyringTypes } from '@metamask/keyring-controller';

// External Dependencies.
import { doENSReverseLookup } from '../../../util/ENSUtils';
import { getTicker } from '../../../util/transactions';
import {
  selectChainId,
  selectEvmTicker,
} from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import {
  selectIsMultiAccountBalancesEnabled,
  selectIsTokenNetworkFilterEqualCurrentNetwork,
} from '../../../selectors/preferencesController';
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
import { getChainIdsToPoll } from '../../../selectors/tokensController';
import { useGetFormattedTokensPerChain } from '../useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import {
  getFormattedAddressFromInternalAccount,
  isNonEvmAddress,
} from '../../../core/Multichain/utils';
import { getAccountBalances } from './utils';
import { isEvmAccountType } from '@metamask/keyring-api';

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
  const chainId = useSelector(selectChainId);
  const accountInfoByAddress = useSelector(selectAccounts);
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const ticker = useSelector(selectEvmTicker);
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
  );
  // Agg balance Start
  const allChainIDs = useSelector(getChainIdsToPoll);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );
  const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    internalAccounts,
    !isTokenNetworkFilterEqualCurrentNetwork,
    allChainIDs,
  );
  const totalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    internalAccounts,
    formattedTokensWithBalancesPerChain,
  );

  // Agg balance End

  // Memoize checkBalanceErrorFn so it doesn't cause an infinite loop
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
      let latestENSbyAccountAddress: EnsByAccountAddress = {};

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
            latestENSbyAccountAddress = {
              ...latestENSbyAccountAddress,
              [address]: ens,
            };
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
        setENSByAccountAddress(latestENSbyAccountAddress);
      }
    },
    [chainId],
  );

  const getAccounts = useCallback(
    () => {
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

          // TODO - Improve UI to either include loading and/or balance load failures.
          // TODO - Non EVM accounts like BTC do not use hex formatted balances. We will need to modify this to support multiple chains in the future.
          const { balanceETH, balanceFiat, balanceWeiHex } = getAccountBalances(
            {
              internalAccount,
              accountInfoByAddress,
              totalFiatBalancesCrossChain,
              conversionRate,
              currentCurrency,
            },
          );

          const balanceTicker = getTicker(ticker);
          const balanceLabel = `${balanceFiat}\n${balanceETH} ${balanceTicker}`;
          const balanceError = checkBalanceError?.(balanceWeiHex);
          const isEvmAccount = isEvmAccountType(internalAccount.type);
          const isBalanceAvailable =
            isMultiAccountBalancesEnabled || isSelected;
          const mappedAccount: Account = {
            name: internalAccount.metadata.name,
            address: formattedAddress,
            type: internalAccount.metadata.keyring.type as KeyringTypes,
            yOffset,
            isSelected,
            // TODO - Also fetch assets. Reference AccountList component.
            // assets
            assets:
              // TODO = Render non evm assets. This is a temporary fix.
              isBalanceAvailable && isEvmAccount
                ? { fiatBalance: balanceLabel }
                : undefined,
            balanceError,
          };
          // Calculate height of the account item.
          yOffset += 78;
          if (balanceError) {
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
        flattenedAccounts.filter(
          (account) => !isNonEvmAddress(account.address),
        ),
      );
      fetchENSNames({ flattenedAccounts, startingIndex: selectedIndex });
    }, // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedInternalAccount,
      fetchENSNames,
      accountInfoByAddress,
      conversionRate,
      currentCurrency,
      ticker,
      isMultiAccountBalancesEnabled,
      internalAccounts,
      checkBalanceError,
    ],
  );

  useEffect(() => {
    // eslint-disable-next-line
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
