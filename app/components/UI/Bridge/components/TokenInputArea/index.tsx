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
import { CaipAssetType, Hex } from '@metamask/utils';
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
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
import { isSolanaChainId } from '@metamask/bridge-controller';

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
  nonEvmMultichainAssetRates: ReturnType<typeof selectMultichainAssetsRates>;
}

export const getDisplayFiatValue = ({
  token,
  amount,
  multiChainMarketData, // EVM
  networkConfigurationsByChainId,
  multiChainCurrencyRates, // EVM
  currentCurrency,
  nonEvmMultichainAssetRates, // Non-EVM
}: GetDisplayFiatValueParams): string => {
  if (!token || !amount) {
    return addCurrencySymbol('0', currentCurrency);
  }

  let balanceFiatCalculation = 0;

  if (isSolanaChainId(token.chainId)) {
    const assetId = token.address as CaipAssetType;
    // This rate is asset to fiat. Whatever the user selected display fiat currency is.
    // We don't need to have an additional conversion from native token to fiat.
    const rate = nonEvmMultichainAssetRates?.[assetId]?.rate || '0';
    balanceFiatCalculation = Number(
      balanceToFiatNumber(amount, Number(rate), 1),
    );
  } else {
    // EVM
    const evmChainId = token.chainId as Hex;
    const multiChainExchangeRates = multiChainMarketData?.[evmChainId];
    const tokenMarketData = multiChainExchangeRates?.[token.address as Hex];

    const nativeCurrency =
      networkConfigurationsByChainId[evmChainId]?.nativeCurrency;
    const multiChainConversionRate =
      multiChainCurrencyRates?.[nativeCurrency]?.conversionRate ?? 0;

    balanceFiatCalculation = Number(
      balanceToFiatNumber(
        amount,
        multiChainConversionRate,
        tokenMarketData?.price ?? 0,
      ),
    );
  }

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

    let nonEvmMultichainAssetRates = {};
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    nonEvmMultichainAssetRates = useSelector(selectMultichainAssetsRates);
    ///: END:ONLY_INCLUDE_IF(keyring-snaps)

    const fiatValue = getDisplayFiatValue({
      token,
      amount,
      multiChainMarketData,
      networkConfigurationsByChainId,
      multiChainCurrencyRates,
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
