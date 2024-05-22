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
  selectChainId,
  selectTicker,
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
import { isMainNet } from '../../../util/networks';

/**
 * Hook that returns both wallet accounts and ens name information.
 *
 * @returns Object that contains both wallet accounts and ens name information.
 */
const useAccounts = ({
  checkBalanceError,
}: UseAccountsParams = {}): UseAccounts => {
  const Engine = UntypedEngine as any;
  const isMountedRef = useRef(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ensByAccountAddress, setENSByAccountAddress] =
    useState<EnsByAccountAddress>({});

  const identities = useSelector(selectIdentities);
  const chainId = useSelector(selectChainId);
  const accountInfoByAddress = useSelector(selectAccounts, isEqual);
  const selectedAddress = useSelector(selectSelectedAddress);
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const ticker = useSelector(selectTicker);

  const isMultiAccountBalancesEnabled = useSelector(
    selectIsMultiAccountBalancesEnabled,
  );

  const fetchENSName = useCallback(
    async (address: string) => {
      // Ensure index exists in account list.

      let latestENSbyAccountAddress: EnsByAccountAddress = {};

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
    },
    [chainId],
  );

  const getAccounts = useCallback(() => {
    if (!isMountedRef.current) return;
    // Keep track of the Y position of account item. Used for scrolling purposes.
    let yOffset = 0;
    // Reading keyrings directly from Redux doesn't work at the momemt.
    const keyrings: any[] = Engine.context.KeyringController.state.keyrings;
    const flattenedAccounts: Account[] = keyrings.reduce((result, keyring) => {
      const {
        accounts: accountAddresses,
        type,
      }: { accounts: string[]; type: KeyringTypes } = keyring;
      for (const index in accountAddresses) {
        const checksummedAddress = toChecksumAddress(accountAddresses[index]);
        const isSelected = selectedAddress === checksummedAddress;
        const identity = identities[checksummedAddress];
        if (!identity) continue;
        const { name } = identity;
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
          type,
          yOffset,
          isSelected,
          // TODO - Also fetch assets. Reference AccountList component.
          // assets
          assets: isBalanceAvailable
            ? { fiatBalance: balanceLabel }
            : undefined,
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

    /* eslint-disable-next-line */
  }, [
    selectedAddress,
    identities,
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
    getAccounts();
    return () => {
      isMountedRef.current = false;
    };
  }, [getAccounts]);

  useEffect(() => {
    // We need this check because when switching accounts the accounts state it's empty, reason still to be investigated

    if (isMainNet(chainId)) {
      fetchENSName(selectedAddress);
    }
  }, [chainId, fetchENSName, selectedAddress]);

  return {
    accounts,
    ensByAccountAddress,
  };
};

export default useAccounts;
