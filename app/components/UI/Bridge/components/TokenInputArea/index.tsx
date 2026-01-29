import React, { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import {
  StyleSheet,
  ImageSourcePropType,
  TextInput,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../../../component-library/hooks';
import { Box } from '../../../Box/Box';
import Text, {
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Input from '../../../../../component-library/components/Form/TextField/foundation/Input';
import { TokenButton } from '../TokenButton';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { BigNumber } from 'ethers';
import { BridgeToken } from '../../types';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { BridgeDestNetworkSelectorRouteParams } from '../BridgeDestNetworkSelector';
import {
  setDestTokenExchangeRate,
  setSourceTokenExchangeRate,
  selectIsGaslessSwapEnabled,
} from '../../../../../core/redux/slices/bridge';
import { RootState } from '../../../../../reducers';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF(keyring-snaps)
import { getDisplayCurrencyValue } from '../../utils/exchange-rates';
import { useBridgeExchangeRates } from '../../hooks/useBridgeExchangeRates';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { renderShortAddress } from '../../../../../util/address';
import { FlexDirection } from '../../../Box/box.types';
import { isNativeAddress } from '@metamask/bridge-controller';
import { Theme } from '../../../../../util/theme/models';
import parseAmount from '../../../../../util/parseAmount';
import { useTokenAddress } from '../../hooks/useTokenAddress';

const MAX_DECIMALS = 5;
export const MAX_INPUT_LENGTH = 36;

/**
 * Calculates font size based on input length
 */
export const calculateFontSize = (length: number): number => {
  if (length <= 10) return 40;
  if (length <= 15) return 35;
  if (length <= 20) return 30;
  if (length <= 25) return 25;
  return 20;
};

const createStyles = ({
  vars,
  theme,
}: {
  vars: { fontSize: number; hidden: boolean };
  theme: Theme;
}) =>
  StyleSheet.create({
    content: {
      paddingVertical: 16,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    amountContainer: {
      flex: 1,
    },
    input: {
      borderWidth: 0,
      lineHeight: vars.fontSize * 1.25,
      height: vars.fontSize * 1.25,
      fontSize: vars.fontSize,
    },
    currencyContainer: {
      flex: 1,
    },
    maxButton: {
      color: theme.colors.text.default,
    },
    hidden: {
      opacity: vars.hidden ? 0 : 1,
    },
  });

export enum TokenInputAreaType {
  Source = 'source',
  Destination = 'destination',
}

const formatAddress = (address?: string) => {
  if (!address) return undefined;

  if (isCaipAssetType(address)) {
    const { assetReference } = parseCaipAssetType(address);
    return renderShortAddress(assetReference, 4);
  }
  return renderShortAddress(address, 4);
};

/**
 * Formats a number string with locale-appropriate separators
 * Uses Intl.NumberFormat to respect user's locale (e.g., en-US uses commas, de-DE uses periods)
 */
const formatWithLocaleSeparators = (value: string): string => {
  if (!value || value === '0') return value;

  const numericValue = parseFloat(value);
  if (isNaN(numericValue)) return value;

  // Determine the number of decimal places in the original value
  const decimalPlaces = value.includes('.')
    ? value.split('.')[1]?.length || 0
    : 0;

  try {
    // Format with locale-appropriate separators using user's locale
    const formatted = getIntlNumberFormatter(I18n.locale, {
      useGrouping: true,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(numericValue);

    return formatted;
  } catch (error) {
    // Fallback to simple comma formatting if Intl fails
    console.error('Number formatting error:', error);
    return value;
  }
};

export const getDisplayAmount = (
  amount?: string,
  tokenType?: TokenInputAreaType,
  isMaxAmount?: boolean,
) => {
  if (amount === undefined) return amount;

  // Only truncate for display when:
  // 1. Amount came from Max button (isMaxAmount = true), OR
  // 2. Destination token (always truncate)
  const shouldTruncate =
    tokenType === TokenInputAreaType.Destination || isMaxAmount;

  const displayAmount = shouldTruncate
    ? parseAmount(amount, MAX_DECIMALS)
    : amount;

  // Format with locale-appropriate separators
  if (displayAmount && displayAmount !== '0') {
    return formatWithLocaleSeparators(displayAmount);
  }

  return displayAmount;
};

export interface TokenInputAreaRef {
  blur: () => void;
}

interface TokenInputAreaProps {
  amount?: string;
  isMaxAmount?: boolean;
  token?: BridgeToken;
  tokenBalance?: string;
  networkImageSource?: ImageSourcePropType;
  networkName?: string;
  testID?: string;
  tokenType?: TokenInputAreaType;
  onTokenPress?: () => void;
  isLoading?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onInputPress?: () => void;
  onMaxPress?: () => void;
  latestAtomicBalance?: BigNumber;
  isSourceToken?: boolean;
  style?: StyleProp<ViewStyle>;
  isQuoteSponsored?: boolean;
}

export const TokenInputArea = forwardRef<
  TokenInputAreaRef,
  TokenInputAreaProps
>(
  (
    {
      amount,
      isMaxAmount = false,
      token,
      tokenBalance,
      networkImageSource,
      networkName,
      testID,
      tokenType,
      onTokenPress,
      isLoading = false,
      onFocus,
      onBlur,
      onInputPress,
      onMaxPress,
      latestAtomicBalance,
      isSourceToken,
      style,
      isQuoteSponsored = false,
    },
    ref,
  ) => {
    const currentCurrency = useSelector(selectCurrentCurrency);

    const isGaslessSwapEnabled = useSelector((state: RootState) =>
      token?.chainId ? selectIsGaslessSwapEnabled(state, token.chainId) : false,
    );

    // Need to fetch the exchange rate for the token if we don't have it already
    useBridgeExchangeRates({
      token,
      currencyOverride: currentCurrency,
      action:
        tokenType === TokenInputAreaType.Source
          ? setSourceTokenExchangeRate
          : setDestTokenExchangeRate,
    });

    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      blur: () => {
        if (inputRef.current) {
          inputRef.current.blur();
          onBlur?.();
        }
      },
    }));

    const navigation = useNavigation();

    const navigateToDestNetworkSelector = () => {
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
        params: {
          shouldGoToTokens: true,
        } as BridgeDestNetworkSelectorRouteParams,
      });
    };

    const navigateToSourceTokenSelector = () => {
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.SOURCE_TOKEN_SELECTOR,
      });
    };

    // // Data for fiat value calculation
    const evmMultiChainMarketData = useSelector(selectTokenMarketData);
    const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
    const networkConfigurationsByChainId = useSelector(
      selectNetworkConfigurations,
    );

    const isInsufficientBalance = useIsInsufficientBalance({
      amount,
      token,
      latestAtomicBalance,
    });

    let nonEvmMultichainAssetRates = {};
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    nonEvmMultichainAssetRates = useSelector(selectMultichainAssetsRates);
    ///: END:ONLY_INCLUDE_IF(keyring-snaps)

    const currencyValue = getDisplayCurrencyValue({
      token,
      amount,
      evmMultiChainMarketData,
      networkConfigurationsByChainId,
      evmMultiChainCurrencyRates,
      currentCurrency,
      nonEvmMultichainAssetRates,
    });

    // Convert non-atomic balance to atomic form and then format it with renderFromTokenMinimalUnit
    const parsedTokenBalance = parseFloat(tokenBalance || '0');
    const roundedTokenBalance =
      Math.floor(parsedTokenBalance * 100000) / 100000;
    const formattedBalance =
      token?.symbol && tokenBalance
        ? `${roundedTokenBalance.toFixed(5).replace(/\.?0+$/, '')} ${
            token?.symbol
          }`
        : undefined;

    const tokenAddress = useTokenAddress(token);

    const isNativeAsset = isNativeAddress(tokenAddress);

    // Show max button for native tokens if gasless swap is enabled OR quote is sponsored
    const shouldShowMaxButton = useMemo(() => {
      if (!isNativeAsset) return true; // Always show for non-native tokens
      return isGaslessSwapEnabled || isQuoteSponsored;
    }, [isNativeAsset, isGaslessSwapEnabled, isQuoteSponsored]);
    const formattedAddress =
      tokenAddress && !isNativeAsset ? formatAddress(tokenAddress) : undefined;

    const subtitle =
      tokenType === TokenInputAreaType.Source
        ? formattedBalance
        : formattedAddress;

    const displayedAmount = getDisplayAmount(amount, tokenType, isMaxAmount);
    const fontSize = calculateFontSize(displayedAmount?.length ?? 0);
    const { styles } = useStyles(createStyles, { fontSize, hidden: !subtitle });

    let tokenButtonText = 'bridge.swap_to';
    if (isSourceToken) {
      tokenButtonText = 'bridge.swap_from';
    }

    return (
      <Box style={style}>
        <Box style={styles.content} gap={4}>
          <Box style={styles.row}>
            <Box style={styles.amountContainer}>
              {isLoading ? (
                <Skeleton width="50%" height="80%" style={styles.input} />
              ) : (
                <Input
                  ref={inputRef}
                  value={displayedAmount}
                  style={styles.input}
                  isDisabled={false}
                  isReadonly={tokenType === TokenInputAreaType.Destination}
                  showSoftInputOnFocus={false}
                  caretHidden={false}
                  autoFocus
                  placeholder="0"
                  testID={`${testID}-input`}
                  onFocus={() => {
                    onFocus?.();
                    onInputPress?.();
                  }}
                  onBlur={() => {
                    onBlur?.();
                  }}
                  // Android only issue, for long numbers, the input field will focus on the right hand side
                  // Force it to focus on the left hand side
                  selection={
                    tokenType === TokenInputAreaType.Destination
                      ? { start: 0, end: 0 }
                      : undefined
                  }
                />
              )}
            </Box>
            {token ? (
              <TokenButton
                symbol={token?.symbol}
                iconUrl={token?.image}
                networkImageSource={networkImageSource}
                networkName={networkName}
                testID={testID}
                onPress={onTokenPress}
              />
            ) : (
              <Button
                variant={ButtonVariants.Primary}
                label={strings(tokenButtonText)}
                onPress={
                  isSourceToken
                    ? navigateToSourceTokenSelector
                    : navigateToDestNetworkSelector
                }
              />
            )}
          </Box>
          <Box style={styles.row}>
            {isLoading ? (
              <Skeleton width={80} height={24} />
            ) : (
              <>
                <Box style={styles.currencyContainer}>
                  {token && amount && Number(amount) > 0 && currencyValue ? (
                    <Text color={TextColor.Alternative}>{currencyValue}</Text>
                  ) : null}
                </Box>
                <Box
                  flexDirection={
                    tokenType === TokenInputAreaType.Source &&
                    tokenBalance &&
                    onMaxPress &&
                    shouldShowMaxButton
                      ? FlexDirection.Row
                      : FlexDirection.Column
                  }
                  gap={4}
                  style={styles.hidden}
                >
                  <Text
                    color={
                      isInsufficientBalance
                        ? TextColor.Error
                        : TextColor.Alternative
                    }
                  >
                    {subtitle}
                  </Text>
                  {tokenType === TokenInputAreaType.Source &&
                    tokenBalance &&
                    onMaxPress &&
                    shouldShowMaxButton && (
                      <Button
                        variant={ButtonVariants.Link}
                        label={strings('bridge.max')}
                        onPress={onMaxPress}
                        disabled={!subtitle}
                        testID="token-input-area-max-button"
                      />
                    )}
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Box>
    );
  },
);

TokenInputArea.displayName = 'TokenInputArea';
