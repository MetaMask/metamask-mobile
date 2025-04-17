import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, ImageSourcePropType, TextInput } from 'react-native';
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
import {
  renderNumber,
  addCurrencySymbol,
  balanceToFiatNumber,
} from '../../../../../util/number';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { ethers } from 'ethers';
import { BridgeToken } from '../../types';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import Button, {
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { BridgeDestNetworkSelectorRouteParams } from '../BridgeDestNetworkSelector';
import { selectBridgeControllerState } from '../../../../../core/redux/slices/bridge';

const createStyles = () =>
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
      fontSize: 40,
      borderWidth: 0,
      lineHeight: 50,
      height: 50,
    },
  });

const formatAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : undefined;

interface GetDisplayFiatValueParams {
  token: BridgeToken | undefined;
  amount: string | undefined;
  multiChainMarketData:
    | Record<Hex, Record<Hex, { price: number | undefined }>>
    | undefined;
  networkConfigurationsByChainId: Record<Hex, { nativeCurrency: string }>;
  multiChainCurrencyRates:
    | Record<string, { conversionRate: number | null }>
    | undefined;
  currentCurrency: string;
}

export const getDisplayFiatValue = ({
  token,
  amount,
  multiChainMarketData,
  networkConfigurationsByChainId,
  multiChainCurrencyRates,
  currentCurrency,
}: GetDisplayFiatValueParams): string => {
  if (!token || !amount) {
    return addCurrencySymbol('0', currentCurrency);
  }

  const chainId = token.chainId as Hex;
  const multiChainExchangeRates = multiChainMarketData?.[chainId];
  const tokenMarketData = multiChainExchangeRates?.[token.address as Hex];

  const nativeCurrency =
    networkConfigurationsByChainId[chainId]?.nativeCurrency;
  const multiChainConversionRate =
    multiChainCurrencyRates?.[nativeCurrency]?.conversionRate ?? 0;

  const balanceFiatCalculation = Number(
    balanceToFiatNumber(
      amount,
      multiChainConversionRate,
      tokenMarketData?.price ?? 0,
    ),
  );

  if (balanceFiatCalculation >= 0.01 || balanceFiatCalculation === 0) {
    return addCurrencySymbol(balanceFiatCalculation, currentCurrency);
  }

  return `< ${addCurrencySymbol('0.01', currentCurrency)}`;
};

export enum TokenInputAreaType {
  Source = 'source',
  Destination = 'destination',
}

export interface TokenInputAreaRef {
  blur: () => void;
}

interface TokenInputAreaProps {
  amount?: string;
  token?: BridgeToken;
  tokenBalance?: string;
  networkImageSource?: ImageSourcePropType;
  networkName?: string;
  autoFocus?: boolean;
  isReadonly?: boolean;
  testID?: string;
  tokenType?: TokenInputAreaType;
  onTokenPress?: () => void;
  isLoading?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const TokenInputArea = forwardRef<
  TokenInputAreaRef,
  TokenInputAreaProps
>(
  (
    {
      amount,
      token,
      tokenBalance,
      networkImageSource,
      networkName,
      autoFocus,
      isReadonly = false,
      testID,
      tokenType,
      onTokenPress,
      isLoading = false,
      onFocus,
      onBlur,
    },
    ref,
  ) => {
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      blur: () => {
        if (inputRef.current) {
          inputRef.current.blur();
          onBlur?.();
        }
      },
    }));

    const { styles } = useStyles(createStyles, {});
    const navigation = useNavigation();

    const navigateToDestNetworkSelector = () => {
      navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR,
        params: {
          shouldGoToTokens: true,
        } as BridgeDestNetworkSelectorRouteParams,
      });
    };

    // Data for fiat value calculation
    const currentCurrency = useSelector(selectCurrentCurrency);
    const multiChainMarketData = useSelector(selectTokenMarketData);
    const multiChainCurrencyRates = useSelector(selectCurrencyRates);
    const networkConfigurationsByChainId = useSelector(
      selectNetworkConfigurations,
    );
    const { quoteRequest } = useSelector(selectBridgeControllerState);
    const isInsufficientBalance = quoteRequest?.insufficientBal;

    const fiatValue = getDisplayFiatValue({
      token,
      amount,
      multiChainMarketData,
      networkConfigurationsByChainId,
      multiChainCurrencyRates,
      currentCurrency,
    });

    // Convert non-atomic balance to atomic form and then format it with renderFromTokenMinimalUnit
    const formattedBalance =
      token?.symbol && tokenBalance
        ? `${renderNumber(tokenBalance)} ${token?.symbol}`
        : undefined;
    const formattedAddress =
      token?.address && token.address !== ethers.constants.AddressZero
        ? formatAddress(token?.address)
        : undefined;

    const subtitle =
      tokenType === TokenInputAreaType.Source
        ? formattedBalance
        : formattedAddress;

    return (
      <Box>
        <Box style={styles.content} gap={4}>
          <Box style={styles.row}>
            <Box style={styles.amountContainer}>
              {isLoading ? (
                <Skeleton width={100} height={40} style={styles.input} />
              ) : (
                <Input
                  ref={inputRef}
                  value={amount}
                  style={styles.input}
                  isReadonly={isReadonly}
                  autoFocus={autoFocus}
                  placeholder="0"
                  testID={`${testID}-input`}
                  onFocus={() => {
                    onFocus?.();
                  }}
                  onBlur={() => {
                    onBlur?.();
                  }}
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
                label={strings('bridge.bridge_to')}
                onPress={navigateToDestNetworkSelector}
              />
            )}
          </Box>
          <Box style={styles.row}>
            {isLoading ? (
              <Skeleton width={100} height={10} />
            ) : (
              <>
                {token && fiatValue ? (
                  <Text color={TextColor.Alternative}>{fiatValue}</Text>
                ) : null}
                {subtitle ? (
                  <Text
                    color={
                      tokenType === TokenInputAreaType.Source &&
                      isInsufficientBalance
                        ? TextColor.Error
                        : TextColor.Alternative
                    }
                  >
                    {subtitle}
                  </Text>
                ) : null}
              </>
            )}
          </Box>
        </Box>
      </Box>
    );
  },
);
