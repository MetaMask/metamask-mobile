import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { Position } from '@metamask/social-controllers';
import type { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import type { Hex } from '@metamask/utils';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import type { BridgeToken } from '../../../../../UI/Bridge/types';
import { useQuickBuySetup } from './useQuickBuySetup';
import { useSourceTokenOptions } from './useSourceTokenOptions';
import {
  setSourceAmount,
  setSourceToken,
  setDestToken,
  resetBridgeState,
  selectIsSubmittingTx,
  selectDestAddress,
  selectIsEvmNonEvmBridge,
  selectIsNonEvmNonEvmBridge,
  setIsSubmittingTx,
} from '../../../../../../core/redux/slices/bridge';
import { useBridgeQuoteRequest } from '../../../../../UI/Bridge/hooks/useBridgeQuoteRequest';
import { useBridgeQuoteData } from '../../../../../UI/Bridge/hooks/useBridgeQuoteData';
import { useRewards } from '../../../../../UI/Bridge/hooks/useRewards';
import { useLatestBalance } from '../../../../../UI/Bridge/hooks/useLatestBalance';
import useIsInsufficientBalance from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../../../../UI/Bridge/hooks/useHasSufficientGas';
import { useInitialSlippage } from '../../../../../UI/Bridge/hooks/useInitialSlippage';
import useSubmitBridgeTx from '../../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { useRefreshSmartTransactionsLiveness } from '../../../../../hooks/useRefreshSmartTransactionsLiveness';
import { useIsGasIncludedSTXSendBundleSupported } from '../../../../../UI/Bridge/hooks/useIsGasIncludedSTXSendBundleSupported';
import { useRecipientInitialization } from '../../../../../UI/Bridge/hooks/useRecipientInitialization';
import { selectSourceWalletAddress } from '../../../../../../selectors/bridge';
import Engine from '../../../../../../core/Engine';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';

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
  sourceChainId: Hex;
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
  // rewards
  estimatedPoints: number | null;
  isRewardsLoading: boolean;
  shouldShowLiveRewardsEstimate: boolean;
  shouldShowRewardsOptInCta: boolean;
  shouldShowRewardsFallbackZero: boolean;
  hasRewardsError: boolean;
  accountOptedIn: boolean | null;
  rewardsAccountScope: InternalAccount | null;
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
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const [usdAmount, setUsdAmount] = useState('');

  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const destAddress = useSelector(selectDestAddress);
  const isEvmNonEvmBridge = useSelector(selectIsEvmNonEvmBridge);
  const isNonEvmNonEvmBridge = useSelector(selectIsNonEvmNonEvmBridge);

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
  const sourceChainId = (sourceToken?.chainId as Hex) ?? '0x1';

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

  const updateQuoteParams = useBridgeQuoteRequest({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const {
    activeQuote,
    isLoading: isQuoteLoading,
    isNoQuotesAvailable,
    quoteFetchError,
    blockaidError,
  } = useBridgeQuoteData({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const {
    estimatedPoints,
    isLoading: isRewardsLoading,
    shouldShowRewardsRow,
    hasError: hasRewardsError,
    accountOptedIn,
    rewardsAccountScope,
  } = useRewards({
    activeQuote,
    isQuoteLoading,
  });

  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceTokenAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });

  const shouldShowLiveRewardsEstimate = Boolean(
    shouldShowRewardsRow && accountOptedIn,
  );
  const shouldShowRewardsOptInCta = Boolean(
    shouldShowRewardsRow && !accountOptedIn && rewardsAccountScope,
  );
  const hasRewardsQuoteContext = Boolean(
    sourceTokenAmount && walletAddress && activeQuote,
  );
  const shouldShowRewardsFallbackZero = Boolean(
    hasRewardsQuoteContext &&
      !shouldShowLiveRewardsEstimate &&
      !shouldShowRewardsOptInCta,
  );

  const { submitBridgeTx } = useSubmitBridgeTx();
  const hasDestinationPicker = isEvmNonEvmBridge || isNonEvmNonEvmBridge;
  const hasValidQuoteInputs = Boolean(
    sourceToken &&
      destToken &&
      sourceTokenAmount &&
      (!hasDestinationPicker || destAddress),
  );

  useEffect(() => {
    if (hasValidQuoteInputs) {
      updateQuoteParams();
    }
    return () => {
      updateQuoteParams.cancel();
    };
  }, [hasValidQuoteInputs, updateQuoteParams]);

  // Open bottom sheet on mount
  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

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
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) return;
    setUsdAmount(cleaned);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!activeQuote || !walletAddress) return;

    try {
      dispatch(setIsSubmittingTx(true));
      await submitBridgeTx({ quoteResponse: activeQuote });
      onClose();
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    } catch {
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

  const estimatedReceiveAmount = activeQuote?.quote?.destTokenAmount;

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

  const isConfirmDisabled =
    !hasValidAmount ||
    isSetupLoading ||
    !destToken ||
    (isQuoteLoading && !activeQuote) ||
    hasInsufficientBalance ||
    hasSufficientGas === false ||
    isSubmittingTx ||
    hasError ||
    !walletAddress;

  const isConfirmLoading =
    isSubmittingTx || (isQuoteLoading && !activeQuote && hasValidAmount);

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
    estimatedPoints,
    isRewardsLoading,
    shouldShowLiveRewardsEstimate,
    shouldShowRewardsOptInCta,
    shouldShowRewardsFallbackZero,
    hasRewardsError,
    accountOptedIn,
    rewardsAccountScope,
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
