import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { type Hex } from '@metamask/utils';

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
import Routes from '../../../../../constants/navigation/Routes';
import { getNetworkImageSource } from '../../../../../util/networks';
import ScreenView from '../../../../Base/ScreenView';
import { Box } from '../../../../UI/Box/Box';
import {
  MAX_INPUT_LENGTH,
  TokenInputArea,
  TokenInputAreaType,
  type TokenInputAreaRef,
} from '../../../../UI/Bridge/components/TokenInputArea';
import Keypad from '../../../Ramp/Aggregator/components/Keypad';
import PerpsQuoteDetailsCard from '../../components/PerpsQuoteDetailsCard';
import type { PerpsToken } from '../../components/PerpsTokenSelector';
import {
  HYPERLIQUID_MAINNET_CHAIN_ID,
  HYPERLIQUID_TESTNET_CHAIN_ID,
  HYPERLIQUID_WITHDRAWAL_FEE,
  METAMASK_WITHDRAWAL_FEE_PLACEHOLDER,
  USDC_DECIMALS,
  USDC_NAME,
  USDC_SYMBOL,
  ZERO_ADDRESS,
  ARBITRUM_MAINNET_CHAIN_ID,
} from '../../constants/hyperLiquidConfig';
import type { PerpsNavigationParamList } from '../../controllers/types';
import {
  usePerpsAccount,
  usePerpsNetwork,
  usePerpsWithdrawQuote,
} from '../../hooks';
import createStyles from './PerpsWithdrawView.styles';

const PerpsWithdrawView: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [shouldBlur, setShouldBlur] = useState(false);

  // Refs
  const inputRef = useRef<TokenInputAreaRef>(null);

  // Hooks
  const cachedAccountState = usePerpsAccount();
  const perpsNetwork = usePerpsNetwork();
  const isTestnet = perpsNetwork === 'testnet';

  // Available balance from perps account
  const availableBalance = useMemo(() => {
    const balance = cachedAccountState?.availableBalance || '0';
    // Remove $ and parse
    return balance.replace('$', '').replace(',', '');
  }, [cachedAccountState]);

  // Source token (Hyperliquid USDC)
  const sourceToken = useMemo<PerpsToken>(() => {
    const hyperliquidChainId = isTestnet
      ? HYPERLIQUID_TESTNET_CHAIN_ID
      : HYPERLIQUID_MAINNET_CHAIN_ID;
    return {
      symbol: USDC_SYMBOL,
      address: ZERO_ADDRESS,
      decimals: USDC_DECIMALS,
      name: USDC_NAME,
      chainId: hyperliquidChainId,
      currencyExchangeRate: 1,
    };
  }, [isTestnet]);

  // Destination token (Arbitrum USDC)
  const destToken = useMemo<PerpsToken>(
    () => ({
      symbol: USDC_SYMBOL,
      address: ZERO_ADDRESS, // Will be actual USDC address on Arbitrum
      decimals: USDC_DECIMALS,
      name: USDC_NAME,
      chainId: ARBITRUM_MAINNET_CHAIN_ID as Hex,
      currencyExchangeRate: 1,
    }),
    [],
  );

  // Use withdrawal quote hook
  const {
    formattedQuoteData,
    hasValidQuote,
    error: quoteError,
  } = usePerpsWithdrawQuote({
    amount: withdrawAmount || '',
  });

  // Validation
  const hasInsufficientBalance = useMemo(() => {
    if (!withdrawAmount || !availableBalance) return false;
    return parseFloat(withdrawAmount) > parseFloat(availableBalance);
  }, [withdrawAmount, availableBalance]);

  const isBelowMinimum = useMemo(() => {
    if (!withdrawAmount) return false;
    return parseFloat(withdrawAmount) <= HYPERLIQUID_WITHDRAWAL_FEE;
  }, [withdrawAmount]);

  // Handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      if (value.length >= MAX_INPUT_LENGTH) {
        return;
      }
      setWithdrawAmount(value || '');
    },
    [],
  );

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      if (!availableBalance || parseFloat(availableBalance) === 0) return;

      const balanceNum = parseFloat(availableBalance);
      const newAmount = (balanceNum * percentage).toFixed(USDC_DECIMALS);
      setWithdrawAmount(newAmount);
    },
    [availableBalance],
  );

  const handleMaxPress = useCallback(() => {
    if (!availableBalance || parseFloat(availableBalance) === 0) return;
    setWithdrawAmount(availableBalance);
  }, [availableBalance]);

  const handleDonePress = useCallback(() => {
    setShouldBlur(true);
    setIsInputFocused(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
    setTimeout(() => setShouldBlur(false), 100);
  }, []);

  const handleContinue = useCallback(() => {
    if (!withdrawAmount || !hasValidQuote) return;

    navigation.navigate(Routes.PERPS.WITHDRAW_PREVIEW, {
      amount: withdrawAmount,
      networkFee: formattedQuoteData.networkFee,
      metamaskFee: formattedQuoteData.metamaskFee,
      totalFees: formattedQuoteData.totalFees,
      receivingAmount: formattedQuoteData.receivingAmount,
      estimatedTime: formattedQuoteData.estimatedTime,
    });
  }, [withdrawAmount, hasValidQuote, formattedQuoteData, navigation]);

  // Button state
  const hasAmount = withdrawAmount && parseFloat(withdrawAmount) > 0;
  const hasValidInputs =
    hasAmount && !hasInsufficientBalance && !isBelowMinimum && hasValidQuote;
  const shouldDisplayQuoteDetails = hasAmount && !quoteError;
  const shouldShowPercentageButtons = isInputFocused || !hasAmount;

  const getButtonLabel = () => {
    if (hasInsufficientBalance)
      return strings('perps.withdrawal.insufficient_funds');
    if (isBelowMinimum)
      return strings('perps.withdrawal.minimum_amount_error', {
        amount: HYPERLIQUID_WITHDRAWAL_FEE + 0.01,
      });
    if (!withdrawAmount || parseFloat(withdrawAmount) === 0)
      return strings('perps.withdrawal.enter_amount');
    return strings('perps.withdrawal.review');
  };

  // Extract numeric value from formatted receiving amount
  const destAmount = useMemo(() => {
    if (formattedQuoteData.receivingAmount) {
      const match = formattedQuoteData.receivingAmount.match(/^([\d.]+)/);
      return match ? match[1] : '0';
    }
    return '0';
  }, [formattedQuoteData.receivingAmount]);

  return (
    // @ts-expect-error The type is incorrect, this will work
    <ScreenView contentContainerStyle={styles.screen}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            iconColor={IconColor.Default}
            style={styles.backButton}
            testID="withdraw-back-button"
          />
          <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
            {strings('perps.withdrawal.title')}
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
              amount={withdrawAmount || undefined}
              token={sourceToken}
              tokenBalance={availableBalance}
              networkImageSource={getNetworkImageSource({
                chainId: sourceToken.chainId,
              })}
              networkName="Hyperliquid"
              testID="source-token-area"
              tokenType={TokenInputAreaType.Source}
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
                <Icon name={IconName.Arrow2Down} size={IconSize.Md} />
              </Box>
            </Box>

            <TokenInputArea
              amount={destAmount}
              token={destToken}
              networkImageSource={getNetworkImageSource({
                chainId: destToken.chainId,
              })}
              networkName="Arbitrum"
              testID="dest-token-area"
              tokenType={TokenInputAreaType.Destination}
            />
          </Box>

          {shouldDisplayQuoteDetails && (
            <Box style={styles.quoteContainer}>
              <PerpsQuoteDetailsCard
                networkFee={formattedQuoteData.networkFee}
                estimatedTime={formattedQuoteData.estimatedTime}
                rate={`1 ${USDC_SYMBOL} = 1 ${USDC_SYMBOL}`}
                metamaskFee={METAMASK_WITHDRAWAL_FEE_PLACEHOLDER}
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
              disabled={!hasValidInputs}
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
            )}

            <Keypad
              style={styles.keypad}
              value={withdrawAmount}
              onChange={handleKeypadChange}
              currency={USDC_SYMBOL}
              decimals={USDC_DECIMALS}
            />
          </View>
        )}

        {!isInputFocused && (
          <View style={styles.fixedBottomContainer}>
            {(quoteError || (isBelowMinimum && hasAmount)) && (
              <Text style={styles.errorText} color={TextColor.Error}>
                {quoteError ||
                  strings('perps.withdrawal.minimum_amount_error', {
                    amount: HYPERLIQUID_WITHDRAWAL_FEE + 0.01,
                  })}
              </Text>
            )}
            <Button
              variant={ButtonVariants.Primary}
              label={getButtonLabel()}
              onPress={handleContinue}
              style={styles.actionButton}
              disabled={!hasValidInputs}
              testID="continue-button"
            />
          </View>
        )}
      </View>
    </ScreenView>
  );
};

export default PerpsWithdrawView;
