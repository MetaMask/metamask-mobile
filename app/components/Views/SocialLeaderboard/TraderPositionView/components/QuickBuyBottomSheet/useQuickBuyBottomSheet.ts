import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { Position } from '@metamask/social-controllers';
import type { Hex } from '@metamask/utils';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { useQuickBuySetup } from './useQuickBuySetup';
import { useSourceTokenOptions } from './useSourceTokenOptions';
import { useQuickBuyQuotes } from './useQuickBuyQuotes';
import { isGaslessQuote } from '../../../../../UI/Bridge/utils/isGaslessQuote';
import {
  isNumberValue,
  dotAndCommaDecimalFormatter,
} from '../../../../../../util/number';
import { isNonEvmChainId } from '@metamask/bridge-controller';
import { useGasFeeEstimates } from '../../../../confirmations/hooks/gas/useGasFeeEstimates';
import {
  setSourceAmount,
  setSourceToken,
  setDestToken,
  resetBridgeState,
  selectIsSubmittingTx,
  selectDestAddress,
  selectIsEvmNonEvmBridge,
  selectIsNonEvmNonEvmBridge,
  selectIsSolanaSourced,
  selectBridgeFeatureFlags,
  setIsSubmittingTx,
} from '../../../../../../core/redux/slices/bridge';
import { useLatestBalance } from '../../../../../UI/Bridge/hooks/useLatestBalance';
import useIsInsufficientBalance from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../../../../UI/Bridge/hooks/useHasSufficientGas';
import { useInitialSlippage } from '../../../../../UI/Bridge/hooks/useInitialSlippage';
import { usePriceImpactViewData } from '../../../../../UI/Bridge/hooks/usePriceImpactViewData';
import {
  parsePriceImpact,
  exceedsPriceImpactErrorThreshold,
} from '../../../../../UI/Bridge/utils/getPriceImpactViewData';
import useSubmitBridgeTx from '../../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { useRefreshSmartTransactionsLiveness } from '../../../../../hooks/useRefreshSmartTransactionsLiveness';
import { useIsGasIncludedSTXSendBundleSupported } from '../../../../../UI/Bridge/hooks/useIsGasIncludedSTXSendBundleSupported';
import { useRecipientInitialization } from '../../../../../UI/Bridge/hooks/useRecipientInitialization';
import { selectSourceWalletAddress } from '../../../../../../selectors/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../../util/address';
import Engine from '../../../../../../core/Engine';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { calcTokenValue } from '../../../../../../util/transactions';

export type QuickBuyButtonError =
  | 'insufficient_balance'
  | 'insufficient_gas'
  | 'no_quotes';

const BUTTON_ERROR_LABELS: Record<QuickBuyButtonError, string> = {
  insufficient_balance: 'bridge.insufficient_funds',
  insufficient_gas: 'bridge.insufficient_gas',
  no_quotes: 'social_leaderboard.quick_buy.no_quotes',
};

export interface UseQuickBuyBottomSheetResult {
  // refs
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
  formattedNetworkFee: string;
  formattedSlippage: string;
  formattedMinimumReceived: string;
  formattedPriceImpact: string;
  totalAmountUsd: string;
  // quote state
  isQuoteLoading: boolean;
  isSubmittingTx: boolean;
  isTotalLoading: boolean;
  // warnings (banner-level; can stack)
  isHardwareSolanaBlocked: boolean;
  priceImpactViewData: ReturnType<typeof usePriceImpactViewData>;
  isPriceImpactError: boolean;
  // button state (priority-encoded; the Buy button surfaces at most one)
  buttonError: QuickBuyButtonError | null;
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
  const hiddenInputRef = useRef<TextInput>(null);
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [usdAmount, setUsdAmount] = useState('');

  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);
  const isEvmNonEvmBridge = useSelector(selectIsEvmNonEvmBridge);
  const isNonEvmNonEvmBridge = useSelector(selectIsNonEvmNonEvmBridge);
  const isSolanaSourced = useSelector(selectIsSolanaSourced);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isHardwareAddress = selectedAddress
    ? !!isHardwareAccount(selectedAddress)
    : false;
  const isHardwareSolanaBlocked = isHardwareAddress && Boolean(isSolanaSourced);

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

  // BridgeController.fetchQuotes does not start gas fee polling, so estimates
  // for the source chain may be missing when selectBridgeQuotesBase enriches
  // the quote — producing a $0 network fee. Poll explicitly for the source
  // chain's network client.
  const sourceNetworkClientId = useMemo(() => {
    if (!sourceChainId || isNonEvmChainId(sourceChainId)) return undefined;
    try {
      return Engine.context.NetworkController.findNetworkClientIdByChainId(
        sourceChainId,
      );
    } catch {
      return undefined;
    }
  }, [sourceChainId]);
  useGasFeeEstimates(sourceNetworkClientId);

  useRefreshSmartTransactionsLiveness(sourceChainId);
  useIsGasIncludedSTXSendBundleSupported(sourceChainId);
  useInitialSlippage();

  useEffect(() => {
    if (selectedSourceToken && destToken) {
      dispatch(setSourceToken(selectedSourceToken));
      dispatch(setDestToken(destToken));
    }
  }, [selectedSourceToken, destToken, dispatch]);

  const hasInitializedRecipient = useRef(false);
  useRecipientInitialization(hasInitializedRecipient);

  const sourceTokenAmount = useMemo(() => {
    if (!usdAmount || !sourceToken?.currencyExchangeRate) {
      return undefined;
    }
    const usd = parseFloat(usdAmount);
    if (isNaN(usd) || usd <= 0) return undefined;
    return (usd / sourceToken.currencyExchangeRate).toString();
  }, [usdAmount, sourceToken?.currencyExchangeRate]);

  useEffect(() => {
    if (sourceTokenAmount) {
      dispatch(setSourceAmount(sourceTokenAmount));
    } else {
      dispatch(setSourceAmount(undefined));
    }
  }, [sourceTokenAmount, dispatch]);

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
  });

  const {
    activeQuote,
    destTokenAmount: estimatedReceiveAmount,
    isQuoteLoading,
    isNoQuotesAvailable,
    quoteFetchError,
    isActiveQuoteForCurrentTokenPair,
  } = useQuickBuyQuotes({
    sourceToken,
    destToken,
    sourceTokenAmount,
  });

  const networkFeeRawUsd = useMemo(() => {
    if (!activeQuote) return null;
    if (isGaslessQuote(activeQuote.quote)) {
      const v = activeQuote.includedTxFees?.valueInCurrency;
      return v != null && isNumberValue(v) ? parseFloat(v) : null;
    }
    const total = activeQuote.totalNetworkFee?.valueInCurrency;
    if (total != null && isNumberValue(total)) return parseFloat(total);
    const effective = activeQuote.gasFee?.effective?.valueInCurrency;
    if (effective != null && isNumberValue(effective))
      return parseFloat(effective);
    return null;
  }, [activeQuote]);

  const formattedNetworkFee = useMemo(() => {
    if (networkFeeRawUsd === null) return '-';
    return `$${networkFeeRawUsd.toFixed(2)}`;
  }, [networkFeeRawUsd]);

  const formattedSlippage = useMemo(() => {
    const quoteSlippage = activeQuote?.quote?.slippage;
    if (quoteSlippage == null) return '-';
    return `${quoteSlippage}%`;
  }, [activeQuote]);

  const formattedMinimumReceived = useMemo(() => {
    const amount = activeQuote?.minToTokenAmount?.amount;
    const symbol = destToken?.symbol;
    if (!amount || !symbol) return '-';
    const num = parseFloat(amount);
    if (isNaN(num)) return '-';
    const floored = Math.floor(num * 1e8) / 1e8;
    const formatted = floored.toFixed(8).replace(/\.?0+$/, '') || '0';
    return `${formatted} ${symbol}`;
  }, [activeQuote, destToken]);

  const formattedPriceImpact = useMemo(() => {
    const priceImpact = activeQuote?.quote?.priceData?.priceImpact;
    if (!priceImpact) return '-';
    return `${(Number(priceImpact) * 100).toFixed(2)}%`;
  }, [activeQuote]);

  const priceImpactViewData = usePriceImpactViewData(
    activeQuote?.quote?.priceData?.priceImpact,
  );

  const isPriceImpactError = useMemo(
    () =>
      exceedsPriceImpactErrorThreshold(
        parsePriceImpact(activeQuote?.quote?.priceData?.priceImpact),
        bridgeFeatureFlags?.priceImpactThreshold?.error,
      ),
    [activeQuote, bridgeFeatureFlags],
  );

  const totalAmountUsd = useMemo(() => {
    const inputNum = parseFloat(usdAmount);
    if (!usdAmount || isNaN(inputNum)) return '$0';
    if (activeQuote && networkFeeRawUsd !== null) {
      return `$${(inputNum + networkFeeRawUsd).toFixed(2)}`;
    }
    return '$0';
  }, [usdAmount, activeQuote, networkFeeRawUsd]);

  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceTokenAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
    quoteOverride: activeQuote ?? null,
  });

  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });

  const { submitBridgeTx } = useSubmitBridgeTx();
  const hasDestinationPicker = isEvmNonEvmBridge || isNonEvmNonEvmBridge;
  const isDestinationAddressMissing = hasDestinationPicker && !destAddress;

  // Cleanup bridge state on unmount
  useEffect(
    () => () => {
      dispatch(resetBridgeState());
      if (Engine.context.BridgeController?.resetState) {
        Engine.context.BridgeController.resetState();
      }
    },
    [dispatch],
  );

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
    const cleaned = dotAndCommaDecimalFormatter(text).replace(/[^0-9.]/g, '');
    const normalized = cleaned.startsWith('.') ? `0${cleaned}` : cleaned;
    const parts = normalized.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) return;
    setUsdAmount(normalized);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!activeQuote || !walletAddress) return;

    try {
      dispatch(setIsSubmittingTx(true));
      await submitBridgeTx({ quoteResponse: activeQuote });
      onClose();
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    } catch (error) {
      console.error('Error submitting QuickBuy tx', error);
      // Keep sheet open on error
    } finally {
      dispatch(setIsSubmittingTx(false));
    }
  }, [
    activeQuote,
    walletAddress,
    submitBridgeTx,
    dispatch,
    onClose,
    navigation,
  ]);

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

  const hasError = Boolean(quoteFetchError || isNoQuotesAvailable);
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
    isHardwareSolanaBlocked ||
    isPriceImpactError ||
    !walletAddress;

  const isTotalLoading =
    hasValidAmount && (isQuoteLoading || isPendingQuoteRefresh);

  const isConfirmLoading =
    isSubmittingTx ||
    isAwaitingQuote ||
    isPendingQuoteRefresh ||
    (isQuoteLoading && !activeQuote && hasCompleteQuoteInputs);

  const buttonError: QuickBuyButtonError | null = hasInsufficientBalance
    ? 'insufficient_balance'
    : hasSufficientGas === false
      ? 'insufficient_gas'
      : hasError
        ? 'no_quotes'
        : null;

  const getButtonLabel = useCallback(() => {
    if (buttonError) return strings(BUTTON_ERROR_LABELS[buttonError]);
    if (isSubmittingTx) return strings('bridge.submitting_transaction');
    return strings('social_leaderboard.trader_position.buy');
  }, [buttonError, isSubmittingTx]);

  return {
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
    formattedNetworkFee,
    formattedSlippage,
    formattedMinimumReceived,
    formattedPriceImpact,
    totalAmountUsd,
    isQuoteLoading,
    isSubmittingTx,
    isTotalLoading,
    isHardwareSolanaBlocked,
    priceImpactViewData,
    isPriceImpactError,
    buttonError,
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
