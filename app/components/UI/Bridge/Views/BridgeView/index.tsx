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
import { getNetworkImageSource } from '../../../../../util/networks';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import {
  selectSourceAmount,
  selectSelectedDestChainId,
  setSourceAmount,
  resetBridgeState,
  setSourceToken,
  setDestToken,
  selectDestToken,
  selectSourceToken,
  selectBridgeControllerState,
} from '../../../../../core/redux/slices/bridge';
import { ethers } from 'ethers';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { getBridgeNavbar } from '../../../Navbar';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import useSubmitBridgeTx from '../../../../../util/bridge/hooks/useSubmitBridgeTx';
import { QuoteResponse } from '../../types';
import Engine from '../../../../../core/Engine';
import Routes from '../../../../../constants/navigation/Routes';
import { selectBasicFunctionalityEnabled } from '../../../../../selectors/settings';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import QuoteDetailsCard from '../../components/QuoteDetailsCard';
import { useBridgeQuoteRequest } from '../../hooks/useBridgeQuoteRequest';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import DestinationAccountSelector from '../../components/DestinationAccountSelector.tsx';
import {
  isSolanaChainId,
  type QuoteMetadata,
} from '@metamask/bridge-controller';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { createStyles } from './BridgeView.styles';
import {
  useInitialSourceToken,
  type BridgeRouteParams,
} from '../../hooks/useInitialSourceToken';
import { useInitialDestToken } from '../../hooks/useInitialDestToken';
import type { BridgeSourceTokenSelectorRouteParams } from '../../components/BridgeSourceTokenSelector';
import type { BridgeDestTokenSelectorRouteParams } from '../../components/BridgeDestTokenSelector';

const BridgeView = () => {
  const [isInputFocused, setIsInputFocused] = useState(false);

  // The same as getUseExternalServices in Extension
  const isBasicFunctionalityEnabled = useSelector(
    selectBasicFunctionalityEnabled,
  );

  const { styles } = useStyles(createStyles, {});
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: BridgeRouteParams }, 'params'>>();
  const { colors } = useTheme();
  const { submitBridgeTx } = useSubmitBridgeTx();

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
  } = useBridgeQuoteData();
  const { quoteRequest } = useSelector(selectBridgeControllerState);

  // inputRef is used to programmatically blur the input field after a delay
  // This gives users time to type before the keyboard disappears
  // The ref is typed to only expose the blur method we need
  const inputRef = useRef<{ blur: () => void }>(null);

  const updateQuoteParams = useBridgeQuoteRequest();

  useInitialSourceToken();
  useInitialDestToken();

  const hasDestinationPicker =
    destToken?.chainId && isSolanaChainId(destToken.chainId);
  const hasQuoteDetails = activeQuote && !isLoading;

  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
  });

  const isValidSourceAmount =
    !!sourceAmount &&
    sourceAmount !== '.' &&
    sourceToken?.decimals &&
    !ethers.utils.parseUnits(sourceAmount, sourceToken.decimals).isZero();

  const hasValidBridgeInputs =
    isValidSourceAmount && !!sourceToken && !!destToken;

  const hasInsufficientBalance = quoteRequest?.insufficientBal;

  // Primary condition for keypad visibility - when input is focused or we don't have valid inputs
  const shouldDisplayKeypad = isInputFocused || !hasValidBridgeInputs;

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

  // Reset bridge state when component unmounts
  useEffect(
    () => () => {
      dispatch(resetBridgeState());
      // Clear bridge controller state
      Engine.context.BridgeController.resetState();
    },
    [dispatch],
  );

  useEffect(() => {
    navigation.setOptions(getBridgeNavbar(navigation, route, colors));
  }, [navigation, route, colors]);

  useEffect(() => {
    const setBridgeFeatureFlags = async () => {
      try {
        if (isBasicFunctionalityEnabled) {
          await Engine.context.BridgeController.setBridgeFeatureFlags();
        }
      } catch (error) {
        console.error('Error setting bridge feature flags', error);
      }
    };

    setBridgeFeatureFlags();
  }, [isBasicFunctionalityEnabled]);

  const handleKeypadChange = ({
    value,
  }: {
    value: string;
    valueAsNumber: number;
    pressedKey: string;
  }) => {
    // Keep focus when editing
    setIsInputFocused(true);
    dispatch(setSourceAmount(value || undefined));
  };

  const handleContinue = async () => {
    // TODO: Implement bridge transaction with source and destination amounts
    // TESTING: Paste a quote from the Bridge API here to test the bridge flow
    const quoteResponse = {};
    // TESTING: Paste quote metadata from extension here to test the bridge flow
    const quoteMetadata = {};
    if (
      Object.keys(quoteResponse).length > 0 &&
      Object.keys(quoteMetadata).length > 0
    ) {
      await submitBridgeTx({
        quoteResponse: { ...quoteResponse, ...quoteMetadata } as QuoteResponse &
          QuoteMetadata,
      });
      navigation.navigate(Routes.TRANSACTIONS_VIEW);
    }
  };

  const handleTermsPress = () => {
    // TODO: Implement terms and conditions navigation
  };

  const handleArrowPress = () => {
    // Switch tokens
    if (sourceToken && destToken) {
      dispatch(setSourceToken(destToken));
      dispatch(setDestToken(sourceToken));
    }
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

  const hasDestinationPickerAndQuoteCard =
    hasDestinationPicker && hasQuoteDetails && !isInputFocused;

  const hasOnlyQuoteCard = hasQuoteDetails && !isInputFocused;

  const renderBottomContent = () => (
    <Box style={styles.buttonContainer}>
      {!hasValidBridgeInputs || isLoading || !activeQuote ? (
        <Text color={TextColor.Primary}>{strings('bridge.select_amount')}</Text>
      ) : isError ? (
        <BannerAlert
          severity={BannerAlertSeverity.Error}
          description={strings('bridge.error_banner_description')}
        />
      ) : (
        <>
          <Button
            variant={ButtonVariants.Primary}
            label={
              hasInsufficientBalance
                ? strings('bridge.insufficient_funds')
                : strings('bridge.continue')
            }
            onPress={handleContinue}
            style={styles.button}
            isDisabled={hasInsufficientBalance}
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
        </>
      )}
    </Box>
  );

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
                  ? //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
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
              autoFocus
            />
            <Box style={styles.arrowContainer}>
              <Box style={styles.arrowCircle}>
                <ButtonIcon
                  iconName={IconName.Arrow2Down}
                  onPress={handleArrowPress}
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
                  ? //@ts-expect-error - The utils/network file is still JS and this function expects a networkType, and should be optional
                    getNetworkImageSource({ chainId: destToken?.chainId })
                  : undefined
              }
              isReadonly
              testID="dest-token-area"
              tokenType={TokenInputAreaType.Destination}
              onTokenPress={handleDestTokenPress}
              isLoading={isLoading}
            />
          </Box>
          <Box
            style={[
              styles.dynamicContent,
              hasDestinationPickerAndQuoteCard
                ? styles.dynamicContentWithDestinationPickerAndQuoteCard
                : hasOnlyQuoteCard
                ? styles.dynamicContentWithOnlyQuoteCard
                : styles.dynamicContent,
            ]}
          >
            <Box style={styles.destinationAccountSelectorContainer}>
              {hasDestinationPicker && <DestinationAccountSelector />}
            </Box>

            {hasQuoteDetails && !isInputFocused ? (
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
                    <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
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
