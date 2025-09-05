import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ScreenView from '../../../../Base/ScreenView';
import Keypad from '../../../../Base/Keypad';
import {
  MAX_INPUT_LENGTH,
  TokenInputArea,
  TokenInputAreaType,
} from '../../components/TokenInputArea';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../component-library/hooks';
import { Box } from '../../../Box/Box';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import {
  getDecimalChainId,
  getNetworkImageSource,
} from '../../../../../util/networks';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import {
  selectSourceAmount,
  selectSelectedDestChainId,
  setSourceAmount,
  resetBridgeState,
  selectDestToken,
  selectSourceToken,
  selectBridgeControllerState,
  selectIsEvmSolanaBridge,
  selectIsSubmittingTx,
  setIsSubmittingTx,
  selectDestAddress,
  selectIsSolanaSourced,
  selectBridgeViewMode,
  setBridgeViewMode,
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
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import QuoteDetailsCard from '../../components/QuoteDetailsCard';
import { useBridgeQuoteRequest } from '../../hooks/useBridgeQuoteRequest';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import DestinationAccountSelector from '../../components/DestinationAccountSelector.tsx';
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
import ApprovalText from '../../components/ApprovalText';
import { BigNumber } from 'bignumber.js';

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

  const isEvmSolanaBridge = useSelector(selectIsEvmSolanaBridge);
  const isSolanaSourced = useSelector(selectIsSolanaSourced);
  // inputRef is used to programmatically blur the input field after a delay
  // This gives users time to type before the keyboard disappears
  // The ref is typed to only expose the blur method we need
  const inputRef = useRef<{ blur: () => void }>(null);

  const updateQuoteParams = useBridgeQuoteRequest();

  const initialSourceToken = route.params?.sourceToken;
  const initialSourceAmount = route.params?.sourceAmount;
  const initialDestToken = route.params?.destToken;
  useInitialSourceToken(initialSourceToken, initialSourceAmount);
  useInitialDestToken(initialSourceToken, initialDestToken);

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

  const hasDestinationPicker = isEvmSolanaBridge;

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
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
  } = useBridgeQuoteData({
    latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const hasQuoteDetails = activeQuote && !isLoading;

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;

  const hasValidBridgeInputs =
    isValidSourceAmount &&
    !!sourceToken &&
    !!destToken &&
    // Prevent quote fetching when destination address is not set
    // Destinations address is only needed for EVM <> Solana bridges
    (!isEvmSolanaBridge || (isEvmSolanaBridge && !!destAddress));

  const hasSufficientGas = useHasSufficientGas({ quote: activeQuote });
  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });

  const shouldDisplayQuoteDetails = hasQuoteDetails && !isInputFocused;

  // Compute error state directly from dependencies
  const isError = isNoQuotesAvailable || quoteFetchError;

  // Primary condition for keypad visibility - when input is focused or we don't have valid inputs
  const shouldDisplayKeypad =
    isInputFocused || !hasValidBridgeInputs || (!activeQuote && !isError);

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
    if (!isLoading) {
      setIsInputFocused(false);
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  }, [isLoading]);

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

    const isSwap = sourceToken?.chainId === destToken?.chainId;
    return isSwap
      ? strings('bridge.confirm_swap')
      : strings('bridge.confirm_bridge');
  };

  useEffect(() => {
    if (isExpired && !willRefresh) {
      setIsInputFocused(false);
      // open the quote tooltip modal
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.QUOTE_EXPIRED_MODAL,
      });
    }
  }, [isExpired, willRefresh, navigation]);

  const renderBottomContent = () => {
    if (shouldDisplayKeypad && !isLoading) {
      return (
        <Box style={styles.buttonContainer}>
          <Text color={TextColor.Alternative}>
            {strings('bridge.select_amount')}
          </Text>
        </Box>
      );
    }

    if (isLoading) {
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

    const hasFee =
      activeQuote &&
      new BigNumber(activeQuote.quote.feeData.metabridge.amount).gt(0);

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
          {hasFee ? (
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.disclaimerText}
            >
              {strings('bridge.fee_disclaimer')}
            </Text>
          ) : null}
          <Button
            variant={ButtonVariants.Primary}
            label={getButtonLabel()}
            onPress={handleContinue}
            style={styles.button}
            isDisabled={
              hasInsufficientBalance ||
              isSubmittingTx ||
              (isHardwareAddress && isSolanaSourced) ||
              !!blockaidError ||
              !hasSufficientGas
            }
          />
          {activeQuote?.approval && sourceAmount && sourceToken && (
            <ApprovalText amount={sourceAmount} symbol={sourceToken.symbol} />
          )}
        </Box>
      )
    );
  };

  return (
    // Need this to be full height of screen
    // @ts-expect-error The type is incorrect, this will work
    <ScreenView contentContainerStyle={styles.screen}>
      <Box style={styles.content}>
        <Box style={styles.inputsContainer} gap={8}>
          <TokenInputArea
            ref={inputRef}
            amount={sourceAmount}
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
            onMaxPress={() => {
              if (latestSourceBalance?.displayBalance) {
                dispatch(setSourceAmount(latestSourceBalance.displayBalance));
              }
            }}
            latestAtomicBalance={latestSourceBalance?.atomicBalance}
          />
          <Box style={styles.arrowContainer}>
            <Box style={styles.arrowCircle}>
              <ButtonIcon
                iconName={IconName.Arrow2Down}
                onPress={handleSwitchTokens}
                disabled={!destChainId || !destToken}
                testID="arrow-button"
              />
            </Box>
          </Box>
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
            isLoading={isLoading}
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
            <Box style={styles.destinationAccountSelectorContainer}>
              {hasDestinationPicker && <DestinationAccountSelector />}
            </Box>

            {shouldDisplayQuoteDetails ? (
              <Box style={styles.quoteContainer}>
                <QuoteDetailsCard />
              </Box>
            ) : shouldDisplayKeypad ? (
              <Box
                style={[
                  styles.keypadContainer,
                  hasDestinationPicker &&
                    styles.keypadContainerWithDestinationPicker,
                ]}
              >
                <Keypad
                  style={styles.keypad}
                  value={sourceAmount || '0'}
                  onChange={handleKeypadChange}
                  currency={sourceToken?.symbol || 'ETH'}
                  decimals={sourceToken?.decimals || 18}
                />
              </Box>
            ) : null}
          </Box>
        </ScrollView>
        {renderBottomContent()}
      </Box>
    </ScreenView>
  );
};

export default BridgeView;
