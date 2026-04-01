import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ScreenView from '../../../../Base/ScreenView';
import {
  MAX_INPUT_LENGTH,
  TokenInputArea,
  TokenInputAreaRef,
  TokenInputAreaType,
} from '../../components/TokenInputArea';
import { useStyles } from '../../../../../component-library/hooks';
import { Box } from '@metamask/design-system-react-native';
import { getNetworkImageSource } from '../../../../../util/networks';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import {
  selectSourceAmount,
  selectSelectedDestChainId,
  setSourceAmount,
  setSourceAmountAsMax,
  resetBridgeState,
  selectDestToken,
  selectSourceToken,
  selectIsEvmNonEvmBridge,
  selectIsSubmittingTx,
  selectDestAddress,
  selectIsSolanaSourced,
  selectBridgeViewMode,
  setBridgeViewMode,
  selectIsNonEvmNonEvmBridge,
  selectDestTokenWarning,
  selectQuoteStreamComplete,
} from '../../../../../core/redux/slices/bridge';
import { TokenFeatureType } from '@metamask/bridge-controller';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import BannerBase from '../../../../../component-library/components/Banners/Banner/foundation/BannerBase';
import { TokenWarningModalMode } from '../../components/TokenWarningModal/constants';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
  type RouteProp,
} from '@react-navigation/native';
import { getBridgeNavbar } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import QuoteDetailsCard from '../../components/QuoteDetailsCard';
import QuoteDetailsCardSkeleton from '../../components/QuoteDetailsCard/QuoteDetailsCardSkeleton';
import { useBridgeQuoteRequest } from '../../hooks/useBridgeQuoteRequest';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { createStyles } from './BridgeView.styles';
import { useInitialSourceToken } from '../../hooks/useInitialSourceToken';
import { useInitialDestToken } from '../../hooks/useInitialDestToken';
import { useGasFeeEstimates } from '../../../../Views/confirmations/hooks/gas/useGasFeeEstimates';
import { selectSelectedNetworkClientId } from '../../../../../selectors/networkController';
import { useIsNetworkEnabled } from '../../hooks/useIsNetworkEnabled';
import { useSwitchTokens } from '../../hooks/useSwitchTokens';
import {
  Pressable,
  ScrollView,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../util/address';
import { endTrace, TraceName } from '../../../../../util/trace.ts';
import { useInitialSlippage } from '../../hooks/useInitialSlippage/index.ts';
import { useHasSufficientGas } from '../../hooks/useHasSufficientGas/index.ts';
import { useRecipientInitialization } from '../../hooks/useRecipientInitialization';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { Hex } from '@metamask/utils';
import { useBridgeQuoteEvents } from '../../hooks/useBridgeQuoteEvents/index.ts';
import { SwapsKeypad } from '../../components/SwapsKeypad/index.tsx';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import { normalizeSourceAmountToMaxLength } from '../../utils/normalizeSourceAmountToMaxLength.ts';
import { FLipQuoteButton } from '../../components/FlipQuoteButton/index.tsx';
import { useIsGasIncludedSTXSendBundleSupported } from '../../hooks/useIsGasIncludedSTXSendBundleSupported/index.ts';
import { useIsGasIncluded7702Supported } from '../../hooks/useIsGasIncluded7702Supported/index.ts';
import { useRefreshSmartTransactionsLiveness } from '../../../../hooks/useRefreshSmartTransactionsLiveness';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';
import { SwapsKeypadRef } from '../../components/SwapsKeypad/types.ts';
import { GaslessQuickPickOptions } from '../../components/GaslessQuickPickOptions/index.tsx';
import { SwapsConfirmButton } from '../../components/SwapsConfirmButton/index.tsx';
import { useBridgeViewOnFocus } from '../../hooks/useBridgeViewOnFocus/index.ts';
import { type BridgeRouteParams } from '../../hooks/useSwapBridgeNavigation/index.ts';
import BridgeTrendingTokensSection from '../../components/BridgeTrendingTokensSection/BridgeTrendingTokensSection';
import { selectRemoteFeatureFlags } from '../../../../../selectors/featureFlagController';
import type { RootState } from '../../../../../reducers';
import { useTrackSwapPageViewed } from '../../hooks/useTrackSwapPageViewed/index.ts';
import { useSourceAmountCursor } from '../../hooks/useSourceAmountCursor.ts';
import { BridgeViewFooter } from './BridgeViewFooter.tsx';
import { getQuoteStreamReasonString } from './BridgeView.utils';

const SCROLL_NEAR_BOTTOM_PX = 160;

const BridgeView = () => {
  const [isNearBottom, setIsNearBottom] = useState(false);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);

  // Inline selector because this is a temporary feature flag
  // TODO: Remove this once trending tokens feature is prod hardened
  const isSwapsTrendingTokensEnabled = useSelector(
    (state: RootState) =>
      selectRemoteFeatureFlags(state).swapsTrendingTokens === true,
  );

  const { styles } = useStyles(createStyles);
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const { colors } = useTheme();
  const keypadRef = useRef<SwapsKeypadRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Needed to get gas fee estimates
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  useGasFeeEstimates(selectedNetworkClientId);

  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const destChainId = useSelector(selectSelectedDestChainId);
  const destAddress = useSelector(selectDestAddress);
  const bridgeViewMode = useSelector(selectBridgeViewMode);
  const { handleSwitchTokens } = useSwitchTokens();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isHardwareAddress = selectedAddress
    ? !!isHardwareAccount(selectedAddress)
    : false;

  const walletAddress = useSelector(selectSourceWalletAddress);

  const isEvmNonEvmBridge = useSelector(selectIsEvmNonEvmBridge);
  const isNonEvmNonEvmBridge = useSelector(selectIsNonEvmNonEvmBridge);
  const isSolanaSourced = useSelector(selectIsSolanaSourced);
  const tokenWarning = useSelector(selectDestTokenWarning);
  const quoteStreamComplete = useSelector(selectQuoteStreamComplete);
  const isDestNetworkEnabled = useIsNetworkEnabled(destToken?.chainId);
  const handleSourceAmountChange = useCallback(
    (value: string | undefined) => {
      dispatch(setSourceAmount(value));
    },
    [dispatch],
  );
  const {
    sourceSelection,
    handleSourceSelectionChange,
    handleKeypadChange,
    resetSourceAmountCursorPosition,
  } = useSourceAmountCursor({
    sourceAmount,
    sourceTokenDecimals: sourceToken?.decimals,
    maxInputLength: MAX_INPUT_LENGTH,
    onSourceAmountChange: handleSourceAmountChange,
  });

  /** The entry point location for analytics (e.g. Main View, Token View, Trending Explore) */
  const location = route.params?.location;

  // inputRef is used to programmatically blur the input field after a delay
  // This gives users time to type before the keyboard disappears
  // The ref is typed to only expose the blur method we need
  const inputRef = useRef<TokenInputAreaRef>(null);

  // Fetch STX liveness for the source chain
  useRefreshSmartTransactionsLiveness(sourceToken?.chainId);

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

  useBridgeViewOnFocus({ inputRef, keypadRef });

  // Scroll to top when navigating to the bridge view if requested
  useFocusEffect(
    useCallback(() => {
      if (route.params?.scrollToTopOnNav && scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
        navigation.setParams({ scrollToTopOnNav: undefined });
      }
    }, [navigation, route.params?.scrollToTopOnNav]),
  );

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
    balance: sourceToken?.balance,
  });

  const updateQuoteParams = useBridgeQuoteRequest({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const {
    activeQuote,
    isLoading,
    destTokenAmount,
    isNoQuotesAvailable,
    blockaidError,
    shouldShowPriceImpactWarning,
    needsNewQuote,
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
    (isLoading && !activeQuote) ||
    hasInsufficientBalance ||
    isSubmittingTx ||
    (isHardwareAddress && isSolanaSourced) ||
    !!blockaidError ||
    !hasSufficientGas ||
    !walletAddress;

  useBridgeQuoteEvents({
    hasInsufficientBalance,
    hasNoQuotesAvailable: isNoQuotesAvailable,
    hasInsufficientGas: !hasSufficientGas,
    hasTxAlert: Boolean(blockaidError),
    isSubmitDisabled,
    isPriceImpactWarningVisible: shouldShowPriceImpactWarning,
  });

  const isZeroState = !sourceAmount || !(Number(sourceAmount) > 0);

  // Update quote parameters when relevant state changes
  useEffect(() => {
    if (hasValidBridgeInputs) {
      updateQuoteParams();
    }
    return () => {
      updateQuoteParams.cancel();
    };
  }, [hasValidBridgeInputs, updateQuoteParams]);

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

  useTrackSwapPageViewed();

  const handleSourceMaxPress = () => {
    if (latestSourceBalance?.displayBalance) {
      const balance = latestSourceBalance.displayBalance;
      const cleaned = normalizeSourceAmountToMaxLength(
        balance,
        MAX_INPUT_LENGTH,
      );
      resetSourceAmountCursorPosition();
      dispatch(setSourceAmountAsMax(cleaned));
    }
  };

  const handleSourcePresetAmountSelect = useCallback(
    (value: string) => {
      // Quick-pick presets replace the full amount rather than editing at the
      // current cursor position, so clear the cursor state before updating.
      resetSourceAmountCursorPosition();
      dispatch(
        setSourceAmount(
          normalizeSourceAmountToMaxLength(value, MAX_INPUT_LENGTH) ||
            undefined,
        ),
      );
    },
    [dispatch, resetSourceAmountCursorPosition],
  );

  const handleSourceTokenPress = () =>
    navigation.navigate(Routes.BRIDGE.TOKEN_SELECTOR, {
      type: 'source',
    });

  const handleFlipTokensPress = useCallback(() => {
    resetSourceAmountCursorPosition();
    void handleSwitchTokens(destTokenAmount)();
  }, [destTokenAmount, handleSwitchTokens, resetSourceAmountCursorPosition]);

  const handleDestTokenPress = () =>
    navigation.navigate(Routes.BRIDGE.TOKEN_SELECTOR, {
      type: 'dest',
    });

  const getContentMode = () => {
    if (isLoading && !activeQuote && !needsNewQuote) return 'loading';
    if (isZeroState) return 'zero';
    return 'quote';
  };
  const contentMode = getContentMode();

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;
      setIsNearBottom(
        contentOffset.y + layoutMeasurement.height >=
          contentSize.height - SCROLL_NEAR_BOTTOM_PX,
      );
    },
    [],
  );

  return (
    // Need this to be full height of screen
    // @ts-expect-error The type is incorrect, this will work
    <ScreenView contentContainerStyle={styles.screen}>
      <Box
        style={styles.content}
        onStartShouldSetResponder={() =>
          !(contentMode === 'zero' && isSwapsTrendingTokensEnabled)
        }
        onResponderRelease={() => {
          inputRef.current?.blur();
          keypadRef.current?.close();
        }}
      >
        <ScrollView
          ref={scrollViewRef}
          testID={BridgeViewSelectorsIDs.BRIDGE_VIEW_SCROLL}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={isSwapsTrendingTokensEnabled ? handleScroll : undefined}
        >
          <Box style={styles.inputsContainer}>
            <TokenInputArea
              ref={inputRef}
              amount={sourceAmount}
              selection={sourceSelection}
              token={sourceToken}
              tokenBalance={latestSourceBalance?.displayBalance}
              networkImageSource={
                sourceToken?.chainId
                  ? getNetworkImageSource({
                      chainId: sourceToken?.chainId,
                    })
                  : undefined
              }
              testID={BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA}
              tokenType={TokenInputAreaType.Source}
              onInputPress={() => keypadRef.current?.open()}
              onSelectionChange={handleSourceSelectionChange}
              onTokenPress={handleSourceTokenPress}
              onMaxPress={handleSourceMaxPress}
              latestAtomicBalance={latestSourceBalance?.atomicBalance}
              isSourceToken
              isQuoteSponsored={isQuoteSponsored}
            />
            <FLipQuoteButton
              onPress={handleFlipTokensPress}
              disabled={
                !destChainId ||
                !destToken ||
                !sourceToken ||
                !isDestNetworkEnabled
              }
            />
            <TokenInputArea
              amount={destTokenAmount}
              token={destToken}
              networkImageSource={
                destToken
                  ? getNetworkImageSource({ chainId: destToken?.chainId })
                  : undefined
              }
              testID={BridgeViewSelectorsIDs.DESTINATION_TOKEN_AREA}
              tokenType={TokenInputAreaType.Destination}
              onInputPress={() => keypadRef.current?.close()}
              onTokenPress={handleDestTokenPress}
              isLoading={!destTokenAmount && isLoading}
              style={styles.destTokenArea}
              isQuoteSponsored={isQuoteSponsored}
            />
          </Box>

          <Box gap={3} twClassName="mx-4">
            {quoteStreamComplete?.reason
              ? (() => {
                  const quoteStreamErrorBannerStyle = {
                    borderLeftWidth: 4,
                    borderColor: colors.error.default,
                    backgroundColor: colors.error.muted,
                    paddingLeft: 8,
                  };
                  return (
                    <BannerBase
                      style={quoteStreamErrorBannerStyle}
                      startAccessory={
                        <Icon
                          name={IconName.Danger}
                          color={colors.error.default}
                          size={IconSize.Lg}
                        />
                      }
                      description={getQuoteStreamReasonString(
                        quoteStreamComplete.reason,
                      )}
                    />
                  );
                })()
              : null}

            {contentMode === 'quote' && tokenWarning
              ? (() => {
                  const isMalicious =
                    tokenWarning.type === TokenFeatureType.MALICIOUS;
                  const bannerColors = isMalicious
                    ? colors.error
                    : colors.warning;
                  const bannerStyle = {
                    borderLeftWidth: 4,
                    borderColor: bannerColors.default,
                    backgroundColor: bannerColors.muted,
                    paddingLeft: 8,
                  };
                  const navigateToModal = () =>
                    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
                      screen: Routes.BRIDGE.MODALS.TOKEN_WARNING_MODAL,
                      params: {
                        warningType: tokenWarning.type,
                        description: tokenWarning.description,
                        mode: TokenWarningModalMode.Info,
                        location,
                      },
                    });
                  return (
                    <Pressable onPress={navigateToModal}>
                      <BannerBase
                        style={bannerStyle}
                        startAccessory={
                          <Icon
                            name={
                              isMalicious ? IconName.Danger : IconName.Warning
                            }
                            color={bannerColors.default}
                            size={IconSize.Lg}
                          />
                        }
                        description={
                          isMalicious
                            ? strings('bridge.token_warning_malicious_banner', {
                                token: destToken?.symbol,
                              })
                            : strings(
                                'bridge.token_warning_suspicious_banner',
                                {
                                  token: destToken?.symbol,
                                },
                              )
                        }
                        onClose={navigateToModal}
                        closeButtonProps={{ iconName: IconName.ArrowRight }}
                      />
                    </Pressable>
                  );
                })()
              : null}
          </Box>

          <Box style={styles.dynamicContent}>
            {contentMode === 'loading' ? (
              <Box style={styles.loadingContainer}>
                <QuoteDetailsCardSkeleton />
              </Box>
            ) : null}
            {contentMode === 'quote' ? (
              <Box style={styles.quoteContainer}>
                <QuoteDetailsCard
                  location={location}
                  hasInsufficientBalance={hasInsufficientBalance}
                />
              </Box>
            ) : null}
            {contentMode === 'zero' && isSwapsTrendingTokensEnabled ? (
              <BridgeTrendingTokensSection isNearBottom={isNearBottom} />
            ) : null}
          </Box>
        </ScrollView>

        <BridgeViewFooter
          location={location}
          latestSourceBalance={latestSourceBalance}
        />

        <SwapsKeypad
          ref={keypadRef}
          value={sourceAmount || '0'}
          onChange={handleKeypadChange}
          currency={sourceToken?.symbol || 'ETH'}
          decimals={sourceToken?.decimals ?? Infinity}
        >
          {sourceAmount && sourceAmount !== '0' ? (
            <SwapsConfirmButton
              location={location}
              latestSourceBalance={latestSourceBalance}
              testID={BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD}
            />
          ) : (
            <GaslessQuickPickOptions
              token={sourceToken}
              tokenBalance={latestSourceBalance?.displayBalance}
              onMaxPress={handleSourceMaxPress}
              isQuoteSponsored={isQuoteSponsored}
              onAmountSelect={handleSourcePresetAmountSelect}
            />
          )}
        </SwapsKeypad>
      </Box>
    </ScreenView>
  );
};

export default BridgeView;
