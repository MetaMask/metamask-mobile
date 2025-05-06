import React, { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import ScreenView from '../../../../Base/ScreenView';
import Keypad from '../../../../Base/Keypad';
import {
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
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
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
  selectIsSolanaSwap,
  setSlippage,
  selectIsSubmittingTx,
  setIsSubmittingTx,
  selectIsSolanaToEvm,
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
import type { BridgeSourceTokenSelectorRouteParams } from '../../components/BridgeSourceTokenSelector';
import type { BridgeDestTokenSelectorRouteParams } from '../../components/BridgeDestTokenSelector';
import { useGasFeeEstimates } from '../../../../Views/confirmations/hooks/gas/useGasFeeEstimates';
import { selectSelectedNetworkClientId } from '../../../../../selectors/networkController';
import { useMetrics, MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { BridgeToken, BridgeViewMode } from '../../types';
import { useSwitchTokens } from '../../hooks/useSwitchTokens';

export interface BridgeRouteParams {
  token?: BridgeToken;
  sourcePage: string;
  bridgeViewMode: BridgeViewMode;
}

const BridgeView = () => {
  const [isInputFocused, setIsInputFocused] = useState(false);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);

  // Ref necessary to avoid race condition between Redux state and component state
  // Without it, the component would reset the bridge state when it shouldn't
  const isSubmittingTxRef = useRef(isSubmittingTx);

  // Update ref when Redux state changes
  useEffect(() => {
    isSubmittingTxRef.current = isSubmittingTx;
  }, [isSubmittingTx]);

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
  const {
    activeQuote,
    isLoading,
    destTokenAmount,
    quoteFetchError,
    isNoQuotesAvailable,
    isExpired,
    willRefresh,
  } = useBridgeQuoteData();
  const { quoteRequest, quotesLastFetched } = useSelector(
    selectBridgeControllerState,
  );
  const { handleSwitchTokens } = useSwitchTokens();

  const isEvmSolanaBridge = useSelector(selectIsEvmSolanaBridge);
  const isSolanaSwap = useSelector(selectIsSolanaSwap);
  const isSolanaToEvm = useSelector(selectIsSolanaToEvm);
  // inputRef is used to programmatically blur the input field after a delay
  // This gives users time to type before the keyboard disappears
  // The ref is typed to only expose the blur method we need
  const inputRef = useRef<{ blur: () => void }>(null);

  const updateQuoteParams = useBridgeQuoteRequest();

  const initialSourceToken = route.params?.token;
  useInitialSourceToken(initialSourceToken);
  useInitialDestToken(initialSourceToken);

  // Set slippage to undefined for Solana swaps
  useEffect(() => {
    if (isSolanaSwap) {
      dispatch(setSlippage(undefined));
    }
  }, [isSolanaSwap, dispatch]);

  const hasDestinationPicker = isEvmSolanaBridge;

  const hasQuoteDetails = activeQuote && !isLoading;

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
  });

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;

  const hasValidBridgeInputs =
    isValidSourceAmount && !!sourceToken && !!destToken;

  const hasInsufficientBalance = quoteRequest?.insufficientBal;

  // Primary condition for keypad visibility - when input is focused or we don't have valid inputs
  const shouldDisplayKeypad =
    isInputFocused || !hasValidBridgeInputs || !activeQuote;
  const shouldDisplayQuoteDetails = hasQuoteDetails && !isInputFocused;

  // Compute error state directly from dependencies
  const isError = isNoQuotesAvailable || quoteFetchError;

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
      // Only reset state if we're not in the middle of a transaction
      if (!isSubmittingTxRef.current) {
        dispatch(resetBridgeState());
        // Clear bridge controller state if available
        if (Engine.context.BridgeController?.resetState) {
          Engine.context.BridgeController.resetState();
        }
      }
    },
    [dispatch],
  );

  useEffect(() => {
    navigation.setOptions(getBridgeNavbar(navigation, route, colors));
  }, [navigation, route, colors]);

  const hasTrackedPageView = useRef(false);
  useEffect(() => {
    const shouldTrackPageView = sourceToken && !hasTrackedPageView.current;

    if (shouldTrackPageView) {
      hasTrackedPageView.current = true;
      trackEvent(
        createEventBuilder(
          route.params.bridgeViewMode === BridgeViewMode.Bridge
            ? MetaMetricsEvents.BRIDGE_PAGE_VIEWED
            : MetaMetricsEvents.SWAP_PAGE_VIEWED,
        )
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
  }, [
    sourceToken,
    destToken,
    trackEvent,
    createEventBuilder,
    route.params.bridgeViewMode,
  ]);

  const handleKeypadChange = ({
    value,
  }: {
    value: string;
    valueAsNumber: number;
    pressedKey: string;
  }) => {
    dispatch(setSourceAmount(value || undefined));
  };

  const handleContinue = async () => {
    if (activeQuote) {
      dispatch(setIsSubmittingTx(true));
      // TEMPORARY: If tx originates from Solana, navigate to transactions view BEFORE submitting the tx
      // Necessary because snaps prevents navigation after tx is submitted
      if (isSolanaSwap || isSolanaToEvm) {
        navigation.navigate(Routes.TRANSACTIONS_VIEW);
      }
      await submitBridgeTx({
        quoteResponse: activeQuote,
      });
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
      dispatch(setIsSubmittingTx(false));
    }
  };

  const handleTermsPress = () => {
    // TODO: Implement terms and conditions navigation
  };

  const handleSourceTokenPress = () =>
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      params: {
        bridgeViewMode: route.params.bridgeViewMode,
      } as BridgeSourceTokenSelectorRouteParams,
    });

  const handleDestTokenPress = () =>
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.DEST_TOKEN_SELECTOR,
      params: {
        bridgeViewMode: route.params.bridgeViewMode,
      } as BridgeDestTokenSelectorRouteParams,
    });

  const getButtonLabel = () => {
    if (hasInsufficientBalance) return strings('bridge.insufficient_funds');
    if (isSubmittingTx) return strings('bridge.submitting_transaction');
    return strings('bridge.continue');
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
    if (!hasValidBridgeInputs || isInputFocused) {
      return (
        <Box style={styles.buttonContainer}>
          <Text color={TextColor.Primary}>
            {strings('bridge.select_amount')}
          </Text>
        </Box>
      );
    }

    if (isLoading) {
      return (
        <Box style={styles.buttonContainer}>
          <Text color={TextColor.Primary}>
            {strings('bridge.fetching_quote')}
          </Text>
        </Box>
      );
    }

    if (isError) {
      return (
        <Box style={styles.buttonContainer}>
          <BannerAlert
            severity={BannerAlertSeverity.Error}
            description={strings('bridge.error_banner_description')}
          />
        </Box>
      );
    }

    return (
      activeQuote &&
      quotesLastFetched && (
        <Box style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Primary}
            label={getButtonLabel()}
            onPress={handleContinue}
            style={styles.button}
            isDisabled={hasInsufficientBalance || isSubmittingTx}
          />
          <Button
            variant={ButtonVariants.Link}
            label={
              <Text color={TextColor.Alternative}>
                {strings('bridge.terms_and_conditions')}
              </Text>
            }
            onPress={handleTermsPress}
          />
        </Box>
      )
    );
  };

  return (
    // Need this to be full height of screen
    // @ts-expect-error The type is incorrect, this will work
    <ScreenView contentContainerStyle={styles.screen}>
      <Box style={styles.content}>
        <Box style={styles.mainContent}>
          <Box style={styles.inputsContainer} gap={8}>
            <TokenInputArea
              ref={inputRef}
              amount={sourceAmount}
              token={sourceToken}
              tokenBalance={latestSourceBalance?.displayBalance}
              networkImageSource={
                sourceToken?.chainId
                  ?
                    getNetworkImageSource({
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
                  ?
                    getNetworkImageSource({ chainId: destToken?.chainId })
                  : undefined
              }
              testID="dest-token-area"
              tokenType={TokenInputAreaType.Destination}
              onTokenPress={handleDestTokenPress}
              isLoading={isLoading}
            />
          </Box>
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
                  value={sourceAmount}
                  onChange={handleKeypadChange}
                  currency={sourceToken?.symbol || 'ETH'}
                  decimals={sourceToken?.decimals || 18}
                  deleteIcon={
                    <Icon name={IconName.Arrow2Left} size={IconSize.Lg} />
                  }
                />
              </Box>
            ) : null}
          </Box>
        </Box>
        {renderBottomContent()}
      </Box>
    </ScreenView>
  );
};

export default BridgeView;
