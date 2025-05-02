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
import { renderNumber } from '../../../../../util/number';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
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
import {
  selectBridgeControllerState,
  setDestTokenExchangeRate,
  setSourceTokenExchangeRate,
} from '../../../../../core/redux/slices/bridge';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF(keyring-snaps)
import { getDisplayCurrencyValue } from '../../utils/exchange-rates';
import { useBridgeExchangeRates } from '../../hooks/useBridgeExchangeRates';

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
  testID?: string;
  tokenType?: TokenInputAreaType;
  onTokenPress?: () => void;
  isLoading?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onInputPress?: () => void;
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
      testID,
      tokenType,
      onTokenPress,
      isLoading = false,
      onFocus,
      onBlur,
      onInputPress,
    },
    ref,
  ) => {
    const currentCurrency = useSelector(selectCurrentCurrency);
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

    // // Data for fiat value calculation
    const evmMultiChainMarketData = useSelector(selectTokenMarketData);
    const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
    const networkConfigurationsByChainId = useSelector(
      selectNetworkConfigurations,
    );
    const { quoteRequest } = useSelector(selectBridgeControllerState);
    const isInsufficientBalance = quoteRequest?.insufficientBal;

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
                {token && currencyValue ? (
                  <Text color={TextColor.Alternative}>{currencyValue}</Text>
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
