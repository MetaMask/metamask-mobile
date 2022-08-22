/* eslint-disable import/prefer-default-export */

// Third party dependencies.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { toChecksumAddress } from 'ethereumjs-util';
import { KeyringTypes } from '@metamask/controllers';

// External Dependencies.
import UntypedEngine from '../../../../../core/Engine';
import { Account } from '../..';
import { doENSReverseLookup } from '../../../../../util/ENSUtils';
import { hexToBN, renderFromWei, weiToFiat } from '../../../../../util/number';
import { getTicker } from '../../../../..//util/transactions';

// Internal dependencies
import {
  EnsByAccountAddress,
  UseAccounts,
  UseAccountsParams,
} from './useAccounts.types';

/**
 * Hook that returns both wallet accounts and ens name information.
 *
 * @returns Object that contins both wallet accounts and ens name information.
 */
export const useAccounts = ({
  checkBalanceError,
}: UseAccountsParams = {}): UseAccounts => {
  const Engine = UntypedEngine as any;
  const isMountedRef = useRef(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [ensByAccountAddress, setENSByAccountAddress] =
    useState<EnsByAccountAddress>({});
  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );
  const network = useSelector(
    (state: any) => state.engine.backgroundState.NetworkController.network,
  );
  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const accountInfoByAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.AccountTrackerController.accounts,
  );
  const conversionRate = useSelector(
    (state: any) =>
      state.engine.backgroundState.CurrencyRateController.conversionRate,
  );
  const currentCurrency = useSelector(
    (state: any) =>
      state.engine.backgroundState.CurrencyRateController.currentCurrency,
  );
  const ticker = useSelector(
    (state: any) =>
      state.engine.backgroundState.NetworkController.provider.ticker,
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchENSNames = useCallback(
    async ({
      latestAccounts,
      startingIndex,
    }: {
      latestAccounts: Account[];
      startingIndex: number;
    }) => {
      // Ensure index exists in account list.
      let safeStartingIndex = startingIndex;
      if (startingIndex < 0) {
        safeStartingIndex = 0;
      } else if (startingIndex > latestAccounts.length) {
        safeStartingIndex = latestAccounts.length - 1;
      }
      let mirrorIndex = safeStartingIndex - 1;
      let latestENSbyAccountAddress: EnsByAccountAddress = {};

      const fetchENSName = async (accountIndex: number) => {
        const { address } = latestAccounts[accountIndex];
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

      while (mirrorIndex >= 0 || safeStartingIndex < latestAccounts.length) {
        if (!isMountedRef.current) return;
        if (safeStartingIndex < latestAccounts.length) {
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
    // Keep track of the Y position of account item. Used for scrolling purposes.
    let yOffset = 0;
    let selectedIndex = 0;
    // Reading keyrings directly from Redux doesn't work at the momemt.
    const keyrings: any[] = Engine.context.KeyringController.state.keyrings;
    const latestAccounts: Account[] = keyrings.reduce((result, keyring) => {
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
        const balanceFiat = weiToFiat(
          hexToBN(balanceWeiHex) as any,
          conversionRate,
          currentCurrency,
        );
        const balanceTicker = getTicker(ticker);
        const balanceLabel = `${balanceETH} ${balanceTicker}\n${balanceFiat}`;
        const balanceError = checkBalanceError?.(balanceWeiHex);
        const mappedAccount: Account = {
          name,
          address: checksummedAddress,
          type,
          yOffset,
          isSelected,
          // TODO - Also fetch assets. Reference AccountList component.
          // assets
          assets: { fiatBalance: balanceLabel },
          balanceError,
        };
        result.push(mappedAccount);
        switch (type) {
          case KeyringTypes.qr:
          case KeyringTypes.simple:
            yOffset += 102;
            break;
          default:
            yOffset += 78;
        }
      }
      return result;
    }, []);
    setAccounts(latestAccounts);
    fetchENSNames({ latestAccounts, startingIndex: selectedIndex });
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
  ]);

  useEffect(() => {
    // setTimeout is needed for now to ensure next frame contains updated keyrings.
    setTimeout(getAccounts, 0);
    // Once we can pull keyrings from Redux, we will replace the deps with keyrings.
  }, [identities, getAccounts]);

  return { accounts, ensByAccountAddress };
};
