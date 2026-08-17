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
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../constants/bridge';
import { selectTokens } from '../../../../selectors/tokensController';
import { sortTransactions } from '../../../../util/activity';
import {
  areAddressesEqual,
  safeToChecksumAddress,
} from '../../../../util/address';
import { addAccountTimeFlagFilter } from '../../../../util/transactions';
import { store } from '../../../../store';
import { selectTransactions } from '../../../../selectors/transactionController';
import { selectBridgeHistoryForAccount } from '../../../../selectors/bridgeStatusController';
import { findBridgeHistoryItem } from '../../../../util/bridge/findBridgeHistoryItem';
import { getMaybeHexChainId } from '../../../../util/bridge';
import { selectIsActivityRedesignEnabled } from '../../../../selectors/featureFlagController/activityRedesign';
import { TransactionType } from '@metamask/transaction-controller';
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
  bridgeArrivalTxs: Transaction[];
  onRefresh: () => Promise<void>;
}

/** Types that move two different assets, so they belong on both token pages. */
const SWAP_LIKE_TRANSACTION_TYPES: string[] = [
  TransactionType.swap,
  TransactionType.swapAndSend,
  TransactionType.bridge,
];

/**
 * Both legs of a swap/bridge, by address and by symbol.
 *
 * Unified swaps keep token metadata in the bridge quote; older SwapsController
 * txs recorded symbols only. Prefer `addresses` — `symbols` can match an
 * impostor token.
 */
export const getSwapLegTokenIdentifiers = (
  tx: Transaction,
  bridgeHistoryItem?: { quote?: Record<string, Transaction> },
): { addresses: string[]; symbols: string[] } => {
  const quote = bridgeHistoryItem?.quote;

  const normalize = (values: (string | undefined)[]) => [
    ...new Set(
      values
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase()),
    ),
  ];

  return {
    addresses: normalize([
      quote?.srcAsset?.address,
      quote?.destAsset?.address,
      tx.sourceTokenAddress,
      tx.destinationTokenAddress,
    ]),
    symbols: normalize([
      quote?.srcAsset?.symbol,
      quote?.destAsset?.symbol,
      tx.sourceTokenSymbol,
      tx.destinationTokenSymbol,
      tx.swapMetaData?.token_from,
      tx.swapMetaData?.token_to,
    ]),
  };
};

// Cache for non-EVM transactions
// eslint-disable-next-line import-x/no-mutable-exports
let cachedFilteredTransactions: Transaction[] | null = null;
// eslint-disable-next-line import-x/no-mutable-exports
let cacheKey: string | null = null;

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
/**
 * Keep the non-EVM filtering — and the cache it writes to — at module scope.
 * A hook body may not reassign variables declared outside it, so doing this
 * inline would stop the whole hook from being auto-memoized.
 */
function filterNonEvmTransactionsForAsset({
  txs,
  chainId,
  assetAddress,
  assetSymbol,
  isNativeAsset,
}: {
  txs: Transaction[];
  chainId: SupportedCaipChainId;
  assetAddress?: string;
  assetSymbol?: string;
  isNativeAsset?: boolean;
}): Transaction[] {
  const newCacheKey = JSON.stringify({
    txCount: txs.length,
    assetAddress,
    assetSymbol,
    isNativeAsset,
    lastTxId: txs[0]?.id,
  });

  if (cacheKey === newCacheKey && cachedFilteredTransactions) {
    return cachedFilteredTransactions;
  }

  let filteredTransactions: Transaction[] = txs;

  if (isNativeAsset) {
    const nativeAssetId =
      AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[chainId]?.nativeCurrency;

    filteredTransactions = txs.filter((tx: Transaction) => {
      const txData = (tx.from || []).concat(tx.to || []);

      return txData.some(
        (participant: { asset?: { type?: string } }) =>
          participant.asset &&
          typeof participant.asset === 'object' &&
          participant.asset.type === nativeAssetId,
      );
    });
  } else if (assetAddress || assetSymbol) {
    filteredTransactions = txs.filter((tx: Transaction) => {
      const txData = (tx.from || []).concat(tx.to || []);

      const involvesToken = txData.some(
        (participant: { asset?: { type?: string; unit?: string } }) => {
          if (participant.asset && typeof participant.asset === 'object') {
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

  cachedFilteredTransactions = filteredTransactions;
  cacheKey = newCacheKey;

  return filteredTransactions;
}
///: END:ONLY_INCLUDE_IF

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
  const isActivityRedesignEnabled = useSelector(
    selectIsActivityRedesignEnabled,
  );
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
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
    // Redesign Activity hides gas_payment siblings and shows the fee on the
    // primary row; keep token-details lists in sync when that flag is on.
    let transactions = isActivityRedesignEnabled
      ? evmTransactions.filter(
          (tx: Transaction) => tx.type !== TransactionType.gasPayment,
        )
      : evmTransactions;

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    if (asset.chainId && isNonEvmChainId(asset.chainId)) {
      const txs =
        nonEvmTransactionsData?.transactions?.filter(
          (tx: Transaction) => tx.chain === asset.chainId,
        ) || [];

      const filteredTransactions = filterNonEvmTransactionsForAsset({
        txs,
        chainId: asset.chainId as SupportedCaipChainId,
        assetAddress: asset.address?.toLowerCase(),
        assetSymbol: asset.symbol?.toLowerCase(),
        isNativeAsset: asset.isNative || asset.isETH,
      });

      transactions = [...filteredTransactions].sort(
        (a, b) => (b?.time ?? 0) - (a?.time ?? 0),
      );
    }
    ///: END:ONLY_INCLUDE_IF

    return transactions;
  }, [
    evmTransactions,
    isActivityRedesignEnabled,
    asset.chainId,
    asset.address,
    asset.symbol,
    asset.isNative,
    asset.isETH,
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    nonEvmTransactionsData,
    ///: END:ONLY_INCLUDE_IF
  ]);

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  /**
   * EVM bridge transactions arriving at this non-EVM asset.
   *
   * A bridge's only local tx is on the source chain, and this page's list is
   * keyring txs from its own chain — so the receiving leg would never show.
   * `isBridgeArrivalForCurrentToken` does the same job for EVM pages; it can't
   * be reused here because it compares hex chain ids.
   */
  const bridgeArrivalTxs = useMemo(() => {
    if (!isNonEvmAsset || !asset.chainId) {
      return [] as Transaction[];
    }

    const nativeAssetId =
      AVAILABLE_MULTICHAIN_NETWORK_CONFIGURATIONS[
        asset.chainId as SupportedCaipChainId
      ]?.nativeCurrency;
    const assetAddress = asset.address?.toLowerCase();
    const isNativeAsset = asset.isNative || asset.isETH;

    return evmTransactions.filter((tx: Transaction) => {
      if (tx.type !== TransactionType.bridge || tx.status === TX_UNAPPROVED) {
        return false;
      }

      const quote = findBridgeHistoryItem({
        bridgeHistory,
        transactionMetaId: tx.id,
        transactionActionId: tx.actionId,
        transactionHash: tx.hash,
      })?.quote;

      if (quote?.destChainId === undefined || quote.destChainId === null) {
        return false;
      }

      if (formatChainIdToCaip(quote.destChainId) !== asset.chainId) {
        return false;
      }

      const destAssetId = quote.destAsset?.assetId?.toLowerCase();

      if (isNativeAsset) {
        return Boolean(
          nativeAssetId && destAssetId === nativeAssetId.toLowerCase(),
        );
      }

      return Boolean(
        assetAddress && destAssetId && destAssetId.includes(assetAddress),
      );
    });
  }, [
    asset.address,
    asset.chainId,
    asset.isETH,
    asset.isNative,
    bridgeHistory,
    evmTransactions,
    isNonEvmAsset,
  ]);
  ///: END:ONLY_INCLUDE_IF

  // Wrapper for shared mUSD claim detection utility
  const checkIsMusdClaimForCurrentView = useCallback(
    (tx: Transaction): boolean =>
      isMusdClaimForCurrentView({
        tx,
        navAddress,
        navSymbol,
        chainId,
        selectedAddress: selectedAddress ?? '',
      }),
    [chainId, navAddress, navSymbol, selectedAddress],
  );

  /**
   * Did a swap/bridge move this page's token on either leg?
   *
   * Legs come from the bridge quote, looked up the same way the Activity screen
   * looks it up so both surfaces agree on which entry belongs to a tx.
   */
  const isSwapLegForCurrentToken = useCallback(
    (tx: Transaction) => {
      if (!SWAP_LIKE_TRANSACTION_TYPES.includes(tx.type)) {
        return false;
      }

      const bridgeHistoryItem = findBridgeHistoryItem({
        bridgeHistory,
        transactionMetaId: tx.id,
        transactionActionId: tx.actionId,
        transactionHash: tx.hash,
      });

      const { addresses, symbols } = getSwapLegTokenIdentifiers(
        tx,
        bridgeHistoryItem,
      );

      if (addresses.length > 0) {
        return Boolean(navAddress) && addresses.includes(navAddress);
      }

      // No addresses anywhere — legacy tx with symbols only.
      return Boolean(navSymbol) && symbols.includes(navSymbol);
    },
    [bridgeHistory, navAddress, navSymbol],
  );

  /**
   * Whether a bridge *arrives* at this page's token.
   *
   * A cross-chain bridge is one local transaction, on the source chain — the
   * destination transfer is the relayer's, so this device has nothing on the
   * receiving chain to match. Without this the destination page never shows the
   * incoming leg, even though its balance went up. Mirrors the Activity screen,
   * which includes a bridge whose `destChainId` is among the enabled chains.
   *
   * Checked ahead of the `chainId === tx.chainId` gate, which is what drops it.
   */
  const isBridgeArrivalForCurrentToken = useCallback(
    (tx: Transaction) => {
      if (tx.type !== TransactionType.bridge || tx.status === TX_UNAPPROVED) {
        return false;
      }

      const quote = findBridgeHistoryItem({
        bridgeHistory,
        transactionMetaId: tx.id,
        transactionActionId: tx.actionId,
        transactionHash: tx.hash,
      })?.quote;

      if (quote?.destChainId === undefined || quote.destChainId === null) {
        return false;
      }

      // Quotes carry EVM chain ids as numbers; `getMaybeHexChainId` also
      // returns undefined for a non-EVM destination, which can't match here.
      const destChainId = getMaybeHexChainId(String(quote.destChainId));

      if (
        !destChainId ||
        destChainId.toLowerCase() !== chainId?.toLowerCase()
      ) {
        return false;
      }

      const destAddress = quote.destAsset?.address?.toLowerCase();
      const isNativeDestination =
        !destAddress || destAddress === NATIVE_SWAPS_TOKEN_ADDRESS;

      return asset.isNative || asset.isETH
        ? isNativeDestination
        : Boolean(navAddress) && destAddress === navAddress;
    },
    [asset.isETH, asset.isNative, bridgeHistory, chainId, navAddress],
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

      if (isBridgeArrivalForCurrentToken(tx)) {
        return true;
      }

      const fromAddress = from ?? '';
      const toAddress = to ?? '';
      const ownAddress = selectedAddress ?? '';

      if (
        (areAddressesEqual(fromAddress, ownAddress) ||
          areAddressesEqual(toAddress, ownAddress)) &&
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
    [
      chainId,
      checkIsMusdClaimForCurrentView,
      isBridgeArrivalForCurrentToken,
      selectedAddress,
      tokens,
    ],
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

      if (isBridgeArrivalForCurrentToken(tx)) {
        return true;
      }

      const fromAddress = from ?? '';
      const toAddress = to ?? '';
      const ownAddress = selectedAddress ?? '';

      if (
        (areAddressesEqual(fromAddress, ownAddress) ||
          areAddressesEqual(toAddress, ownAddress)) &&
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
        return isSwapLegForCurrentToken(tx);
      }
      return false;
    },
    [
      chainId,
      checkIsMusdClaimForCurrentView,
      isBridgeArrivalForCurrentToken,
      isSwapLegForCurrentToken,
      navAddress,
      selectedAddress,
    ],
  );

  // Determine which filter to use
  const isNativeToken = asset.isNative || asset.isETH;
  const filter = useMemo(() => {
    if (isNativeToken) {
      return ethFilter;
    }
    return noEthFilter;
  }, [isNativeToken, ethFilter, noEthFilter]);

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

        const ownAddress = selectedAddress ?? '';

        submittedTxs = submittedTxs.filter(
          ({ txParams: { from, nonce } }: Transaction) => {
            if (!areAddressesEqual(from ?? '', ownAddress)) {
              return false;
            }
            const alreadySubmitted = submittedNonces.includes(nonce);
            const alreadyConfirmed = confirmedTxs.find(
              (confirmedTransaction: Transaction) => {
                const confirmedFrom =
                  safeToChecksumAddress(confirmedTransaction.txParams.from) ??
                  '';
                return (
                  areAddressesEqual(confirmedFrom, ownAddress) &&
                  confirmedTransaction.txParams.nonce === nonce
                );
              },
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
    bridgeArrivalTxs,
    onRefresh,
  };
};

export default useTokenTransactions;
