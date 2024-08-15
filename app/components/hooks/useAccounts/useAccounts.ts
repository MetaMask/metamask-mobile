// Third party dependencies.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { KeyringTypes } from '@metamask/keyring-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';

// External Dependencies.
import { doENSReverseLookup } from '../../../util/ENSUtils';
import { hexToBN, renderFromWei, weiToFiat } from '../../../util/number';
import { getTicker } from '../../../util/transactions';
import {
  selectChainId,
  selectTicker,
} from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
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
import { InternalAccountTypes } from '@metamask/keyring-api';

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
  const [ensByAccountAddress, setENSByAccountAddress] =
    useState<EnsByAccountAddress>({});
  const chainId = useSelector(selectChainId);
  const accountInfoByAddress = useSelector(selectAccounts);
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const ticker = useSelector(selectTicker);
  const internalAccounts: InternalAccountTypes[] = useSelector(
    selectInternalAccounts,
  );
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
  );

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

  const getAccounts = useCallback(() => {
    if (!isMountedRef.current) return;
    // Keep track of the Y position of account item. Used for scrolling purposes.
    let yOffset = 0;
    let selectedIndex = 0;
    const flattenedAccounts: Account[] = internalAccounts.map(
      (internalAccount: InternalAccountTypes, index: number) => {
        const {
          address,
          metadata: {
            name,
            keyring: { type },
          },
        } = internalAccount;
        const checksummedAddress = toChecksumHexAddress(address);
        const isSelected = selectedInternalAccount?.address === address;
        if (isSelected) {
          selectedIndex = index;
        }
        // TODO - Improve UI to either include loading and/or balance load failures.
        const balanceWeiHex =
          accountInfoByAddress?.[checksummedAddress]?.balance || '0x0';
        const balanceETH = renderFromWei(balanceWeiHex); // Gives ETH
        const balanceFiat =
          weiToFiat(
            // TODO: Replace "any" with type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            hexToBN(balanceWeiHex) as any,
            conversionRate,
            currentCurrency,
          ) || '';
        const balanceTicker = getTicker(ticker);
        const balanceLabel = `${balanceFiat}\n${balanceETH} ${balanceTicker}`;
        const balanceError = checkBalanceError?.(balanceWeiHex);
        const isBalanceAvailable = isMultiAccountBalancesEnabled || isSelected;
        const mappedAccount: Account = {
          name,
          address: checksummedAddress,
          type: type as KeyringTypes,
          yOffset,
          isSelected,
          // TODO - Also fetch assets. Reference AccountList component.
          // assets
          assets: isBalanceAvailable
            ? { fiatBalance: balanceLabel }
            : undefined,
          balanceError,
          metadata: {
            name,
            keyring: {
              type: type as KeyringTypes,
            },
          },
        };
        // Calculate height of the account item.
        yOffset += 78;
        if (balanceError) {
          yOffset += 22;
        }
        if (type !== KeyringTypes.hd) {
          yOffset += 24;
        }
        return mappedAccount;
      },
    );

    setAccounts(flattenedAccounts);
    fetchENSNames({ flattenedAccounts, startingIndex: selectedIndex });
  }, [
    selectedInternalAccount,
    fetchENSNames,
    accountInfoByAddress,
    conversionRate,
    currentCurrency,
    ticker,
    isMultiAccountBalancesEnabled,
    internalAccounts,
    checkBalanceError,
  ]);

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
    ensByAccountAddress,
  };
};

export default useAccounts;
