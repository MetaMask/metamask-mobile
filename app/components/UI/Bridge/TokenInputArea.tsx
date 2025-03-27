import React from 'react';
import { StyleSheet, ImageSourcePropType } from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../component-library/hooks';
import { Box } from '../Box/Box';
import Text, { TextColor } from '../../../component-library/components/Texts/Text';
import Input from '../../../component-library/components/Form/TextField/foundation/Input';
import { Token } from './Token';
import { selectCurrentCurrency, selectCurrencyRates } from '../../../selectors/currencyRateController';
import { renderNumber, addCurrencySymbol, balanceToFiatNumber } from '../../../util/number';
import { selectTokenMarketData } from '../../../selectors/tokenRatesController';
import { TokenI } from '../Tokens/types';
import { selectNetworkConfigurations } from '../../../selectors/networkController';
import { Hex } from '@metamask/utils';
import { ethers } from 'ethers';

const createStyles = () =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
    },
    content: {
      padding: 16,
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
      lineHeight: 40,
      height: 40,
    },
  });

const formatAddress = (address?: string) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : undefined;

interface GetDisplayFiatValueParams {
  token: TokenI | undefined;
  amount: string | undefined;
  multiChainMarketData: Record<Hex, Record<Hex, { price: number | undefined }>> | undefined;
  networkConfigurationsByChainId: Record<Hex, { nativeCurrency: string }>;
  multiChainCurrencyRates: Record<string, { conversionRate: number | null }> | undefined;
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

  const nativeCurrency = networkConfigurationsByChainId[chainId]?.nativeCurrency;
  const multiChainConversionRate = multiChainCurrencyRates?.[nativeCurrency]?.conversionRate ?? 0;

  const balanceFiatCalculation = Number(
    balanceToFiatNumber(amount, multiChainConversionRate, tokenMarketData?.price ?? 0)
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
interface TokenInputAreaProps {
  amount?: string;
  token?: TokenI;
  tokenBalance?: string;
  networkImageSource?: ImageSourcePropType;
  networkName?: string;
  autoFocus?: boolean;
  isReadonly?: boolean;
  testID?: string;
  tokenType?: TokenInputAreaType;
  onTokenPress?: () => void;
}

export const TokenInputArea: React.FC<TokenInputAreaProps> = ({
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
}) => {
  const { styles } = useStyles(createStyles, {});

  // Data for fiat value calculation
  const currentCurrency = useSelector(selectCurrentCurrency);
  const multiChainMarketData = useSelector(selectTokenMarketData);
  const multiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );

  const fiatValue = getDisplayFiatValue({
    token,
    amount,
    multiChainMarketData,
    networkConfigurationsByChainId,
    multiChainCurrencyRates,
    currentCurrency,
  });

  // Convert non-atomic balance to atomic form and then format it with renderFromTokenMinimalUnit
  const formattedBalance = token?.symbol && tokenBalance ? (
    `${renderNumber(tokenBalance)} ${token?.symbol}`
  ) : undefined;
  const formattedAddress = token?.address && token.address !== ethers.constants.AddressZero ? formatAddress(token?.address) : undefined;

  const subtitle = tokenType === TokenInputAreaType.Source ? formattedBalance : formattedAddress;

  return (
    <Box style={styles.container}>
      <Box style={styles.content} gap={4}>
        <Box style={styles.row}>
          <Box style={styles.amountContainer}>
            <Input
              value={amount}
              style={styles.input}
              isReadonly={isReadonly}
              autoFocus={autoFocus}
              placeholder="0"
              testID={`${testID}-input`}
            />
          </Box>
          <Token
            symbol={token?.symbol}
            iconUrl={token?.image}
            networkImageSource={networkImageSource}
            networkName={networkName}
            testID={testID}
            onPress={onTokenPress}
          />
        </Box>
        <Box style={styles.row}>
          {fiatValue ? (
            <Text color={TextColor.Alternative}>
              {fiatValue}
            </Text>
          ) : null}
          {subtitle ? (
            <Text color={TextColor.Alternative}>
              {subtitle}
            </Text>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
};
