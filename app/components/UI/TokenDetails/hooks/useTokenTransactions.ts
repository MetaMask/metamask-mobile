import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Hex, isHexAddress } from '@metamask/utils';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  TX_CONFIRMED,
  TX_PENDING,
  TX_SIGNED,
  TX_SUBMITTED,
  TX_UNAPPROVED,
} from '../../../../constants/transaction';
import FIRST_PARTY_CONTRACT_NAMES from '../../../../constants/first-party-contracts';
import { selectTokens } from '../../../../selectors/tokensController';
import { sortTransactions } from '../../../../util/activity';
import {
  areAddressesEqual,
  safeToChecksumAddress,
} from '../../../../util/address';
import { addAccountTimeFlagFilter } from '../../../../util/transactions';
import { store } from '../../../../store';
import {
  selectSwapsTransactions,
  selectTransactions,
} from '../../../../selectors/transactionController';
import { TOKEN_CATEGORY_HASH } from '../../../UI/TransactionElement/utils';
import { isMusdClaimForCurrentView } from '../../Earn/utils/musd';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountAddress,
} from '../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { TokenI } from '../../Tokens/types';
import { updateIncomingTransactions } from '../../../../util/transaction-controller';
import { RootState } from '../../../../reducers';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectNonEvmTransactionsForSelectedAccountGroup } from '../../../../selectors/multichain';
import {
  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS,
  SupportedCaipChainId,
} from '@metamask/multichain-network-controller';
///: END:ONLY_INCLUDE_IF

/**
 * Transaction type alias for this hook.
 *
 * This hook processes two incompatible transaction types in unified arrays:
 * - EVM: TransactionMeta from @metamask/transaction-controller
 * - Non-EVM: Transaction from @metamask/keyring-api
 *
 * These types have fundamentally conflicting structures:
 * - `type`: EVM uses TransactionType enum, non-EVM uses string literals
 * - `status`: Different allowed values between types
 * - `from`: EVM has `txParams.from` (string), non-EVM has `from` (array with discriminated union assets)
 *
 * Properly typing would require refactoring with type guards throughout.
 * Using `any` here is intentional to maintain the existing mixed-type handling.
 *
 * @see TransactionMeta from @metamask/transaction-controller for EVM transactions
 * @see Transaction from @metamask/keyring-api for non-EVM transactions
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transaction = any;

export interface UseTokenTransactionsResult {
  transactions: Transaction[];
  submittedTxs: Transaction[];
  confirmedTxs: Transaction[];
  loading: boolean;
  refreshing: boolean;
  transactionsUpdated: boolean;
  selectedAddress: string;
  conversionRate: number;
  currentCurrency: string;
  isNonEvmAsset: boolean;
  onRefresh: () => Promise<void>;
}

// Cache for non-EVM transactions
// eslint-disable-next-line import/no-mutable-exports
let cachedFilteredTransactions: Transaction[] | null = null;
// eslint-disable-next-line import/no-mutable-exports
let cacheKey: string | null = null;

/**
 * Hook that handles transaction fetching, filtering, and normalization for a token.
 * Extracts the transaction logic from Asset/index.js into a reusable hook.
 */
export const useTokenTransactions = (
  asset: TokenI,
): UseTokenTransactionsResult => {
  const chainId = asset.chainId as Hex;
  const navSymbol = (asset.symbol ?? '').toLowerCase();
  const navAddress = (asset.address ?? '').toLowerCase();

  // Determine if this is a non-EVM asset
  const resultChainId = formatChainIdToCaip(chainId);
  const isNonEvmAsset = resultChainId === asset.chainId;

  // State
  const [txState, setTxState] = useState({
    refreshing: false,
    loading: false,
    transactionsUpdated: false,
    submittedTxs: [] as Transaction[],
    confirmedTxs: [] as Transaction[],
    transactions: [] as Transaction[],
  });

  // Refs for mutable values
  const txsRef = useRef<Transaction[]>([]);
  const txsPendingRef = useRef<Transaction[]>([]);
  const isNormalizingRef = useRef(false);
  const chainIdRef = useRef('');
  const mountedRef = useRef(false);

  // Selectors
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const evmTransactions = useSelector(selectTransactions);
  const swapsTransactions = useSelector(selectSwapsTransactions);
  const tokens = useSelector(selectTokens);
  const conversionRate = useSelector(selectConversionRate);
  const currentCurrency = useSelector(selectCurrentCurrency);

  // Get selected address for the asset's chain
  const selectedAddressForAsset = useSelector((reduxState: RootState) => {
    if (asset.chainId) {
      const caipChainId = formatChainIdToCaip(asset.chainId as Hex);
      const accountByScope =
        selectSelectedInternalAccountByScope(reduxState)(caipChainId);
      if (accountByScope?.address) {
        return accountByScope.address;
      }
    }
    return selectSelectedInternalAccountAddress(reduxState);
  });

  const selectedAddress = useMemo(
    () =>
      isHexAddress(selectedAddressForAsset)
        ? safeToChecksumAddress(selectedAddressForAsset)
        : selectedAddressForAsset,
    [selectedAddressForAsset],
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const nonEvmTransactionsData = useSelector(
    selectNonEvmTransactionsForSelectedAccountGroup,
  );
  ///: END:ONLY_INCLUDE_IF

  // Get all transactions (EVM or non-EVM)
  const allTransactions = useMemo(() => {
    let transactions = evmTransactions;

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    if (asset.chainId && isNonEvmChainId(asset.chainId)) {
      const txs =
        nonEvmTransactionsData?.transactions?.filter(
          (tx: Transaction) => tx.chain === asset.chainId,
        ) || [];

      const assetAddress = asset.address?.toLowerCase();
      const assetSymbol = asset.symbol?.toLowerCase();
      const isNativeAsset = asset.isNative || asset.isETH;

      const newCacheKey = JSON.stringify({
        txCount: txs.length,
        assetAddress,
        assetSymbol,
        isNativeAsset,
        lastTxId: txs[0]?.id,
      });

      let filteredTransactions: Transaction[];
      if (cacheKey === newCacheKey && cachedFilteredTransactions) {
        filteredTransactions = cachedFilteredTransactions;
      } else {
        filteredTransactions = txs;

        if (isNativeAsset) {
          filteredTransactions = txs.filter((tx: Transaction) => {
            const txData = (tx.from || []).concat(tx.to || []);

            if (!txData || txData.length === 0) {
              return false;
            }

            const participantsWithAssets = txData.filter(
              (participant: { asset?: { type?: string } }) =>
                participant.asset && typeof participant.asset === 'object',
            );

            if (participantsWithAssets.length === 0) {
              return false;
            }

            const allParticipantsAreNative = participantsWithAssets.every(
              (participant: { asset: { type: string } }) => {
                const assetId = participant.asset.type;
                const chainIdKey = asset.chainId as SupportedCaipChainId;
                return (
                  AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[chainIdKey]
                    ?.nativeCurrency === assetId
                );
              },
            );

            return allParticipantsAreNative;
          });
        } else if (assetAddress || assetSymbol) {
          filteredTransactions = txs.filter((tx: Transaction) => {
            const txData = (tx.from || []).concat(tx.to || []);

            const involvesToken = txData.some(
              (participant: { asset?: { type?: string; unit?: string } }) => {
                if (
                  participant.asset &&
                  typeof participant.asset === 'object'
                ) {
                  const assetType = participant.asset.type || '';
                  const assetUnit = participant.asset.unit || '';

                  if (
                    assetAddress &&
                    assetType.toLowerCase().includes(assetAddress)
                  ) {
                    return true;
                  }

                  if (assetSymbol && assetUnit.toLowerCase() === assetSymbol) {
                    return true;
                  }
                }
                return false;
              },
            );

            return involvesToken;
          });
        }

        // eslint-disable-next-line react-compiler/react-compiler
        cachedFilteredTransactions = filteredTransactions;
        // eslint-disable-next-line react-compiler/react-compiler
        cacheKey = newCacheKey;
      }

      transactions = [...filteredTransactions].sort(
        (a, b) => (b?.time ?? 0) - (a?.time ?? 0),
      );
    }
    ///: END:ONLY_INCLUDE_IF

    return transactions;
  }, [
    evmTransactions,
    asset.chainId,
    asset.address,
    asset.symbol,
    asset.isNative,
    asset.isETH,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    nonEvmTransactionsData,
    ///: END:ONLY_INCLUDE_IF
  ]);

  // Wrapper for shared mUSD claim detection utility
  const checkIsMusdClaimForCurrentView = useCallback(
    (tx: Transaction): boolean =>
      isMusdClaimForCurrentView({
        tx,
        navAddress,
        navSymbol,
        chainId,
      }),
    [chainId, navAddress, navSymbol],
  );

  // ETH filter - for native token transactions
  const ethFilter = useCallback(
    (tx: Transaction) => {
      const { networkId } = store.getState().inpageProvider;
      const {
        txParams: { from, to },
        isTransfer,
        transferInformation,
        type,
      } = tx;

      if (checkIsMusdClaimForCurrentView(tx)) {
        return true;
      }

      if (
        (areAddressesEqual(from ?? '', selectedAddress ?? '') ||
          areAddressesEqual(to ?? '', selectedAddress ?? '')) &&
        (chainId === tx.chainId ||
          (!tx.chainId && networkId === tx.networkID)) &&
        tx.status !== 'unapproved'
      ) {
        if (
          type &&
          TOKEN_CATEGORY_HASH[type as keyof typeof TOKEN_CATEGORY_HASH]
        ) {
          return false;
        }
        if (isTransfer) {
          return tokens.find(({ address }: { address: string }) =>
            areAddressesEqual(address, transferInformation.contractAddress),
          );
        }
        return true;
      }
      return false;
    },
    [chainId, checkIsMusdClaimForCurrentView, selectedAddress, tokens],
  );

  // Non-ETH filter - for token transactions
  const noEthFilter = useCallback(
    (tx: Transaction) => {
      const { networkId } = store.getState().inpageProvider;
      const {
        txParams: { to, from },
        isTransfer,
        transferInformation,
      } = tx;

      if (checkIsMusdClaimForCurrentView(tx)) {
        return true;
      }

      if (
        (areAddressesEqual(from ?? '', selectedAddress ?? '') ||
          areAddressesEqual(to ?? '', selectedAddress ?? '')) &&
        (chainId === tx.chainId ||
          (!tx.chainId && networkId === tx.networkID)) &&
        tx.status !== 'unapproved'
      ) {
        if (to?.toLowerCase() === navAddress) return true;
        if (isTransfer) {
          return (
            navAddress === transferInformation.contractAddress.toLowerCase()
          );
        }
        if (
          swapsTransactions[tx.id] &&
          (to?.toLowerCase() ===
            FIRST_PARTY_CONTRACT_NAMES.Swaps?.[chainId]?.toLowerCase() ||
            to?.toLowerCase() === navAddress)
        ) {
          const { destinationToken, sourceToken } = swapsTransactions[tx.id];
          return (
            destinationToken.address === navAddress ||
            sourceToken.address === navAddress
          );
        }
      }
      return false;
    },
    [
      chainId,
      checkIsMusdClaimForCurrentView,
      navAddress,
      selectedAddress,
      swapsTransactions,
    ],
  );

  // Determine which filter to use
  const filter = useMemo(() => {
    if (navSymbol.toUpperCase() !== 'ETH' && navAddress !== '') {
      return noEthFilter;
    }
    return ethFilter;
  }, [navSymbol, navAddress, ethFilter, noEthFilter]);

  // Check if pending tx statuses changed
  const didTxStatusesChange = useCallback(
    (newTxsPending: Transaction[]) =>
      txsPendingRef.current.length !== newTxsPending.length,
    [],
  );

  // Normalize transactions
  const normalizeTransactions = useCallback(() => {
    if (isNormalizingRef.current) return;

    let accountAddedTimeInsertPointFound = false;
    const addedAccountTime = selectedInternalAccount?.metadata?.importTime;
    isNormalizingRef.current = true;

    let submittedTxs: Transaction[] = [];
    const newPendingTxs: Transaction[] = [];
    const confirmedTxs: Transaction[] = [];
    const submittedNonces: string[] = [];

    if (allTransactions.length) {
      if (isNonEvmAsset) {
        const filteredTransactions = allTransactions.map(
          (tx: Transaction, index: number) => {
            const mutableTx = { ...tx };

            if (
              index === allTransactions.length - 1 &&
              !accountAddedTimeInsertPointFound
            ) {
              mutableTx.insertImportTime = true;
            }

            return mutableTx;
          },
        );

        if (
          (txsRef.current.length === 0 && !txState.transactionsUpdated) ||
          txsRef.current.length !== filteredTransactions.length ||
          chainIdRef.current !== chainId ||
          txState.loading
        ) {
          txsRef.current = filteredTransactions;
          txsPendingRef.current = [];
          setTxState((prev) => ({
            ...prev,
            transactionsUpdated: true,
            loading: false,
            transactions: filteredTransactions,
            submittedTxs: [],
            confirmedTxs: filteredTransactions,
          }));
        }
      } else {
        const mutableTransactions = allTransactions.map((tx: Transaction) => ({
          ...tx,
        }));

        const sortedTransactions = sortTransactions(mutableTransactions).filter(
          (tx: Transaction, index: number, self: Transaction[]) =>
            self.findIndex((_tx: Transaction) => _tx.id === tx.id) === index,
        );

        const filteredTransactions = sortedTransactions.filter(
          (tx: Transaction) => {
            const filterResult = filter(tx);
            if (filterResult) {
              // Cast to unknown then object due to JS function type declaration mismatch
              tx.insertImportTime = addAccountTimeFlagFilter(
                tx as unknown as object,
                (addedAccountTime ?? 0) as unknown as object,
                accountAddedTimeInsertPointFound as unknown as object,
              );
              if (tx.insertImportTime) accountAddedTimeInsertPointFound = true;

              switch (tx.status) {
                case TX_SUBMITTED:
                case TX_SIGNED:
                case TX_UNAPPROVED:
                  submittedTxs.push(tx);
                  return false;
                case TX_PENDING:
                  newPendingTxs.push(tx);
                  break;
                case TX_CONFIRMED:
                  confirmedTxs.push(tx);
                  break;
              }
            }
            return filterResult;
          },
        );

        submittedTxs = submittedTxs.filter(
          ({ txParams: { from, nonce } }: Transaction) => {
            if (!areAddressesEqual(from ?? '', selectedAddress ?? '')) {
              return false;
            }
            const alreadySubmitted = submittedNonces.includes(nonce);
            const alreadyConfirmed = confirmedTxs.find(
              (confirmedTransaction: Transaction) =>
                areAddressesEqual(
                  safeToChecksumAddress(confirmedTransaction.txParams.from) ??
                    '',
                  selectedAddress ?? '',
                ) && confirmedTransaction.txParams.nonce === nonce,
            );
            if (alreadyConfirmed) {
              return false;
            }
            submittedNonces.push(nonce);
            return !alreadySubmitted;
          },
        );

        if (!accountAddedTimeInsertPointFound && filteredTransactions?.length) {
          filteredTransactions[
            filteredTransactions.length - 1
          ].insertImportTime = true;
        }

        if (
          (txsRef.current.length === 0 && !txState.transactionsUpdated) ||
          txsRef.current.length !== filteredTransactions.length ||
          chainIdRef.current !== chainId ||
          didTxStatusesChange(newPendingTxs) ||
          txState.loading
        ) {
          txsRef.current = filteredTransactions;
          txsPendingRef.current = newPendingTxs;
          setTxState((prev) => ({
            ...prev,
            transactionsUpdated: true,
            loading: false,
            transactions: filteredTransactions,
            submittedTxs,
            confirmedTxs,
          }));
        }
      }
    } else if (!txState.transactionsUpdated || txState.loading) {
      setTxState((prev) => ({
        ...prev,
        transactionsUpdated: true,
        loading: false,
      }));
    }

    isNormalizingRef.current = false;
    chainIdRef.current = chainId;
  }, [
    allTransactions,
    chainId,
    filter,
    isNonEvmAsset,
    selectedAddress,
    selectedInternalAccount,
    txState.loading,
    txState.transactionsUpdated,
    didTxStatusesChange,
  ]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setTxState((prev) => ({ ...prev, refreshing: true }));
    await updateIncomingTransactions();
    setTxState((prev) => ({ ...prev, refreshing: false }));
  }, []);

  // Mount effect
  useEffect(() => {
    mountedRef.current = true;
    normalizeTransactions();

    return () => {
      mountedRef.current = false;
    };
  }, [normalizeTransactions]);

  // Update when chain or address changes
  useEffect(() => {
    if (chainIdRef.current !== chainId) {
      setTxState((prev) => ({ ...prev, loading: true }));
    }
    normalizeTransactions();
  }, [chainId, selectedAddressForAsset, normalizeTransactions]);

  return {
    transactions: txState.transactions,
    submittedTxs: txState.submittedTxs,
    confirmedTxs: txState.confirmedTxs,
    loading: txState.loading,
    refreshing: txState.refreshing,
    transactionsUpdated: txState.transactionsUpdated,
    selectedAddress: selectedAddress ?? '',
    conversionRate: conversionRate ?? 0,
    currentCurrency,
    isNonEvmAsset,
    onRefresh,
  };
};

export default useTokenTransactions;
