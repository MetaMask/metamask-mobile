// Third party dependencies.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import { KeyringTypes } from '@metamask/keyring-controller';
import { isEqual } from 'lodash';

// External Dependencies.
import UntypedEngine from '../../../core/Engine';
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
  selectTicker,
  selectNetwork,
} from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import {
  selectIdentities,
  selectIsMultiAccountBalancesEnabled,
  selectSelectedAddress,
} from '../../../selectors/preferencesController';

/**
 * Hook that returns both wallet accounts and ens name information.
 *
 * @returns Object that contins both wallet accounts and ens name information.
 */
const useAccounts = ({
  checkBalanceError,
  isLoading = false,
}: UseAccountsParams = {}): UseAccounts => {
  const Engine = UntypedEngine as any;
  const isMountedRef = useRef(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ensByAccountAddress, setENSByAccountAddress] =
    useState<EnsByAccountAddress>({});

  const identities = useSelector(selectIdentities);
  const network = useSelector(selectNetwork);
  const accountInfoByAddress = useSelector(selectAccounts, isEqual);
  const selectedAddress = useSelector(selectSelectedAddress);
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const ticker = useSelector(selectTicker);

  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
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
            network,
          );
          if (ens) {
            latestENSbyAccountAddress = {
              ...latestENSbyAccountAddress,
              [address]: ens,
            };
          }
        } catch (e) {
          // ENS either doesn't exists or failed to fetch.
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
    [network],
  );

  const getAccounts = useCallback(() => {
    if (!isMountedRef.current) return;
    // Keep track of the Y position of account item. Used for scrolling purposes.
    let yOffset = 0;
    let selectedIndex = 0;
    // Reading keyrings directly from Redux doesn't work at the momemt.
    const keyrings: any[] = Engine.context.KeyringController.state.keyrings;
    const flattenedAccounts: Account[] = keyrings.reduce((result, keyring) => {
      const {
        accounts: accountAddresses,
        type,
      }: { accounts: string[]; type: KeyringTypes } = keyring;
      for (const index in accountAddresses) {
        const address = accountAddresses[index];
        const isSelected = selectedAddress === address;
        if (isSelected) {
          selectedIndex = result.length;
        }
        const checksummedAddress = toChecksumAddress(address);
        const identity = identities[checksummedAddress];
        if (!identity) continue;
        const { name } = identity;
        // TODO - Improve UI to either include loading and/or balance load failures.
        const balanceWeiHex =
          accountInfoByAddress?.[checksummedAddress]?.balance || 0x0;
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
          type,
          yOffset,
          isSelected,
          // TODO - Also fetch assets. Reference AccountList component.
          // assets
          assets: isBalanceAvailable && { fiatBalance: balanceLabel },
          balanceError,
        };
        result.push(mappedAccount);
        // Calculate height of the account item.
        yOffset += 78;
        if (balanceError) {
          yOffset += 22;
        }
        if (type !== KeyringTypes.hd) {
          yOffset += 24;
        }
      }
      return result;
    }, []);

    setAccounts(flattenedAccounts);
    fetchENSNames({ flattenedAccounts, startingIndex: selectedIndex });
    /* eslint-disable-next-line */
  }, [
    selectedAddress,
    identities,
    fetchENSNames,
    accountInfoByAddress,
    conversionRate,
    currentCurrency,
    ticker,
    checkBalanceError,
    isMultiAccountBalancesEnabled,
  ]);

  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
    }
    if (isLoading) return;
    // setTimeout is needed for now to ensure next frame contains updated keyrings.
    setTimeout(getAccounts, 0);
    // Once we can pull keyrings from Redux, we will replace the deps with keyrings.
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
