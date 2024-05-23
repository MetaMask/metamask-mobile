// Third party dependencies.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import { KeyringTypes } from '@metamask/keyring-controller';
import { isEqual } from 'lodash';

// External Dependencies.
import { doENSReverseLookup } from '../../../util/ENSUtils';
import { hexToBN, renderFromWei, weiToFiat } from '../../../util/number';
import { getTicker } from '../../../util/transactions';

// Internal dependencies
import {
  Account,
  EnsByAccountAddress,
  UseAccounts,
  UseAccountsParams,
} from './useAccounts.types';
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
import { isMainNet } from '../../../util/networks';

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
  const accountInfoByAddress = useSelector(selectAccounts, isEqual);
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const ticker = useSelector(selectTicker);
  const internalAccounts = useSelector(selectInternalAccounts);
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

  const fetchENSName = useCallback(async () => {
    // Ensure index exists in account list.
    let latestENSbyAccountAddress: EnsByAccountAddress = {};
    const address = toChecksumAddress(selectedInternalAccount.address);
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

    setENSByAccountAddress(latestENSbyAccountAddress);
  }, [chainId, selectedInternalAccount.address]);

  const getAccounts = useCallback(() => {
    if (!isMountedRef.current) return;
    // Keep track of the Y position of account item. Used for scrolling purposes.
    let yOffset = 0;

    const flattenedAccounts: Account[] = internalAccounts.map(
      (internalAccount) => {
        const {
          address,
          metadata: {
            name,
            keyring: { type },
          },
        } = internalAccount;
        const checksummedAddress = toChecksumAddress(address);
        const isSelected = selectedInternalAccount.address === address;

        // TODO - Improve UI to either include loading and/or balance load failures.
        const balanceWeiHex =
          accountInfoByAddress?.[checksummedAddress]?.balance || '0x0';
        const balanceETH = renderFromWei(balanceWeiHex); // Gives ETH
        const balanceFiat =
          weiToFiat(
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
  }, [
    selectedInternalAccount,
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
    // setTimeout is needed for now to ensure next frame contains updated keyrings.
    getAccounts();
    // Once we can pull keyrings from Redux, we will replace the deps with keyrings.
    return () => {
      isMountedRef.current = false;
    };
  }, [getAccounts, isLoading]);

  useEffect(() => {
    // We need this check because when switching accounts the accounts state it's empty, reason still to be investigated

    if (isMainNet(chainId)) {
      fetchENSName();
    }
  }, [chainId, fetchENSName]);

  return {
    accounts,
    ensByAccountAddress,
  };
};

export default useAccounts;
