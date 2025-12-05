import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ScreenView from '../../../../Base/ScreenView';
import {
  MAX_INPUT_LENGTH,
  TokenInputArea,
  TokenInputAreaType,
} from '../../components/TokenInputArea';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { Box } from '../../../Box/Box';
import { FlexDirection, AlignItems } from '../../../Box/box.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  getDecimalChainId,
  getNetworkImageSource,
} from '../../../../../util/networks';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import {
  selectSourceAmount,
  selectSelectedDestChainId,
  setSourceAmount,
  setSourceAmountAsMax,
  selectIsMaxSourceAmount,
  resetBridgeState,
  selectDestToken,
  selectSourceToken,
  selectBridgeControllerState,
  selectIsEvmNonEvmBridge,
  selectIsSubmittingTx,
  setIsSubmittingTx,
  selectDestAddress,
  selectIsSolanaSourced,
  selectBridgeViewMode,
  setBridgeViewMode,
  selectNoFeeAssets,
  selectIsNonEvmNonEvmBridge,
  selectIsSelectingRecipient,
} from '../../../../../core/redux/slices/bridge';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { getBridgeNavbar } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import QuoteDetailsCard from '../../components/QuoteDetailsCard';
import { useBridgeQuoteRequest } from '../../hooks/useBridgeQuoteRequest';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { createStyles } from './BridgeView.styles';
import { useInitialSourceToken } from '../../hooks/useInitialSourceToken';
import { useInitialDestToken } from '../../hooks/useInitialDestToken';
import { useGasFeeEstimates } from '../../../../Views/confirmations/hooks/gas/useGasFeeEstimates';
import { selectSelectedNetworkClientId } from '../../../../../selectors/networkController';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { BridgeToken, BridgeViewMode } from '../../types';
import { useSwitchTokens } from '../../hooks/useSwitchTokens';
import { ScrollView } from 'react-native';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../util/address';
import { endTrace, TraceName } from '../../../../../util/trace.ts';
import { useInitialSlippage } from '../../hooks/useInitialSlippage/index.ts';
import { useHasSufficientGas } from '../../hooks/useHasSufficientGas/index.ts';
import { useRecipientInitialization } from '../../hooks/useRecipientInitialization';
import ApprovalTooltip from '../../components/ApprovalText';
import { RootState } from '../../../../../reducers/index.ts';
import { BRIDGE_MM_FEE_RATE } from '@metamask/bridge-controller';
import { isNullOrUndefined, Hex } from '@metamask/utils';
import { useBridgeQuoteEvents } from '../../hooks/useBridgeQuoteEvents/index.ts';
import { SwapsKeypad } from '../../components/SwapsKeypad/index.tsx';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { FLipQuoteButton } from '../../components/FlipQuoteButton/index.tsx';
import { useIsGasIncludedSTXSendBundleSupported } from '../../hooks/useIsGasIncludedSTXSendBundleSupported/index.ts';
import { useIsGasIncluded7702Supported } from '../../hooks/useIsGasIncluded7702Supported/index.ts';

export interface BridgeRouteParams {
  sourcePage: string;
  bridgeViewMode: BridgeViewMode;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
  sourceAmount?: string;
}

const BridgeView = () => {
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isErrorBannerVisible, setIsErrorBannerVisible] = useState(true);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const isSelectingRecipient = useSelector(selectIsSelectingRecipient);

  const { styles } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const { colors } = useTheme();
  const { submitBridgeTx } = useSubmitBridgeTx();
  const { trackEvent, createEventBuilder } = useMetrics();

  // Needed to get gas fee estimates
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  useGasFeeEstimates(selectedNetworkClientId);

  const sourceAmount = useSelector(selectSourceAmount);
  const isMaxSourceAmount = useSelector(selectIsMaxSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const destChainId = useSelector(selectSelectedDestChainId);
  const destAddress = useSelector(selectDestAddress);
  const bridgeViewMode = useSelector(selectBridgeViewMode);
  const { quotesLastFetched } = useSelector(selectBridgeControllerState);
  const { handleSwitchTokens } = useSwitchTokens();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isHardwareAddress = selectedAddress
    ? !!isHardwareAccount(selectedAddress)
    : false;
  const noFeeDestAssets = useSelector((state: RootState) =>
    selectNoFeeAssets(state, destToken?.chainId),
  );

  const isEvmNonEvmBridge = useSelector(selectIsEvmNonEvmBridge);
  const isNonEvmNonEvmBridge = useSelector(selectIsNonEvmNonEvmBridge);
  const isSolanaSourced = useSelector(selectIsSolanaSourced);
  // inputRef is used to programmatically blur the input field after a delay
  // This gives users time to type before the keyboard disappears
  // The ref is typed to only expose the blur method we need
  const inputRef = useRef<{ blur: () => void }>(null);

  const updateQuoteParams = useBridgeQuoteRequest();

  // Update isGasIncludedSTXSendBundleSupported state based on source chain capabilities
  useIsGasIncludedSTXSendBundleSupported(sourceToken?.chainId);

  // Update isGasIncluded7702Supported state
  useIsGasIncluded7702Supported(sourceToken?.chainId);

  const initialSourceToken = route.params?.sourceToken;
  const initialSourceAmount = route.params?.sourceAmount;
  const initialDestToken = route.params?.destToken;
  useInitialSourceToken(initialSourceToken, initialSourceAmount);
  useInitialDestToken(initialSourceToken, initialDestToken);

  // Initialize recipient account
  const hasInitializedRecipient = useRef(false);
  useRecipientInitialization(hasInitializedRecipient);

  useEffect(() => {
    if (route.params?.bridgeViewMode && bridgeViewMode === undefined) {
      dispatch(setBridgeViewMode(route.params?.bridgeViewMode));
    }
  }, [route.params?.bridgeViewMode, dispatch, bridgeViewMode]);

  // End trace when component mounts
  useEffect(() => {
    endTrace({ name: TraceName.SwapViewLoaded, timestamp: Date.now() });
  }, []);

  useInitialSlippage();

  const hasDestinationPicker = isEvmNonEvmBridge || isNonEvmNonEvmBridge;

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
  });

  const {
    activeQuote,
    isLoading,
    destTokenAmount,
    quoteFetchError,
    isNoQuotesAvailable,
    isExpired,
    willRefresh,
    blockaidError,
    shouldShowPriceImpactWarning,
  } = useBridgeQuoteData({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;

  const hasValidBridgeInputs =
    isValidSourceAmount &&
    !!sourceToken &&
    !!destToken &&
    // Prevent quote fetching when destination address is not set
    // Destination address is only needed for EVM <> Non-EVM bridges, or Non-EVM <> Non-EVM bridges (when different)
    (!hasDestinationPicker || (hasDestinationPicker && Boolean(destAddress)));

  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });
  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const isGasFeesSponsoredNetworkEnabled = useSelector(
    getGasFeesSponsoredNetworkEnabled,
  );

  // Check if quote is sponsored: both tokens must be on the same chain and that chain must be sponsored
  const isQuoteSponsored = useMemo(() => {
    if (!sourceToken?.chainId || !destToken?.chainId) return false;
    // Both tokens must be on the same chain
    if (sourceToken.chainId !== destToken.chainId) return false;
    // Check if the chain is sponsored
    return isGasFeesSponsoredNetworkEnabled(sourceToken.chainId as Hex);
  }, [
    sourceToken?.chainId,
    destToken?.chainId,
    isGasFeesSponsoredNetworkEnabled,
  ]);

  const isSubmitDisabled =
    isLoading ||
    hasInsufficientBalance ||
    isSubmittingTx ||
    (isHardwareAddress && isSolanaSourced) ||
    !!blockaidError ||
    !hasSufficientGas;

  useBridgeQuoteEvents({
    hasInsufficientBalance,
    hasNoQuotesAvailable: isNoQuotesAvailable,
    hasInsufficientGas: !hasSufficientGas,
    hasTxAlert: Boolean(blockaidError),
    isSubmitDisabled,
    isPriceImpactWarningVisible: shouldShowPriceImpactWarning,
  });

  // Compute error state directly from dependencies
  const isError = isNoQuotesAvailable || quoteFetchError;

  // Primary condition for keypad visibility - when input is focused or we don't have valid inputs
  const shouldDisplayKeypad =
    isInputFocused || !hasValidBridgeInputs || (!activeQuote && !isError);
  // Hide quote whenever the keypad is displayed
  const shouldDisplayQuoteDetails = activeQuote && !shouldDisplayKeypad;

  // Update quote parameters when relevant state changes
  useEffect(() => {
    if (hasValidBridgeInputs) {
      updateQuoteParams();
    }
    return () => {
      updateQuoteParams.cancel();
    };
  }, [hasValidBridgeInputs, updateQuoteParams]);

  // Blur input when quotes have loaded
  useEffect(() => {
    if (!isLoading || activeQuote?.quote?.requestId) {
      setIsInputFocused(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  }, [isLoading, activeQuote?.quote?.requestId]);

  // Reset bridge state when component unmounts
  useEffect(
    () => () => {
      dispatch(resetBridgeState());
      // Clear bridge controller state if available
      if (Engine.context.BridgeController?.resetState) {
        Engine.context.BridgeController.resetState();
      }
    },
    [dispatch],
  );

  useEffect(() => {
    navigation.setOptions(getBridgeNavbar(navigation, bridgeViewMode, colors));
  }, [navigation, bridgeViewMode, colors]);

  const hasTrackedPageView = useRef(false);
  useEffect(() => {
    const shouldTrackPageView = sourceToken && !hasTrackedPageView.current;

    if (shouldTrackPageView) {
      hasTrackedPageView.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SWAP_PAGE_VIEWED)
          .addProperties({
            chain_id_source: getDecimalChainId(sourceToken.chainId),
            chain_id_destination: getDecimalChainId(destToken?.chainId),
            token_symbol_source: sourceToken.symbol,
            token_symbol_destination: destToken?.symbol,
            token_address_source: sourceToken.address,
            token_address_destination: destToken?.address,
          })
          .build(),
      );
    }
  }, [sourceToken, destToken, trackEvent, createEventBuilder, bridgeViewMode]);

  // Update isErrorBannerVisible when input focus changes
  useEffect(() => {
    if (isInputFocused) {
      setIsErrorBannerVisible(false);
    }
  }, [isInputFocused]);

  // Reset isErrorBannerVisible when error state changes
  useEffect(() => {
    if (isError) {
      setIsErrorBannerVisible(true);
    }
  }, [isError]);

  // Keypad already handles max token decimals, so we don't need to check here
  const handleKeypadChange = ({
    value,
  }: {
    value: string;
    valueAsNumber: number;
    pressedKey: string;
  }) => {
    if (value.length >= MAX_INPUT_LENGTH) {
      return;
    }
    dispatch(setSourceAmount(value || undefined));
  };

  const handleContinue = async () => {
    try {
      if (activeQuote) {
        dispatch(setIsSubmittingTx(true));
        await submitBridgeTx({
          quoteResponse: activeQuote,
        });
      }
    } catch (error) {
      console.error('Error submitting bridge tx', error);
    } finally {
      dispatch(setIsSubmittingTx(false));
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  };

  const handleSourceMaxPress = () => {
    if (latestSourceBalance?.displayBalance) {
      dispatch(setSourceAmountAsMax(latestSourceBalance.displayBalance));
    }
  };

  const handleSourceTokenPress = () =>
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
    });

  const handleDestTokenPress = () =>
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
    });

  const getButtonLabel = () => {
    if (hasInsufficientBalance) return strings('bridge.insufficient_funds');
    if (!hasSufficientGas) return strings('bridge.insufficient_gas');
    if (isSubmittingTx) return strings('bridge.submitting_transaction');

    return strings('bridge.confirm_swap');
  };

  useEffect(() => {
    if (isExpired && !willRefresh && !isSelectingRecipient) {
      setIsInputFocused(false);
      // open the quote tooltip modal
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
      });
    }
  }, [isExpired, willRefresh, navigation, isSelectingRecipient]);

  const renderBottomContent = (submitDisabled: boolean) => {
    if (shouldDisplayKeypad && !isLoading) {
      return (
        <Box style={styles.buttonContainer}>
          <Text color={TextColor.Alternative}>
            {strings('bridge.select_amount')}
          </Text>
        </Box>
      );
    }

    if (isLoading && !activeQuote) {
      return (
        <Box style={styles.buttonContainer}>
          <Text color={TextColor.Alternative}>
            {strings('bridge.fetching_quote')}
          </Text>
        </Box>
      );
    }

    if (isError && isErrorBannerVisible) {
      return (
        <Box style={styles.buttonContainer}>
          <BannerAlert
            severity={BannerAlertSeverity.Error}
            description={strings('bridge.error_banner_description')}
            onClose={() => {
              setIsErrorBannerVisible(false);
              setIsInputFocused(true);
            }}
          />
        </Box>
      );
    }

    // TODO: remove this once controller types are updated
    // @ts-expect-error: controller types are not up to date yet
    const quoteBpsFee = activeQuote?.quote?.feeData?.metabridge?.quoteBpsFee;
    const feePercentage = !isNullOrUndefined(quoteBpsFee)
      ? quoteBpsFee / 100
      : BRIDGE_MM_FEE_RATE;

    const hasFee = activeQuote && feePercentage > 0;

    const isNoFeeDestinationAsset =
      destToken?.address && noFeeDestAssets?.includes(destToken.address);

    const approval =
      activeQuote?.approval && sourceAmount && sourceToken
        ? { amount: sourceAmount, symbol: sourceToken.symbol }
        : null;

    return (
      activeQuote &&
      quotesLastFetched && (
        <Box style={styles.buttonContainer}>
          {isHardwareAddress && isSolanaSourced && (
            <BannerAlert
              severity={BannerAlertSeverity.Error}
              description={strings(
                'bridge.hardware_wallet_not_supported_solana',
              )}
            />
          )}
          {blockaidError && (
            <BannerAlert
              severity={BannerAlertSeverity.Error}
              title={strings('bridge.blockaid_error_title')}
              description={blockaidError}
            />
          )}

          {!shouldDisplayKeypad && (
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              label={getButtonLabel()}
              onPress={handleContinue}
              style={styles.button}
              testID="bridge-confirm-button"
              isDisabled={submitDisabled}
            />
          )}
          <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center}>
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {hasFee
                ? strings('bridge.fee_disclaimer', {
                    feePercentage,
                  })
                : !hasFee && isNoFeeDestinationAsset
                  ? strings('bridge.no_mm_fee_disclaimer', {
                      destTokenSymbol: destToken?.symbol,
                    })
                  : ''}
              {approval
                ? ` ${strings('bridge.approval_needed', approval)}`
                : ''}{' '}
            </Text>
            {approval && (
              <ApprovalTooltip
                amount={approval.amount}
                symbol={approval.symbol}
              />
            )}
          </Box>
        </Box>
      )
    );
  };

  return (
    // Need this to be full height of screen
    // @ts-expect-error The type is incorrect, this will work
    <ScreenView contentContainerStyle={styles.screen}>
      <Box style={styles.content}>
        <Box style={styles.inputsContainer}>
          <TokenInputArea
            ref={inputRef}
            amount={sourceAmount}
            isMaxAmount={isMaxSourceAmount}
            token={sourceToken}
            tokenBalance={latestSourceBalance?.displayBalance}
            networkImageSource={
              sourceToken?.chainId
                ? getNetworkImageSource({
                    chainId: sourceToken?.chainId,
                  })
                : undefined
            }
            testID="source-token-area"
            tokenType={TokenInputAreaType.Source}
            onTokenPress={handleSourceTokenPress}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onInputPress={() => setIsInputFocused(true)}
            onMaxPress={handleSourceMaxPress}
            latestAtomicBalance={latestSourceBalance?.atomicBalance}
            isSourceToken
            isQuoteSponsored={isQuoteSponsored}
          />
          <FLipQuoteButton
            onPress={handleSwitchTokens(destTokenAmount)}
            disabled={!destChainId || !destToken || !sourceToken}
          />
          <TokenInputArea
            amount={destTokenAmount}
            token={destToken}
            networkImageSource={
              destToken
                ? getNetworkImageSource({ chainId: destToken?.chainId })
                : undefined
            }
            testID="dest-token-area"
            tokenType={TokenInputAreaType.Destination}
            onTokenPress={handleDestTokenPress}
            isLoading={!destTokenAmount && isLoading}
            style={styles.destTokenArea}
            isQuoteSponsored={isQuoteSponsored}
          />
        </Box>

        {/* Scrollable Dynamic Content */}
        <ScrollView
          testID="bridge-view-scroll"
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <Box style={styles.dynamicContent}>
            {shouldDisplayQuoteDetails ? (
              <Box style={styles.quoteContainer}>
                <QuoteDetailsCard />
              </Box>
            ) : shouldDisplayKeypad ? (
              <SwapsKeypad
                value={sourceAmount || '0'}
                onChange={handleKeypadChange}
                currency={sourceToken?.symbol || 'ETH'}
                decimals={sourceToken?.decimals || 18}
                token={sourceToken}
                tokenBalance={latestSourceBalance}
                onMaxPress={handleSourceMaxPress}
              />
            ) : null}
          </Box>
        </ScrollView>
        {renderBottomContent(isSubmitDisabled)}
      </Box>
    </ScreenView>
  );
};

export default BridgeView;
