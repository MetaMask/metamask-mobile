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
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { ethers, BigNumber } from 'ethers';
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
  selectIsUnifiedSwapsEnabled,
  setDestTokenExchangeRate,
  setSourceTokenExchangeRate,
} from '../../../../../core/redux/slices/bridge';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF(keyring-snaps)
import { getDisplayCurrencyValue } from '../../utils/exchange-rates';
import { useBridgeExchangeRates } from '../../hooks/useBridgeExchangeRates';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import parseAmount from '../../../Ramp/Aggregator/utils/parseAmount';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';
import { renderShortAddress } from '../../../../../util/address';
import { FlexDirection } from '../../../Box/box.types';

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

const createStyles = ({ vars }: { vars: { fontSize: number } }) =>
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
      lineHeight: 50,
      height: 50,
      fontSize: vars.fontSize,
    },
    currencyContainer: {
      flex: 1,
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

export const getDisplayAmount = (
  amount?: string,
  tokenType?: TokenInputAreaType,
) => {
  if (amount === undefined) return amount;

  const displayAmount =
    tokenType === TokenInputAreaType.Source
      ? amount
      : parseAmount(amount, MAX_DECIMALS);

  return displayAmount;
};

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
  onMaxPress?: () => void;
  latestAtomicBalance?: BigNumber;
  isSourceToken?: boolean;
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
      onMaxPress,
      latestAtomicBalance,
      isSourceToken,
    },
    ref,
  ) => {
    const currentCurrency = useSelector(selectCurrentCurrency);

    const isUnifiedSwapsEnabled = useSelector(selectIsUnifiedSwapsEnabled);

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
    const formattedAddress =
      token?.address && token.address !== ethers.constants.AddressZero
        ? formatAddress(token?.address)
        : undefined;

    const subtitle =
      tokenType === TokenInputAreaType.Source
        ? formattedBalance
        : formattedAddress;

    const displayedAmount = getDisplayAmount(amount, tokenType);
    const fontSize = calculateFontSize(displayedAmount?.length ?? 0);
    const { styles } = useStyles(createStyles, { fontSize });

    // TODO come up with a more robust way to check if the asset is native
    // Maybe a util in BridgeController
    const isNativeAsset =
      token?.address === ethers.constants.AddressZero ||
      token?.address === 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';

    let tokenButtonText = isUnifiedSwapsEnabled
      ? 'bridge.swap_to'
      : 'bridge.bridge_to';
    if (isSourceToken) {
      tokenButtonText = isUnifiedSwapsEnabled
        ? 'bridge.swap_from'
        : 'bridge.bridge_from';
    }

    return (
      <Box>
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
                {subtitle ? (
                  tokenType === TokenInputAreaType.Source &&
                  tokenBalance &&
                  onMaxPress &&
                  !isNativeAsset ? (
                    <Box flexDirection={FlexDirection.Row} gap={4}>
                      <Text
                        color={
                          isInsufficientBalance
                            ? TextColor.Error
                            : TextColor.Alternative
                        }
                      >
                        {subtitle}
                      </Text>
                      <Button
                        variant={ButtonVariants.Link}
                        label={strings('bridge.max')}
                        onPress={onMaxPress}
                      />
                    </Box>
                  ) : (
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
                  )
                ) : null}
              </>
            )}
          </Box>
        </Box>
      </Box>
    );
  },
);
