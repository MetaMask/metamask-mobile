import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { Position } from '@metamask/social-controllers';
import type { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import type { Hex } from '@metamask/utils';
import {
  formatChainIdToCaip,
  formatChainIdToHex,
  isNonEvmChainId,
  type QuoteMetadata,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { useQuickBuySetup } from './useQuickBuySetup';
import { useSourceTokenOptions } from './useSourceTokenOptions';
import { useQuickBuyQuotes } from './useQuickBuyQuotes';
import { useSubmitQuickBuyTx } from './useSubmitQuickBuyTx';
import { QUICKBUY_DEFAULT_SLIPPAGE } from './constants';
import { useLatestBalance } from '../../../../../UI/Bridge/hooks/useLatestBalance';
import useIsInsufficientBalance from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../../../../UI/Bridge/hooks/useHasSufficientGas';
import { useIsSendBundleSupported } from '../../../../../UI/Bridge/hooks/useIsSendBundleSupported';
import { useRefreshSmartTransactionsLiveness } from '../../../../../hooks/useRefreshSmartTransactionsLiveness';
import {
  getGaslessBridgeWith7702EnabledForChain,
  selectShouldUseSmartTransaction,
} from '../../../../../../selectors/smartTransactionsController';
import { selectIsGasIncluded7702Supported } from '../../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountByScope } from '../../../../../../selectors/multichainAccounts/accounts';
import type { RootState } from '../../../../../../reducers';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { calcTokenValue } from '../../../../../../util/transactions';

export interface UseQuickBuyBottomSheetResult {
  // refs
  bottomSheetRef: React.RefObject<BottomSheetRef>;
  hiddenInputRef: React.RefObject<TextInput>;
  // setup
  destToken: BridgeToken | undefined;
  isSetupLoading: boolean;
  isUnsupportedChain: boolean;
  // source token
  sourceToken: BridgeToken | undefined;
  sourceChainId: Hex | undefined;
  sourceTokenOptions: BridgeToken[];
  selectedSourceToken: BridgeToken | undefined;
  isSourcePickerOpen: boolean;
  setIsSourcePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedSourceToken: React.Dispatch<
    React.SetStateAction<BridgeToken | undefined>
  >;
  // amount
  usdAmount: string;
  estimatedReceiveAmount: string | undefined;
  sourceBalanceFiat: string | undefined;
  // quote state
  isQuoteLoading: boolean;
  isSubmittingTx: boolean;
  // button state
  hasError: boolean;
  hasValidAmount: boolean;
  isConfirmDisabled: boolean;
  isConfirmLoading: boolean;
  getButtonLabel: () => string;
  // handlers
  handleClose: () => void;
  handlePresetPress: (preset: string) => void;
  handleAmountAreaPress: () => void;
  handleAmountChange: (text: string) => void;
  handleConfirm: () => Promise<void>;
}

export function useQuickBuyBottomSheet(
  position: Position,
  onClose: () => void,
): UseQuickBuyBottomSheetResult {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const hiddenInputRef = useRef<TextInput>(null);
  const navigation = useNavigation();

  const [usdAmount, setUsdAmount] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  // Slippage is kept local so QuickBuy does not share the Bridge/Swaps slice
  // value. Expose a setter later if we need per-pair slippage overrides.
  const [slippage] = useState(QUICKBUY_DEFAULT_SLIPPAGE);

  const {
    chainId: destChainId,
    destToken,
    isLoading: isSetupLoading,
    isUnsupportedChain,
  } = useQuickBuySetup(position);

  const { options: sourceTokenOptions } = useSourceTokenOptions(destChainId);
  const [selectedSourceToken, setSelectedSourceToken] = useState<
    BridgeToken | undefined
  >(undefined);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);

  // Auto-select the first option (highest fiat balance) when options load
  useEffect(() => {
    if (sourceTokenOptions.length > 0 && !selectedSourceToken) {
      setSelectedSourceToken(sourceTokenOptions[0]);
    }
  }, [sourceTokenOptions, selectedSourceToken]);

  const sourceToken = selectedSourceToken;
  const sourceChainId = sourceToken?.chainId as Hex | undefined;

  useRefreshSmartTransactionsLiveness(sourceChainId);

  // Wallet address — selected account for the source token's scope. Replaces
  // `selectSourceWalletAddress`, which reads from the bridge slice.
  const walletAddress = useSelector((state: RootState) => {
    if (!sourceToken) return undefined;
    const sourceCaip = formatChainIdToCaip(sourceToken.chainId);
    return selectSelectedInternalAccountByScope(state)(sourceCaip)?.address;
  });

  // Destination address — selected account for the dest token's scope. Replaces
  // `useRecipientInitialization` + `selectDestAddress`.
  const destAddress = useSelector((state: RootState) => {
    if (!destToken) return undefined;
    const destCaip = formatChainIdToCaip(destToken.chainId);
    return selectSelectedInternalAccountByScope(state)(destCaip)?.address;
  });

  // Cross-ecosystem bridge detection as pure functions over the chain IDs.
  const { isEvmNonEvmBridge, isNonEvmNonEvmBridge } = useMemo(() => {
    if (!sourceToken?.chainId || !destToken?.chainId) {
      return { isEvmNonEvmBridge: false, isNonEvmNonEvmBridge: false };
    }
    const srcNonEvm = isNonEvmChainId(sourceToken.chainId);
    const destNonEvm = isNonEvmChainId(destToken.chainId);
    return {
      isEvmNonEvmBridge: srcNonEvm !== destNonEvm,
      isNonEvmNonEvmBridge: srcNonEvm && destNonEvm,
    };
  }, [sourceToken?.chainId, destToken?.chainId]);

  // Gas-included flags — inline replacement for useIsGasIncludedSTXSendBundleSupported
  // + selectGasIncludedQuoteParams. No dispatches.
  const evmSourceHexChainId =
    sourceToken?.chainId && !isNonEvmChainId(sourceToken.chainId)
      ? formatChainIdToHex(sourceToken.chainId)
      : undefined;
  const isSendBundleSupportedForChain =
    useIsSendBundleSupported(evmSourceHexChainId);
  const shouldUseSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, evmSourceHexChainId),
  );
  const isGasIncludedSTXSendBundleSupported = Boolean(
    shouldUseSmartTransaction && isSendBundleSupportedForChain,
  );
  const isGasIncluded7702Supported = useSelector(
    selectIsGasIncluded7702Supported,
  );
  const isGasIncluded7702BridgeEnabled = useSelector((state: RootState) => {
    if (!evmSourceHexChainId) return false;
    return getGaslessBridgeWith7702EnabledForChain(state, evmSourceHexChainId);
  });
  const isSwap = useMemo(() => {
    if (!sourceToken?.chainId || !destToken?.chainId) return false;
    return (
      formatChainIdToCaip(sourceToken.chainId) ===
      formatChainIdToCaip(destToken.chainId)
    );
  }, [sourceToken?.chainId, destToken?.chainId]);
  const { gasIncluded, gasIncluded7702 } = useMemo(() => {
    if (isGasIncludedSTXSendBundleSupported) {
      return { gasIncluded: true, gasIncluded7702: false };
    }
    const enabled =
      (isSwap || isGasIncluded7702BridgeEnabled) && isGasIncluded7702Supported;
    return { gasIncluded: enabled, gasIncluded7702: enabled };
  }, [
    isGasIncludedSTXSendBundleSupported,
    isGasIncluded7702Supported,
    isGasIncluded7702BridgeEnabled,
    isSwap,
  ]);

  const sourceTokenAmount = useMemo(() => {
    if (!usdAmount || !sourceToken?.currencyExchangeRate) {
      return undefined;
    }
    const usd = parseFloat(usdAmount);
    if (isNaN(usd) || usd <= 0) return undefined;
    return (usd / sourceToken.currencyExchangeRate).toString();
  }, [usdAmount, sourceToken?.currencyExchangeRate]);

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
  });

  // Simple balance check (no gas) to feed into the quote request. Mirrors the
  // `ignoreGasFees: true` call used inside the old useBridgeQuoteRequest.
  const insufficientBalForRequest = useIsInsufficientBalance({
    amount: sourceTokenAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
    ignoreGasFees: true,
  });

  const hasDestinationPicker = isEvmNonEvmBridge || isNonEvmNonEvmBridge;
  const isDestinationAddressMissing = hasDestinationPicker && !destAddress;

  const hasValidQuoteInputs = Boolean(
    sourceToken &&
      destToken &&
      sourceTokenAmount &&
      !isDestinationAddressMissing,
  );

  const {
    activeQuote,
    destTokenAmount: estimatedReceiveAmount,
    isQuoteLoading,
    quoteFetchError,
    isNoQuotesAvailable,
    blockaidError,
    isActiveQuoteForCurrentTokenPair,
  } = useQuickBuyQuotes({
    sourceToken,
    destToken,
    sourceTokenAmount,
    slippage,
    walletAddress,
    destAddress,
    insufficientBal: insufficientBalForRequest,
    gasIncluded,
    gasIncluded7702,
    enabled: hasValidQuoteInputs,
  });

  // UI-facing insufficient balance. We pass `ignoreGasFees: true` for QuickBuy
  // because the raw `fetchQuotes` response lacks `QuoteMetadata.gasFee.effective.amount`,
  // so a gas-inclusive check has no data to work with. This also prevents the
  // hook from reading stale `selectBridgeQuotes` data that may linger from a
  // previous Bridge/Swaps session.
  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceTokenAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
    ignoreGasFees: true,
  });

  // The shared hook's `quote` prop is narrowly typed to the enriched
  // `useBridgeQuoteData.activeQuote` shape. Our raw QuickBuy quote is
  // structurally compatible (optional fields gracefully degrade to null
  // return), so we cast at the call site.
  const hasSufficientGas = useHasSufficientGas({
    quote: activeQuote as unknown as Parameters<
      typeof useHasSufficientGas
    >[0]['quote'],
  });

  const { submitQuickBuyTx } = useSubmitQuickBuyTx({ walletAddress });

  // Open bottom sheet on mount
  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handlePresetPress = useCallback((preset: string) => {
    setUsdAmount(preset);
  }, []);

  const handleAmountAreaPress = useCallback(() => {
    hiddenInputRef.current?.focus();
  }, []);

  const handleAmountChange = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;
    const parts = normalized.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) return;
    setUsdAmount(normalized);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!activeQuote || !walletAddress) return;

    try {
      setIsSubmittingTx(true);
      // submitQuickBuyTx expects an enriched QuoteResponse & QuoteMetadata but
      // BridgeStatusController.submitTx only reads base QuoteResponse fields
      // (quote/trade/approval/featureId/resetApproval). The metadata fields
      // are UI-display only, so casting the raw fetchQuotes result is safe.
      await submitQuickBuyTx({
        quoteResponse: activeQuote as unknown as QuoteResponse & QuoteMetadata,
      });
      onClose();
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    } catch (error) {
      console.error('Error submitting QuickBuy tx', error);
      // Keep sheet open on error
    } finally {
      setIsSubmittingTx(false);
    }
  }, [activeQuote, walletAddress, submitQuickBuyTx, onClose, navigation]);

  const sourceBalanceFiat = useMemo(() => {
    if (
      !latestSourceBalance?.displayBalance ||
      !sourceToken?.currencyExchangeRate
    )
      return undefined;
    const balance = parseFloat(latestSourceBalance.displayBalance);
    if (isNaN(balance)) return undefined;
    return `$${(balance * sourceToken.currencyExchangeRate).toFixed(2)}`;
  }, [latestSourceBalance?.displayBalance, sourceToken?.currencyExchangeRate]);

  const hasError = Boolean(
    blockaidError || quoteFetchError || isNoQuotesAvailable,
  );
  const hasValidAmount = Boolean(usdAmount && Number(usdAmount) > 0);
  const hasQuoteRequestableAmount = useMemo(() => {
    const hasNonZeroInputAmount = Boolean(
      sourceTokenAmount && Number(sourceTokenAmount) !== 0,
    );

    try {
      return Boolean(
        hasNonZeroInputAmount &&
          (sourceToken?.decimals === undefined ||
            calcTokenValue(sourceTokenAmount, sourceToken.decimals).toFixed(
              0,
            ) !== '0'),
      );
    } catch {
      return hasNonZeroInputAmount;
    }
  }, [sourceTokenAmount, sourceToken?.decimals]);
  const settledSourceTokenAmountRef = useRef(sourceTokenAmount);
  const wasQuoteLoadingRef = useRef(isQuoteLoading);

  useEffect(() => {
    const loadingJustFinished = wasQuoteLoadingRef.current && !isQuoteLoading;

    if (loadingJustFinished || hasError) {
      settledSourceTokenAmountRef.current = sourceTokenAmount;
    }

    wasQuoteLoadingRef.current = isQuoteLoading;
  }, [isQuoteLoading, sourceTokenAmount, hasError]);

  const hasCompleteQuoteInputs = Boolean(
    sourceToken &&
      destToken &&
      hasQuoteRequestableAmount &&
      !isDestinationAddressMissing,
  );
  const isAwaitingQuote =
    hasCompleteQuoteInputs && !activeQuote && !isQuoteLoading && !hasError;
  const isPendingQuoteRefresh =
    settledSourceTokenAmountRef.current !== sourceTokenAmount &&
    hasCompleteQuoteInputs;
  const hasQuoteMismatch =
    Boolean(activeQuote) && !isActiveQuoteForCurrentTokenPair;

  const isConfirmDisabled =
    !hasValidAmount ||
    isSetupLoading ||
    !sourceToken ||
    !destToken ||
    isDestinationAddressMissing ||
    !activeQuote ||
    hasQuoteMismatch ||
    isPendingQuoteRefresh ||
    hasInsufficientBalance ||
    hasSufficientGas === false ||
    isSubmittingTx ||
    hasError ||
    !walletAddress;

  const isConfirmLoading =
    isSubmittingTx ||
    isAwaitingQuote ||
    isPendingQuoteRefresh ||
    (isQuoteLoading && !activeQuote && hasCompleteQuoteInputs);

  const getButtonLabel = useCallback(() => {
    if (isSetupLoading) return strings('social_leaderboard.quick_buy.loading');
    if (hasInsufficientBalance) return strings('bridge.insufficient_funds');
    if (hasSufficientGas === false) return strings('bridge.insufficient_gas');
    if (isSubmittingTx) return strings('bridge.submitting_transaction');
    if (hasError) return strings('social_leaderboard.quick_buy.unavailable');
    return strings('social_leaderboard.trader_position.buy');
  }, [
    isSetupLoading,
    hasInsufficientBalance,
    hasSufficientGas,
    isSubmittingTx,
    hasError,
  ]);

  return {
    bottomSheetRef,
    hiddenInputRef,
    destToken,
    isSetupLoading,
    isUnsupportedChain,
    sourceToken,
    sourceChainId,
    sourceTokenOptions,
    selectedSourceToken,
    isSourcePickerOpen,
    setIsSourcePickerOpen,
    setSelectedSourceToken,
    usdAmount,
    estimatedReceiveAmount,
    sourceBalanceFiat,
    isQuoteLoading,
    isSubmittingTx,
    hasError,
    hasValidAmount,
    isConfirmDisabled,
    isConfirmLoading,
    getButtonLabel,
    handleClose,
    handlePresetPress,
    handleAmountAreaPress,
    handleAmountChange,
    handleConfirm,
  };
}
