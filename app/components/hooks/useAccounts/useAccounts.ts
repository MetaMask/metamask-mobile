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
  // const renderCountRef = useRef(0);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [evmAccounts, setEVMAccounts] = useState<Account[]>([]);
  const [ensByAccountAddress, setENSByAccountAddress] =
    useState<EnsByAccountAddress>({});
  const chainId = useSelector(selectChainId);
  const internalAccounts = useSelector(selectInternalAccounts);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  // Track re-renders
  useEffect(() => {
    // renderCountRef.current += 1;
    // // eslint-disable-next-line no-console
    // console.log(`useAccounts re-rendered ${renderCountRef.current} times`, {
    //   timestamp: new Date().toISOString(),
    //   chainId,
    //   accountsCount: internalAccounts.length,
    //   selectedAccount: selectedInternalAccount?.id,
    //   // Add dependency array items to track what's causing re-renders
    //   dependencyChanges: {
    //     chainId,
    //     internalAccountsLength: internalAccounts.length,
    //     selectedAccountId: selectedInternalAccount?.id,
    //     isLoading,
    //   },
    // });
    console.log('useAccounts re-rendered');
  });

  // const { multichainBalancesForAllAccounts } =
  //   useMultichainBalancesForAllAccounts();

  const multichainBalancesForAllAccounts = {
    'ea72d901-e07f-4bab-9960-995746659f29': {
      displayBalance: '$0.32',
      displayCurrency: 'usd',
      totalFiatBalance: 0.32,
      totalNativeTokenBalance: '0.00019',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0.32,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0.28714906013361324,
      },
    },
    'e87c7f90-5120-48b4-8360-2f262a3de4bc': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    'a94e6613-952e-4712-92c2-26e514b0a221': {
      displayBalance: '$0.90',
      displayCurrency: 'usd',
      totalFiatBalance: 0.9,
      totalNativeTokenBalance: '0.00052',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0.9,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0.8076067316257872,
      },
    },
    '34318c5e-b52d-47b7-b5b6-4b6daa59e170': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    '30c7d55b-1cf9-47b5-972d-5179005b675e': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    '9efcb124-8384-4660-8769-53a0e2d75f7f': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    'a0d21f17-3083-4c12-9997-b6100ce7e24e': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    '11215165-b99d-4e1c-9dcd-93ae4002e53f': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    '2ee00d0d-180b-4eb8-8cc2-b4f801596d9e': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    '70ab3243-eab1-4f51-8f30-54f577516ff8': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    '9d52ff11-55ed-4c45-a416-ae7f2edb09cd': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    'eb0b680c-4900-4a7a-a26d-d329c7637ea1': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    'c9e056e0-7432-4d29-9be3-2304e191668f': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    '6399bc95-72ea-463c-998e-6a680afa5b7d': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    '7a6b1be7-1c4f-41fd-b92c-8f20c272bdf6': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    'e0162033-e1b7-44f0-9c7a-8a478992c926': {
      displayBalance: '$0.00',
      displayCurrency: 'usd',
      totalFiatBalance: 0,
      totalNativeTokenBalance: '0',
      nativeTokenUnit: 'ETH',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: true,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
    '3555624d-d4de-4cc9-b721-fe360ac16bf4': {
      displayBalance: '$6.32',
      displayCurrency: 'usd',
      totalFiatBalance: 6.318440446188418,
      totalNativeTokenBalance: '0.012223519',
      nativeTokenUnit: 'SOL',
      tokenFiatBalancesCrossChains: [
        {
          chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
          tokensWithBalances: [],
          tokenFiatBalances: [],
          nativeFiatValue: 0,
        },
      ],
      shouldShowAggregatedPercentage: false,
      isPortfolioVieEnabled: false,
      aggregatedBalance: {
        ethFiat: 0,
        tokenFiat: 0,
        tokenFiat1dAgo: 0,
        ethFiat1dAgo: 0,
      },
    },
  };

  // console.log(
  //   'useAccounts multichainBalancesForAllAccounts ',
  //   JSON.stringify(multichainBalancesForAllAccounts, null, 2),
  // );

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
