import { type Hex } from '@metamask/utils';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
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
import { useStyles } from '../../../../../component-library/hooks';
// Removed swapsTokensWithBalanceSelector - using Bridge's useTokensWithBalance instead
import Routes from '../../../../../constants/navigation/Routes';
import {
  selectSourceToken as selectBridgeSourceToken,
  setSourceToken as setBridgeSourceToken,
  setBridgeViewMode,
  setSelectedSourceChainIds,
} from '../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { selectAccountsByChainId } from '../../../../../selectors/accountTrackerController';
import { selectEvmChainId, selectNetworkConfigurations, selectSelectedNetworkClientId } from '../../../../../selectors/networkController';
import { selectIsIpfsGatewayEnabled } from '../../../../../selectors/preferencesController';
import { selectContractBalances, selectContractBalancesPerChainId } from '../../../../../selectors/tokenBalancesController';
import { selectTokenList } from '../../../../../selectors/tokenListController';
import { safeToChecksumAddress } from '../../../../../util/address';
import { getNetworkImageSource } from '../../../../../util/networks';
import { renderFromTokenMinimalUnit, renderFromWei } from '../../../../../util/number';
import Keypad from '../../../../Base/Keypad';
import ScreenView from '../../../../Base/ScreenView';
import { Box } from '../../../../UI/Box/Box';
import { MAX_INPUT_LENGTH, TokenInputArea, TokenInputAreaType, type TokenInputAreaRef } from '../../../../UI/Bridge/components/TokenInputArea';
import { useGasFeeEstimates } from '../../../../Views/confirmations/hooks/gas/useGasFeeEstimates';
import { BridgeViewMode } from '../../../Bridge/types';
import { isSwapsNativeAsset } from '../../../Swaps/utils';
import PerpsQuoteDetailsCard from '../../components/PerpsQuoteDetailsCard';
import { type PerpsToken } from '../../components/PerpsTokenSelector';
import { ARBITRUM_MAINNET_CHAIN_ID, HYPERLIQUID_ASSET_CONFIGS, TRADING_DEFAULTS } from '../../constants/hyperLiquidConfig';
import type { AssetRoute, DepositParams, PerpsNavigationParamList } from '../../controllers/types';
import { usePerpsTrading } from '../../hooks';
import { usePerpsDepositQuote } from '../../hooks/usePerpsDepositQuote';
import { enhanceTokenWithIcon } from '../../utils/tokenIconUtils';
import createStyles from './PerpsDepositAmountView.styles';

interface PerpsDepositAmountViewProps { }

const PerpsDepositAmountView: React.FC<PerpsDepositAmountViewProps> = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();
  const dispatch = useDispatch();

  // State
  const [sourceAmount, setSourceAmount] = useState<string | undefined>();
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [sourceToken, setSourceToken] = useState<PerpsToken | undefined>();
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const inputRef = useRef<TokenInputAreaRef>(null);

  // Selectors
  const chainId = useSelector(selectEvmChainId);
  const selectedAddress = useSelector(selectSelectedInternalAccountFormattedAddress);
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const balances = useSelector(selectContractBalances);
  const balancesPerChain = useSelector(selectContractBalancesPerChainId);
  const tokenList = useSelector(selectTokenList);
  const isIpfsGatewayEnabled = useSelector(selectIsIpfsGatewayEnabled);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const bridgeSourceToken = useSelector(selectBridgeSourceToken);

  // Start gas polling
  useGasFeeEstimates(selectedNetworkClientId);

  // Hooks
  const { getDepositRoutes, deposit } = usePerpsTrading();

  // Default destination token (USDC on Hyperliquid)
  const destToken = useMemo<PerpsToken>(() => {
    const baseToken: PerpsToken = {
      symbol: 'USDC',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 6,
      name: 'USD Coin',
      chainId: '0x3e7' as Hex, // Hyperliquid mainnet chainId (999 in hex)
    };

    // Try to get USDC icon from source token or token list
    if (sourceToken?.symbol === 'USDC' && sourceToken.image) {
      return { ...baseToken, image: sourceToken.image };
    }

    // Fallback to searching token list
    if (tokenList) {
      const usdcToken = Object.values(tokenList).find(
        (token) => token.symbol === 'USDC'
      );
      if (usdcToken && 'iconUrl' in usdcToken) {
        const tokenWithIcon = usdcToken as { iconUrl: string };
        return { ...baseToken, image: tokenWithIcon.iconUrl };
      }
    }

    return baseToken;
  }, [tokenList, sourceToken]);

  // Initialize default source token (USDC on Arbitrum)
  useEffect(() => {
    if (!sourceToken && tokenList) {
      const usdcMainnetConfig = HYPERLIQUID_ASSET_CONFIGS.USDC.mainnet;
      const usdcAddress = usdcMainnetConfig.split('/erc20:')[1]?.split('/')[0] || '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

      const defaultToken: PerpsToken = {
        symbol: 'USDC',
        address: usdcAddress,
        decimals: 6,
        name: 'USD Coin',
        chainId: `0x${parseInt(ARBITRUM_MAINNET_CHAIN_ID, 10).toString(16)}`,
      };

      const enhancedToken = enhanceTokenWithIcon({
        token: defaultToken,
        tokenList,
        isIpfsGatewayEnabled,
      });

      setSourceToken(enhancedToken);
    }
  }, [tokenList, isIpfsGatewayEnabled, sourceToken]);


  // Use deposit quote hook - only run when sourceToken is loaded
  const { formattedQuoteData, isLoading: isQuoteLoading } = usePerpsDepositQuote({
    amount: sourceToken ? (sourceAmount || '0') : '0',
    selectedToken: sourceToken || destToken,
    getDepositRoutes,
  });

  // Calculate token balance
  const sourceBalance = useMemo(() => {
    if (!sourceToken || !selectedAddress) return undefined;

    const tokenChainId = sourceToken.chainId as Hex;

    if (isSwapsNativeAsset(sourceToken)) {
      return renderFromWei(
        accountsByChainId[tokenChainId]?.[selectedAddress]?.balance || '0x0'
      );
    }

    const tokenAddress = safeToChecksumAddress(sourceToken.address);
    if (tokenAddress) {
      const tokenBalance = balancesPerChain[tokenChainId]?.[tokenAddress] ||
        balances[tokenAddress];

      if (tokenBalance) {
        return renderFromTokenMinimalUnit(
          tokenBalance,
          sourceToken.decimals
        );
      }
    }

    return '0';
  }, [sourceToken, selectedAddress, accountsByChainId, balances, balancesPerChain]);

  // Get all EVM chain IDs
  const allChainIds = useMemo(() => {
    if (!networkConfigurations) return [];

    // Get all chain IDs from network configurations
    return Object.keys(networkConfigurations)
      .filter(id => {
        // Filter out non-EVM chains (Solana, etc)
        const networkChainId = id as Hex;
        // Solana chain IDs start with 'solana:'
        return !networkChainId.startsWith('solana:');
      }) as Hex[];
  }, [networkConfigurations]);

  // Initialize Bridge state for token selector
  useEffect(() => {
    if (allChainIds.length > 0) {
      // Set Bridge view mode to enable proper token filtering
      dispatch(setBridgeViewMode(BridgeViewMode.Bridge));
      // Set all chain IDs as source chains
      dispatch(setSelectedSourceChainIds(allChainIds));
    }
  }, [allChainIds, dispatch]);

  // Listen for token selection from Bridge token selector
  useFocusEffect(
    useCallback(() => {
      if (bridgeSourceToken && bridgeSourceToken !== sourceToken) {
        setSourceToken(bridgeSourceToken as PerpsToken);
        // Clear the bridge source token to avoid re-selecting on next focus
        dispatch(setBridgeSourceToken(undefined));
      }
    }, [bridgeSourceToken, sourceToken, dispatch])
  );

  // Check if user has sufficient balance
  const hasInsufficientBalance = useMemo(() => {
    if (!sourceAmount || !sourceBalance) return false;
    return parseFloat(sourceAmount) > parseFloat(sourceBalance);
  }, [sourceAmount, sourceBalance]);

  // Check minimum deposit amount
  const isTestnet = chainId === '0x3e6' || chainId === '0x66eee'; // Arbitrum Sepolia or other test networks
  const minimumDepositAmount = isTestnet ? TRADING_DEFAULTS.amount.testnet : TRADING_DEFAULTS.amount.mainnet;

  const isBelowMinimumDeposit = useMemo(() => {
    if (!sourceAmount || sourceToken?.symbol !== 'USDC') return false;
    return parseFloat(sourceAmount) < minimumDepositAmount;
  }, [sourceAmount, sourceToken, minimumDepositAmount]);

  // Remove auto-blur - user should control when to close keypad

  // Handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleKeypadChange = useCallback(({ value }: { value: string }) => {
    if (value.length >= MAX_INPUT_LENGTH) {
      return;
    }
    setSourceAmount(value || undefined);
  }, []);

  const handleTokenSelectPress = useCallback(() => {
    // Navigate to Bridge's source token selector
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
    });
  }, [navigation]);


  // Percentage keypad handlers
  const handlePercentagePress = useCallback((percentage: number) => {
    if (!sourceBalance || parseFloat(sourceBalance) === 0) return;

    const balanceNum = parseFloat(sourceBalance);
    const newAmount = (balanceNum * percentage).toFixed(sourceToken?.decimals || 6);
    setSourceAmount(newAmount);
    setIsInputFocused(false);
  }, [sourceBalance, sourceToken]);

  const handleMaxPress = useCallback(() => {
    if (!sourceBalance || parseFloat(sourceBalance) === 0) return;
    setSourceAmount(sourceBalance);
    setIsInputFocused(false);
  }, [sourceBalance]);

  const handleDonePress = useCallback(() => {
    setIsInputFocused(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }, []);

  const handleContinue = useCallback(async () => {
    if (!sourceToken || !sourceAmount || !selectedAddress) {
      return;
    }

    try {
      setIsSubmittingTx(true);
      setError(null);

      // Find matching deposit route
      const supportedRoutes = getDepositRoutes();
      const selectedTokenAddress = sourceToken.address.toLowerCase();
      const assetId = supportedRoutes.find((route: AssetRoute) =>
        route.assetId.toLowerCase().includes(selectedTokenAddress)
      )?.assetId;

      if (!assetId) {
        setError(`Token ${sourceToken.symbol} not supported for deposits`);
        return;
      }

      const depositParams: DepositParams = {
        amount: sourceAmount,
        assetId,
      };

      await deposit(depositParams);

      // Navigate to processing view
      navigation.navigate('PerpsDepositProcessing', {
        amount: sourceAmount,
        fromToken: sourceToken.symbol,
        transactionHash: '', // Will be updated by deposit state
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsSubmittingTx(false);
    }
  }, [sourceToken, sourceAmount, selectedAddress, getDepositRoutes, deposit, navigation]);

  // Component conditions
  const hasValidInputs = sourceAmount && sourceToken && !hasInsufficientBalance && !isBelowMinimumDeposit;
  const shouldDisplayKeypad = isInputFocused || !sourceAmount || parseFloat(sourceAmount || '0') === 0;
  const shouldDisplayQuoteDetails = sourceAmount && parseFloat(sourceAmount) > 0 && !isInputFocused && !isQuoteLoading && sourceToken;

  // Get button label
  const getButtonLabel = () => {
    if (hasInsufficientBalance) return strings('perps.deposit.insufficient_funds');
    if (isBelowMinimumDeposit) return strings('perps.deposit.minimum_deposit_error', { amount: minimumDepositAmount });
    if (!sourceAmount || parseFloat(sourceAmount) === 0) return strings('perps.deposit.enter_amount');
    if (isQuoteLoading) return strings('perps.deposit.fetching_quote');
    if (isSubmittingTx) return strings('perps.deposit.submitting');
    return strings('perps.deposit.get_usdc');
  };

  // Calculate destination amount (1:1 for USDC)
  const destAmount = sourceAmount;

  return (
    // @ts-expect-error The type is incorrect, this will work
    <ScreenView contentContainerStyle={styles.screen}>
      <View style={styles.container}>
        {/* Header */}
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

        <Box style={styles.content}>
          {/* Token Input Areas */}
          <Box style={styles.inputsContainer} gap={8}>
            <TokenInputArea
              ref={inputRef}
              amount={sourceAmount}
              token={sourceToken}
              tokenBalance={sourceBalance}
              networkImageSource={sourceToken?.chainId ? getNetworkImageSource({ chainId: sourceToken.chainId }) : undefined}
              testID="source-token-area"
              tokenType={TokenInputAreaType.Source}
              onTokenPress={handleTokenSelectPress}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              onInputPress={() => setIsInputFocused(true)}
            />

            <Box style={styles.arrowContainer}>
              <Box style={styles.arrowCircle}>
                <Icon name={IconName.Arrow2Down} size={IconSize.Md} />
              </Box>
            </Box>

            <TokenInputArea
              amount={destAmount}
              token={destToken}
              networkImageSource={getNetworkImageSource({ chainId: '0x3e7' })} // Hyperliquid mainnet chainId
              networkName="Hyperliquid"
              testID="dest-token-area"
              tokenType={TokenInputAreaType.Destination}
              isLoading={isQuoteLoading}
            />
          </Box>

          {/* Scrollable Dynamic Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <Box style={styles.dynamicContent}>
              {shouldDisplayQuoteDetails ? (
                <PerpsQuoteDetailsCard
                  networkFee={formattedQuoteData.networkFee}
                  estimatedTime={formattedQuoteData.estimatedTime}
                  rate="1 USDC = 1 USDC"
                  isLoading={isQuoteLoading}
                  metamaskFee="$0.00"
                />
              ) : shouldDisplayKeypad ? (
                <Box style={styles.keypadContainer}>
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
                      label="Max"
                      onPress={handleMaxPress}
                      style={styles.percentageButton}
                    />
                    <Button
                      variant={ButtonVariants.Secondary}
                      size={ButtonSize.Md}
                      label="Done"
                      onPress={handleDonePress}
                      style={styles.percentageButton}
                    />
                  </View>
                  <Keypad
                    style={styles.keypad}
                    value={sourceAmount}
                    onChange={handleKeypadChange}
                    currency={sourceToken?.symbol || 'USDC'}
                    decimals={sourceToken?.decimals || 6}
                    deleteIcon={
                      <Icon name={IconName.ArrowLeft} size={IconSize.Lg} />
                    }
                  />
                </Box>
              ) : null}
            </Box>
          </ScrollView>
        </Box>

        {/* Fixed Bottom Button */}
        <View style={styles.fixedBottomContainer}>
          {error && (
            <Text style={styles.errorText} color={TextColor.Error}>
              {error}
            </Text>
          )}
          <Button
            variant={ButtonVariants.Primary}
            label={getButtonLabel()}
            onPress={handleContinue}
            style={styles.button}
            disabled={!hasValidInputs || isQuoteLoading || hasInsufficientBalance || isBelowMinimumDeposit || isSubmittingTx}
            testID="continue-button"
          />
        </View>
      </View>
    </ScreenView>
  );
};

export default PerpsDepositAmountView;

