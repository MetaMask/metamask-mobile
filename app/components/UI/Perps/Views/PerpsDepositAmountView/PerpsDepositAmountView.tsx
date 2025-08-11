import {
  isCaipChainId,
  KnownCaipNamespace,
  parseCaipAssetId,
  parseCaipChainId,
  type Hex,
} from '@metamask/utils';
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
} from '@react-navigation/native';
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { toHex } from '@metamask/controller-utils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { handlePerpsError } from '../../utils/perpsErrorHandler';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useStyles } from '../../../../../component-library/hooks';
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectSourceToken as selectBridgeSourceToken,
  setSourceToken as setBridgeSourceToken,
  setBridgeViewMode,
  setSelectedSourceChainIds,
} from '../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';
import {
  selectNetworkConfigurations,
  selectSelectedNetworkClientId,
} from '../../../../../selectors/networkController';
import { selectIsIpfsGatewayEnabled } from '../../../../../selectors/preferencesController';
import {
  selectContractBalances,
  selectContractBalancesPerChainId,
} from '../../../../../selectors/tokenBalancesController';
import { selectTokenList } from '../../../../../selectors/tokenListController';
import { safeToChecksumAddress } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import {
  renderFromTokenMinimalUnit,
  renderFromWei,
} from '../../../../../util/number';
import { Box } from '../../../../UI/Box/Box';
import {
  MAX_INPUT_LENGTH,
  TokenInputArea,
  TokenInputAreaType,
  type TokenInputAreaRef,
} from '../../../../UI/Bridge/components/TokenInputArea';
import { useGasFeeEstimates } from '../../../../Views/confirmations/hooks/gas/useGasFeeEstimates';
import { BridgeViewMode } from '../../../Bridge/types';
import Keypad from '../../../../Base/Keypad';
import { isSwapsNativeAsset } from '../../../Swaps/utils';
import PerpsQuoteDetailsCard from '../../components/PerpsQuoteDetailsCard';
import { type PerpsToken } from '../../components/PerpsTokenSelector';
import {
  ARBITRUM_MAINNET_CHAIN_ID,
  CAIP_ASSET_NAMESPACES,
  HYPERLIQUID_ASSET_CONFIGS,
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_NETWORK_NAME,
  METAMASK_DEPOSIT_FEE,
  TRADING_DEFAULTS,
  USDC_DECIMALS,
  USDC_NAME,
  USDC_SYMBOL,
  ZERO_ADDRESS,
  ZERO_BALANCE,
} from '../../constants/hyperLiquidConfig';
import type {
  AssetRoute,
  DepositParams,
  PerpsNavigationParamList,
} from '../../controllers/types';
import { usePerpsNetwork, usePerpsTrading } from '../../hooks';
import { usePerpsDepositQuote } from '../../hooks/usePerpsDepositQuote';
import { enhanceTokenWithIcon } from '../../utils/tokenIconUtils';
import createStyles from './PerpsDepositAmountView.styles';

interface PerpsDepositAmountViewProps {}

const PerpsDepositAmountView: React.FC<PerpsDepositAmountViewProps> = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const dispatch = useDispatch();
  const { toastRef } = useContext(ToastContext);

  // State
  const [sourceAmount, setSourceAmount] = useState<string | undefined>('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [sourceToken, setSourceToken] = useState<PerpsToken | undefined>();
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shouldBlur, setShouldBlur] = useState(false);

  // Refs
  const inputRef = useRef<TokenInputAreaRef>(null);
  const prevTokenRef = useRef<PerpsToken | undefined>();

  // Selectors
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const balances = useSelector(selectContractBalances);
  const balancesPerChain = useSelector(selectContractBalancesPerChainId);
  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const bridgeSourceToken = useSelector(selectBridgeSourceToken);

  useGasFeeEstimates(selectedNetworkClientId);

  const { getDepositRoutes, deposit } = usePerpsTrading();
  const perpsNetwork = usePerpsNetwork();
  const isTestnet = perpsNetwork === 'testnet';

  const destToken = useMemo<PerpsToken>(() => {
    // Always use mainnet to identify network icon and hyperliquid doesn't allow deposit on testnet
    const hyperliquidChainId = HYPERLIQUID_MAINNET_CHAIN_ID;
    const baseToken: PerpsToken = {
      symbol: USDC_SYMBOL,
      address: ZERO_ADDRESS,
      decimals: USDC_DECIMALS,
      name: USDC_NAME,
      chainId: hyperliquidChainId,
      currencyExchangeRate: 1,
    };

    if (sourceToken?.symbol === USDC_SYMBOL && sourceToken.image) {
      return { ...baseToken, image: sourceToken.image };
    }

    if (tokenList) {
      const usdcToken = Object.values(tokenList).find(
        (token) => token.symbol === USDC_SYMBOL,
      );
      if (usdcToken && 'iconUrl' in usdcToken) {
        const tokenWithIcon = usdcToken as { iconUrl: string };
        return { ...baseToken, image: tokenWithIcon.iconUrl };
      }
    }

    return baseToken;
  }, [tokenList, sourceToken]);

  useEffect(() => {
    if (!sourceToken && tokenList) {
      try {
        // Always default to Arbitrum USDC - this is the only direct deposit route
        const usdcConfig = isTestnet
          ? HYPERLIQUID_ASSET_CONFIGS.USDC.testnet
          : HYPERLIQUID_ASSET_CONFIGS.USDC.mainnet;
        const parsedAsset = parseCaipAssetId(usdcConfig);

        if (
          !parsedAsset.assetNamespace ||
          parsedAsset.assetNamespace !== CAIP_ASSET_NAMESPACES.ERC20 ||
          !parsedAsset.assetReference
        ) {
          return;
        }

        const defaultToken: PerpsToken = {
          symbol: USDC_SYMBOL,
          address: parsedAsset.assetReference,
          decimals: USDC_DECIMALS,
          name: USDC_NAME,
          chainId: toHex(parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10)) as Hex,
        };

        const enhancedToken = enhanceTokenWithIcon({
          token: defaultToken,
          tokenList,
          isIpfsGatewayEnabled,
        });

        setSourceToken(enhancedToken);
      } catch (err) {
        // Prevent blocking the app, user can still select the token manually
        console.error('Error setting default token', err);
      }
    }
  }, [tokenList, isIpfsGatewayEnabled, sourceToken, isTestnet]);

  const {
    formattedQuoteData,
    isLoading: isQuoteLoading,
    isExpired,
    willRefresh,
    hasValidQuote,
    quoteFetchError,
  } = usePerpsDepositQuote({
    amount: sourceAmount || '',
    selectedToken: sourceToken || destToken,
  });

  const sourceBalance = useMemo(() => {
    if (!sourceToken || !selectedAddress) return undefined;

    const tokenChainId = sourceToken.chainId as Hex;

    if (isSwapsNativeAsset(sourceToken)) {
      const balance =
        accountsByChainId[tokenChainId]?.[selectedAddress]?.balance;
      return renderFromWei(balance || ZERO_BALANCE);
    }

    const tokenAddress = safeToChecksumAddress(sourceToken.address);
    if (tokenAddress) {
      const tokenBalance =
        balancesPerChain[tokenChainId]?.[tokenAddress] ||
        balances[tokenAddress];

      if (tokenBalance) {
        return renderFromTokenMinimalUnit(tokenBalance, sourceToken.decimals);
      }
    }

    return ZERO_BALANCE;
  }, [
    sourceToken,
    selectedAddress,
    accountsByChainId,
    balances,
    balancesPerChain,
  ]);

  const allChainIds = useMemo(() => {
    if (!networkConfigurations) return [];

    return Object.keys(networkConfigurations).filter((id) => {
      // For CAIP format chain IDs, parse and check namespace
      if (isCaipChainId(id)) {
        try {
          const { namespace } = parseCaipChainId(id);
          return namespace !== KnownCaipNamespace.Solana;
        } catch {
          return false;
        }
      }
      // For non-CAIP format (hex), assume it's EVM and include it
      return true;
    }) as Hex[];
  }, [networkConfigurations]);

  useEffect(() => {
    if (allChainIds.length > 0) {
      dispatch(setBridgeViewMode(BridgeViewMode.Bridge));
      dispatch(setSelectedSourceChainIds(allChainIds));
    }
  }, [allChainIds, dispatch]);

  useFocusEffect(
    useCallback(() => {
      if (bridgeSourceToken && bridgeSourceToken !== sourceToken) {
        setSourceToken(bridgeSourceToken as PerpsToken);
        dispatch(setBridgeSourceToken(undefined));
        // Reset amount when token changes from bridge
        setSourceAmount('');
      }
    }, [bridgeSourceToken, sourceToken, dispatch]),
  );

  // Reset amount when source token changes through any means
  useEffect(() => {
    // Only reset if we have a previous token and it's different from current
    if (
      prevTokenRef.current &&
      sourceToken &&
      (prevTokenRef.current.address !== sourceToken.address ||
        prevTokenRef.current.chainId !== sourceToken.chainId)
    ) {
      setSourceAmount('');
    }

    prevTokenRef.current = sourceToken;
  }, [sourceToken]);

  // Handle quote expiration
  useEffect(() => {
    const hasAmount = Boolean(
      sourceAmount && sourceAmount !== '' && parseFloat(sourceAmount) > 0,
    );

    // Only show expiration modal if we have a valid quote that expired and won't refresh
    // AND we have an amount entered
    if (
      isExpired &&
      !willRefresh &&
      hasValidQuote &&
      !isInputFocused &&
      hasAmount
    ) {
      setIsInputFocused(false);
      navigation.navigate(Routes.PERPS.MODALS.ROOT, {
        screen: Routes.PERPS.MODALS.QUOTE_EXPIRED_MODAL,
      });
    }
  }, [
    isExpired,
    willRefresh,
    hasValidQuote,
    isInputFocused,
    navigation,
    sourceAmount,
  ]);

  const hasInsufficientBalance = useMemo(() => {
    if (!sourceAmount || !sourceBalance) return false;
    return parseFloat(sourceAmount) > parseFloat(sourceBalance);
  }, [sourceAmount, sourceBalance]);

  const minimumDepositAmount = isTestnet
    ? TRADING_DEFAULTS.amount.testnet
    : TRADING_DEFAULTS.amount.mainnet;

  const isBelowMinimumDeposit = useMemo(() => {
    if (!sourceAmount || sourceToken?.symbol !== USDC_SYMBOL) return false;
    return parseFloat(sourceAmount) < minimumDepositAmount;
  }, [sourceAmount, sourceToken, minimumDepositAmount]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      if (value.length >= MAX_INPUT_LENGTH) {
        return;
      }
      setSourceAmount(value || '');
    },
    [],
  );

  const handleTokenSelectPress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
    });
  }, [navigation]);

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      if (!sourceBalance || parseFloat(sourceBalance) === 0) return;

      const balanceNum = parseFloat(sourceBalance);
      const newAmount = (balanceNum * percentage).toFixed(
        sourceToken?.decimals || USDC_DECIMALS,
      );
      setSourceAmount(newAmount);
    },
    [sourceBalance, sourceToken],
  );

  const handleMaxPress = useCallback(() => {
    if (!sourceBalance || parseFloat(sourceBalance) === 0) return;
    setSourceAmount(sourceBalance);
  }, [sourceBalance]);

  const handleDonePress = useCallback(() => {
    setShouldBlur(true);
    setIsInputFocused(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
    setTimeout(() => setShouldBlur(false), 100);
  }, []);

  const handleContinue = useCallback(async () => {
    if (!sourceToken || !sourceAmount || !selectedAddress) {
      return;
    }

    try {
      setIsSubmittingTx(true);
      setError(null);

      const supportedRoutes = getDepositRoutes();
      const selectedTokenAddress = sourceToken.address.toLowerCase();
      const assetId = supportedRoutes.find((route: AssetRoute) =>
        route.assetId.toLowerCase().includes(selectedTokenAddress),
      )?.assetId;

      if (!assetId) {
        setError(
          strings('perps.errors.tokenNotSupported', {
            token: sourceToken.symbol,
          }),
        );
        return;
      }

      const depositParams: DepositParams = {
        amount: sourceAmount,
        assetId,
      };

      const depositResult = await deposit(depositParams);

      if (depositResult.success && depositResult.txHash) {
        // Show success toast
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Received,
          iconColor: IconColor.Success,
          hasNoTimeout: false,
          labelOptions: [
            {
              label: `${sourceAmount} ${sourceToken.symbol} ${strings(
                'perps.deposit.deposit_completed',
              )}`,
              isBold: true,
            },
          ],
        });

        // Navigate to trading view
        navigation.navigate(Routes.PERPS.TRADING_VIEW);
      } else {
        // Use centralized error handler for all errors
        const errorMessage = handlePerpsError({
          error: depositResult.error,
          context: { token: sourceToken.symbol },
          fallbackMessage: strings('perps.errors.depositFailed'),
        });
        setError(errorMessage);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : strings('perps.errors.unknownError'),
      );
    } finally {
      setIsSubmittingTx(false);
    }
  }, [
    sourceToken,
    sourceAmount,
    selectedAddress,
    getDepositRoutes,
    deposit,
    toastRef,
    navigation,
  ]);

  const hasAmount = sourceAmount && parseFloat(sourceAmount) > 0;
  const hasValidInputs =
    hasAmount &&
    sourceToken &&
    !hasInsufficientBalance &&
    !isBelowMinimumDeposit;
  const shouldDisplayQuoteDetails =
    hasAmount && sourceToken && (!isQuoteLoading || quoteFetchError);
  const shouldShowPercentageButtons = isInputFocused || !hasAmount;

  const getButtonLabel = () => {
    if (hasInsufficientBalance)
      return strings('perps.deposit.insufficient_funds');
    if (isBelowMinimumDeposit)
      return strings('perps.deposit.minimum_deposit_error', {
        amount: minimumDepositAmount,
      });
    if (!sourceAmount || parseFloat(sourceAmount) === 0)
      return strings('perps.deposit.enter_amount');
    if (isQuoteLoading) return strings('perps.deposit.fetching_quote');
    if (isSubmittingTx) return strings('perps.deposit.submitting');
    return strings('perps.deposit.get_usdc');
  };

  // Use the receiving amount from the quote data if available, otherwise show source amount
  const destAmount = useMemo(() => {
    if (
      formattedQuoteData.receivingAmount &&
      formattedQuoteData.receivingAmount !== '0.00 USDC'
    ) {
      // Extract just the numeric value from "X.XX USDC"
      const match = formattedQuoteData.receivingAmount.match(/^([\d.]+)/);
      return match ? match[1] : '0';
    }
    return sourceAmount || '0';
  }, [formattedQuoteData.receivingAmount, sourceAmount]);

  const { top } = useSafeAreaInsets();

  return (
    <SafeAreaView style={[styles.screen, { marginTop: top }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            iconColor={IconColor.Default}
            style={styles.backButton}
            testID="buttonicon-arrowleft"
          />
          <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
            {strings('perps.deposit.get_usdc_hyperliquid')}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollViewContent,
            isInputFocused && styles.scrollViewContentWithKeypad,
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Box style={styles.inputsContainer} gap={8}>
            <TokenInputArea
              ref={inputRef}
              amount={sourceAmount || undefined}
              token={sourceToken}
              tokenBalance={sourceBalance}
              networkImageSource={
                sourceToken?.chainId
                  ? getNetworkImageSource({ chainId: sourceToken.chainId })
                  : undefined
              }
              testID="source-token-area"
              tokenType={TokenInputAreaType.Source}
              onTokenPress={handleTokenSelectPress}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => {
                if (shouldBlur) {
                  setIsInputFocused(false);
                }
              }}
              onInputPress={() => {
                setIsInputFocused(true);
              }}
            />

            <Box style={styles.arrowContainer}>
              <Box style={styles.arrowCircle}>
                <Icon name={IconName.Arrow2Down} size={IconSize.Xl} />
              </Box>
            </Box>

            <TokenInputArea
              amount={destAmount}
              token={destToken}
              networkImageSource={getNetworkImageSource({
                chainId: destToken.chainId,
              })}
              networkName={HYPERLIQUID_NETWORK_NAME}
              testID="dest-token-area"
              tokenType={TokenInputAreaType.Destination}
              isLoading={isQuoteLoading}
            />
          </Box>

          {shouldDisplayQuoteDetails && (
            <Box style={styles.quoteContainer}>
              <PerpsQuoteDetailsCard
                networkFee={formattedQuoteData.networkFee}
                estimatedTime={formattedQuoteData.estimatedTime}
                rate={
                  formattedQuoteData.exchangeRate ||
                  `1 ${sourceToken?.symbol || USDC_SYMBOL} = 1 ${USDC_SYMBOL}`
                }
                metamaskFee={METAMASK_DEPOSIT_FEE}
                direction="deposit"
              />
            </Box>
          )}
        </ScrollView>

        {isInputFocused && (
          <View style={styles.floatingKeypadContainer}>
            <Button
              variant={ButtonVariants.Primary}
              label={getButtonLabel()}
              onPress={handleContinue}
              style={styles.actionButton}
              disabled={!hasValidInputs || isQuoteLoading || isSubmittingTx}
              testID="continue-button"
            />

            {shouldShowPercentageButtons && (
              <View style={styles.percentageButtonsRow}>
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Md}
                  label="10%"
                  onPress={() => handlePercentagePress(0.1)}
                  style={styles.percentageButton}
                />
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Md}
                  label="25%"
                  onPress={() => handlePercentagePress(0.25)}
                  style={styles.percentageButton}
                />
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Md}
                  label={strings('perps.deposit.max_button')}
                  onPress={handleMaxPress}
                  style={styles.percentageButton}
                />
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Md}
                  label={strings('perps.deposit.done_button')}
                  onPress={handleDonePress}
                  style={styles.percentageButton}
                />
              </View>
            )}

            <Keypad
              style={styles.keypad}
              value={sourceAmount || '0'}
              onChange={handleKeypadChange}
              currency={sourceToken?.symbol || USDC_SYMBOL}
              decimals={sourceToken?.decimals || USDC_DECIMALS}
            />
          </View>
        )}

        {!isInputFocused && (
          <View style={styles.fixedBottomContainer}>
            {(error || quoteFetchError) && (
              <Text style={styles.errorText} color={TextColor.Error}>
                {error || quoteFetchError}
              </Text>
            )}
            <Button
              variant={ButtonVariants.Primary}
              label={getButtonLabel()}
              onPress={handleContinue}
              style={styles.actionButton}
              disabled={!hasValidInputs || isQuoteLoading || isSubmittingTx}
              testID="continue-button"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PerpsDepositAmountView;
