import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import type { Position } from '@metamask/social-controllers';
import type { BottomSheetRef } from '../../../../../../component-library/components/BottomSheets/BottomSheet/BottomSheet.types';
import BottomSheet from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import { useQuickBuySetup } from './useQuickBuySetup';
import {
  setSourceAmount,
  setSourceToken,
  setDestToken,
  resetBridgeState,
  selectIsSubmittingTx,
  setIsSubmittingTx,
} from '../../../../../../core/redux/slices/bridge';
import { useBridgeQuoteRequest } from '../../../../../UI/Bridge/hooks/useBridgeQuoteRequest';
import { useBridgeQuoteData } from '../../../../../UI/Bridge/hooks/useBridgeQuoteData';
import { useLatestBalance } from '../../../../../UI/Bridge/hooks/useLatestBalance';
import useIsInsufficientBalance from '../../../../../UI/Bridge/hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../../../../UI/Bridge/hooks/useHasSufficientGas';
import { useInitialSlippage } from '../../../../../UI/Bridge/hooks/useInitialSlippage';
import useSubmitBridgeTx from '../../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { useRefreshSmartTransactionsLiveness } from '../../../../../hooks/useRefreshSmartTransactionsLiveness';
import { useIsGasIncludedSTXSendBundleSupported } from '../../../../../UI/Bridge/hooks/useIsGasIncludedSTXSendBundleSupported';
import { selectSourceWalletAddress } from '../../../../../../selectors/bridge';
import Engine from '../../../../../../core/Engine';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';

export interface QuickBuyBottomSheetProps {
  isVisible: boolean;
  position: Position | null;
  onClose: () => void;
}

const styles = StyleSheet.create({
  amountText: { fontSize: 48, lineHeight: 50 },
  hiddenInput: { position: 'absolute', opacity: 0, height: 0 },
});

const USD_PRESETS = ['1', '20', '50', '100'];

interface InnerProps {
  position: Position;
  onClose: () => void;
}

const QuickBuyBottomSheetInner: React.FC<InnerProps> = ({
  position,
  onClose,
}) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const hiddenInputRef = useRef<TextInput>(null);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { colors } = useTheme();

  // USD amount the user wants to spend
  const [usdAmount, setUsdAmount] = useState('');

  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const walletAddress = useSelector(selectSourceWalletAddress);

  // Resolve Position → BridgeToken (source on mainnet, dest on position's chain)
  const {
    sourceChainId,
    destToken,
    sourceToken,
    isLoading: isSetupLoading,
    isUnsupportedChain,
  } = useQuickBuySetup(position);

  // Initialize STX for the source chain (where the tx originates)
  useRefreshSmartTransactionsLiveness(sourceChainId);
  useIsGasIncludedSTXSendBundleSupported(sourceChainId);

  // Initialize slippage defaults
  useInitialSlippage();

  // Set tokens in bridge Redux when ready
  useEffect(() => {
    if (sourceToken && destToken) {
      dispatch(setSourceToken(sourceToken));
      dispatch(setDestToken(destToken));
    }
  }, [sourceToken, destToken, dispatch]);

  // Convert USD → source token amount using exchange rate
  const sourceTokenAmount = useMemo(() => {
    if (!usdAmount || !sourceToken?.currencyExchangeRate) {
      return undefined;
    }
    const usd = parseFloat(usdAmount);
    if (isNaN(usd) || usd <= 0) return undefined;
    const tokenAmount = usd / sourceToken.currencyExchangeRate;
    return tokenAmount.toString();
  }, [usdAmount, sourceToken?.currencyExchangeRate]);

  // Sync converted amount to bridge Redux
  useEffect(() => {
    if (sourceTokenAmount) {
      dispatch(setSourceAmount(sourceTokenAmount));
    } else {
      dispatch(setSourceAmount(undefined));
    }
  }, [sourceTokenAmount, dispatch]);

  // Source balance for validation
  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
  });

  // Quote lifecycle
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

  // Validation
  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceTokenAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });

  // Tx submission
  const { submitBridgeTx } = useSubmitBridgeTx();

  // Trigger quote fetch when inputs are valid
  useEffect(() => {
    const hasValidInputs = sourceToken && destToken && sourceTokenAmount;

    if (hasValidInputs) {
      updateQuoteParams();
    }
    return () => {
      updateQuoteParams.cancel();
    };
  }, [sourceToken, destToken, sourceTokenAmount, updateQuoteParams]);

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
    // Limit decimal places to 2 for USD
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

  // Estimated dest token amount from quote
  const estimatedReceiveAmount = activeQuote?.quote?.destTokenAmount;

  // Source balance in fiat for "Pay with" row
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

  // Button state
  const hasError = Boolean(
    blockaidError || quoteFetchError || isNoQuotesAvailable,
  );
  const hasValidAmount = Boolean(usdAmount && Number(usdAmount) > 0);

  const isConfirmDisabled =
    !hasValidAmount ||
    isSetupLoading ||
    (isQuoteLoading && !activeQuote) ||
    hasInsufficientBalance ||
    !hasSufficientGas ||
    isSubmittingTx ||
    hasError ||
    !walletAddress;

  const getButtonLabel = () => {
    if (isSetupLoading) return strings('social_leaderboard.quick_buy.loading');
    if (hasInsufficientBalance) return strings('bridge.insufficient_funds');
    if (!hasSufficientGas) return strings('bridge.insufficient_gas');
    if (isSubmittingTx) return strings('bridge.submitting_transaction');
    if (hasError) return strings('social_leaderboard.quick_buy.unavailable');
    return strings('social_leaderboard.trader_position.buy');
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      isInteractable={!isSubmittingTx}
      onClose={handleClose}
    >
      {/* Header: Token image + title + market cap + close button — h-20 p-4 gap-4 */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
        twClassName="h-20 px-4"
      >
        {/* Token image — 48x48 rounded-xl (12px) */}
        <Box twClassName="w-12 h-12 rounded-xl overflow-hidden">
          <AvatarToken
            name={position.tokenSymbol}
            imageSource={
              destToken?.image ? { uri: destToken.image } : undefined
            }
            size={AvatarSize.Lg}
          />
        </Box>
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.HeadingSm}
            fontWeight={FontWeight.Bold}
            color={TextColor.TextDefault}
          >
            {strings('social_leaderboard.quick_buy.title', {
              symbol: position.tokenSymbol,
            })}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('social_leaderboard.quick_buy.market_cap_label')}
          </Text>
        </Box>
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          onPress={handleClose}
          testID="quick-buy-close-button"
        />
      </Box>

      {isUnsupportedChain ? (
        <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.quick_buy.unsupported_chain')}
          </Text>
        </Box>
      ) : (
        <>
          {/* Amount area — py-12 (48px), centered, gap-1 */}
          <TouchableOpacity
            onPress={handleAmountAreaPress}
            activeOpacity={1}
            testID="quick-buy-amount-area"
          >
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              gap={1}
              twClassName="py-12"
            >
              <Text
                style={styles.amountText}
                fontWeight={FontWeight.Bold}
                color={
                  usdAmount ? TextColor.TextDefault : TextColor.TextAlternative
                }
              >
                {`$${usdAmount || '0'}`}
              </Text>

              {/* Estimated receive amount — always visible */}
              {isQuoteLoading && hasValidAmount ? (
                <ActivityIndicator
                  size="small"
                  color={colors.text.alternative}
                />
              ) : (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {estimatedReceiveAmount
                    ? `${estimatedReceiveAmount} ${position.tokenSymbol}`
                    : hasError && hasValidAmount
                      ? strings('social_leaderboard.quick_buy.no_quotes')
                      : `0 ${position.tokenSymbol}`}
                </Text>
              )}

              {/* Hidden TextInput for keyboard capture */}
              <TextInput
                ref={hiddenInputRef}
                value={usdAmount}
                onChangeText={handleAmountChange}
                keyboardType="decimal-pad"
                returnKeyType="done"
                style={styles.hiddenInput}
                testID="quick-buy-amount-input"
              />
            </Box>
          </TouchableOpacity>

          {/* Footer auto-layout */}
          <Box twClassName="w-full">
            {/* Preset pills — pt-4 pb-6 px-4, gap-3 (12px) */}
            <Box twClassName="pt-4 pb-6 px-4">
              <Box flexDirection={BoxFlexDirection.Row} gap={3}>
                {USD_PRESETS.map((preset) => (
                  <Box key={preset} twClassName="flex-1">
                    <Button
                      variant={
                        usdAmount === preset
                          ? ButtonVariant.Primary
                          : ButtonVariant.Secondary
                      }
                      size={ButtonBaseSize.Md}
                      onPress={() => handlePresetPress(preset)}
                      isFullWidth
                      testID={`quick-buy-preset-${preset}`}
                    >
                      {`$${preset}`}
                    </Button>
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Footer details — px-4, gap-6 (24px) between sections, gap-4 (16px) between rows */}
            <Box twClassName="px-4 pb-6" gap={6}>
              <Box gap={4}>
                {/* Pay with row */}
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {strings('social_leaderboard.quick_buy.pay_with')}
                  </Text>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={2}
                  >
                    <AvatarToken
                      name={sourceToken?.symbol ?? ''}
                      imageSource={
                        sourceToken?.image
                          ? { uri: sourceToken.image }
                          : undefined
                      }
                      size={AvatarSize.Xs}
                    />
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextDefault}
                    >
                      {sourceToken?.symbol ?? ''}
                    </Text>
                    {sourceBalanceFiat && (
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.TextAlternative}
                      >
                        {`(${sourceBalanceFiat})`}
                      </Text>
                    )}
                    <Icon
                      name={IconName.ArrowRight}
                      size={IconSize.Sm}
                      color={colors.icon.alternative}
                    />
                  </Box>
                </Box>

                {/* Total row */}
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={2}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings('social_leaderboard.quick_buy.total')}
                    </Text>
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Sm}
                      color={colors.icon.alternative}
                    />
                  </Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                  >
                    {`$${usdAmount || '0'}`}
                  </Text>
                </Box>

                {/* Est. points row */}
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={2}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {strings('social_leaderboard.quick_buy.est_points')}
                    </Text>
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Sm}
                      color={colors.icon.alternative}
                    />
                  </Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                  >
                    0
                  </Text>
                </Box>
              </Box>

              {/* Buy button — full width */}
              <Button
                variant={ButtonVariant.Primary}
                size={ButtonBaseSize.Lg}
                isFullWidth
                isDisabled={isConfirmDisabled}
                isLoading={
                  isSubmittingTx ||
                  (isQuoteLoading && !activeQuote && hasValidAmount)
                }
                onPress={handleConfirm}
                testID="quick-buy-confirm-button"
              >
                {getButtonLabel()}
              </Button>
            </Box>
          </Box>
        </>
      )}
    </BottomSheet>
  );
};

/**
 * Outer gate component — only mounts the inner sheet when visible.
 * This prevents the bridge hooks from running on an empty Redux state,
 * which causes reselect stability warnings.
 */
const QuickBuyBottomSheet: React.FC<QuickBuyBottomSheetProps> = ({
  isVisible,
  position,
  onClose,
}) => {
  if (!isVisible || !position) return null;
  return <QuickBuyBottomSheetInner position={position} onClose={onClose} />;
};

export default QuickBuyBottomSheet;
