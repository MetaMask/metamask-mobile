import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useStyles } from '../../../../../component-library/hooks';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
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
import {
  HYPERLIQUID_ASSET_CONFIGS,
  METAMASK_WITHDRAWAL_FEE_PLACEHOLDER,
  USDC_DECIMALS,
  USDC_SYMBOL,
} from '../../constants/hyperLiquidConfig';
import type { PerpsNavigationParamList } from '../../controllers/types';
import {
  usePerpsNetwork,
  usePerpsTrading,
  usePerpsWithdrawQuote,
  useWithdrawTokens,
  useWithdrawValidation,
} from '../../hooks';
import createStyles from './PerpsWithdrawView.styles';
import { PerpsWithdrawViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

const PerpsWithdrawView: React.FC = () => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation<NavigationProp<PerpsNavigationParamList>>();

  // State
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [shouldBlur, setShouldBlur] = useState(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Refs
  const inputRef = useRef<TokenInputAreaRef>(null);

  // Hooks
  const { toastRef } = useContext(ToastContext);
  const { withdraw } = usePerpsTrading();
  const perpsNetwork = usePerpsNetwork();
  const isTestnet = perpsNetwork === 'testnet';

  // TODO: Get network names dynamically once we implement multiple protocol
  const sourceNetworkName = useMemo(() => 'Hyperliquid', []);
  const destNetworkName = useMemo(
    () => (isTestnet ? 'Arbitrum Sepolia' : 'Arbitrum'),
    [isTestnet],
  );

  // Custom hooks for business logic
  const { sourceToken, destToken } = useWithdrawTokens();

  const {
    availableBalance,
    hasInsufficientBalance,
    isBelowMinimum,
    hasAmount,
    getButtonLabel,
    getMinimumAmount,
  } = useWithdrawValidation({ withdrawAmount });

  const {
    formattedQuoteData,
    hasValidQuote,
    error: quoteError,
  } = usePerpsWithdrawQuote({
    amount: withdrawAmount || '',
  });

  // UI Handlers (kept in component since they're view-specific)
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

  const handleContinue = useCallback(async () => {
    if (!withdrawAmount || !hasValidQuote) return;

    // Additional validation
    const withdrawAmountNum = parseFloat(withdrawAmount);
    if (isNaN(withdrawAmountNum) || withdrawAmountNum <= 0) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: strings('perps.withdrawal.error'),
            isBold: true,
          },
          {
            label: strings('perps.withdrawal.invalid_amount'),
          },
        ],
      });
      return;
    }

    try {
      setIsSubmittingTx(true);

      // Show toast about withdrawal initiation
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: strings('perps.withdrawal.initiated'),
            isBold: true,
          },
          {
            label: strings('perps.withdrawal.wait_time_message'),
          },
        ],
      });

      // Get the correct assetId for USDC on Arbitrum
      const usdcAssetId = isTestnet
        ? HYPERLIQUID_ASSET_CONFIGS.USDC.testnet
        : HYPERLIQUID_ASSET_CONFIGS.USDC.mainnet;

      DevLogger.log('🔍 PerpsWithdrawView: Withdrawal params', {
        amount: withdrawAmount,
        assetId: usdcAssetId,
        isTestnet,
      });

      // Initiate withdrawal with required assetId
      const result = await withdraw({
        amount: withdrawAmount,
        assetId: usdcAssetId,
      });

      if (result.success) {
        // Show success toast - funds will arrive within 5 minutes
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.ArrowUp,
          hasNoTimeout: false,
          labelOptions: [
            {
              label: strings('perps.withdrawal.success_toast', {
                amount: withdrawAmount,
                symbol: 'USDC',
              }),
              isBold: false,
            },
            {
              label: strings('perps.withdrawal.arrival_time'),
              isBold: false,
            },
          ],
        });

        // Navigate back immediately - the toast will persist since it's rendered globally
        navigation.goBack();
      } else {
        // Show error toast - do NOT navigate back on error
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Danger,
          hasNoTimeout: false,
          labelOptions: [
            {
              label: strings('perps.withdrawal.error'),
              isBold: true,
            },
            {
              label: result.error || strings('perps.withdrawal.error_generic'),
            },
          ],
        });
      }
    } catch (error) {
      // Show error toast - do NOT navigate back on error
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: strings('perps.withdrawal.error'),
            isBold: true,
          },
          {
            label:
              error instanceof Error
                ? error.message
                : strings('perps.withdrawal.error_generic'),
          },
        ],
      });
    } finally {
      setIsSubmittingTx(false);
    }
  }, [
    withdrawAmount,
    hasValidQuote,
    toastRef,
    isTestnet,
    withdraw,
    navigation,
  ]);

  // UI state calculations
  const hasValidInputs =
    hasAmount && !hasInsufficientBalance && !isBelowMinimum && hasValidQuote;
  const shouldDisplayQuoteDetails = hasAmount && !quoteError;
  const shouldShowPercentageButtons = isInputFocused || !hasAmount;

  // Extract numeric value from formatted receiving amount
  const destAmount = useMemo(() => {
    if (formattedQuoteData.receivingAmount) {
      const match = formattedQuoteData.receivingAmount.match(/^([\d.]+)/);
      return match ? match[1] : '0';
    }
    return '0';
  }, [formattedQuoteData.receivingAmount]);

  // Get network image for destination chain
  const destNetworkImage = getNetworkImageSource({
    chainId: destToken.chainId,
  });

  const { top } = useSafeAreaInsets();

  return (
    // @ts-expect-error The type is incorrect, this will work
    <ScreenView contentContainerStyle={[styles.screen, { paddingTop: top }]}>
      <View style={styles.container}>
        <View style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            onPress={handleBack}
            iconColor={IconColor.Default}
            style={styles.backButton}
            testID={PerpsWithdrawViewSelectorsIDs.BACK_BUTTON}
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
              networkName={sourceNetworkName}
              testID={PerpsWithdrawViewSelectorsIDs.SOURCE_TOKEN_AREA}
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
                <Icon name={IconName.Arrow2Down} size={IconSize.Xl} />
              </Box>
            </Box>

            <TokenInputArea
              amount={destAmount}
              token={destToken}
              networkImageSource={destNetworkImage}
              networkName={destNetworkName}
              testID={PerpsWithdrawViewSelectorsIDs.DEST_TOKEN_AREA}
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
                direction="withdrawal"
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
              disabled={!hasValidInputs || isSubmittingTx}
              loading={isSubmittingTx}
              testID={PerpsWithdrawViewSelectorsIDs.CONTINUE_BUTTON}
            />

            {shouldShowPercentageButtons && (
              <View style={styles.percentageButtonsRow}>
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Md}
                  label={strings('perps.withdrawal.percentage_10')}
                  onPress={() => handlePercentagePress(0.1)}
                  style={styles.percentageButton}
                />
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Md}
                  label={strings('perps.withdrawal.percentage_25')}
                  onPress={() => handlePercentagePress(0.25)}
                  style={styles.percentageButton}
                />
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Md}
                  label={strings('perps.withdrawal.max')}
                  onPress={handleMaxPress}
                  style={styles.percentageButton}
                />
                <Button
                  variant={ButtonVariants.Secondary}
                  size={ButtonSize.Md}
                  label={strings('perps.withdrawal.done')}
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
                    amount: getMinimumAmount(),
                  })}
              </Text>
            )}
            <Button
              variant={ButtonVariants.Primary}
              label={getButtonLabel()}
              onPress={handleContinue}
              style={styles.actionButton}
              disabled={!hasValidInputs || isSubmittingTx}
              loading={isSubmittingTx}
              testID={PerpsWithdrawViewSelectorsIDs.CONTINUE_BUTTON}
            />
          </View>
        )}
      </View>
    </ScreenView>
  );
};

export default PerpsWithdrawView;
