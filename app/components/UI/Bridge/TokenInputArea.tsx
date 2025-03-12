import React from 'react';
import { StyleSheet, ImageSourcePropType } from 'react-native';
import { useSelector } from 'react-redux';
import { useStyles } from '../../../component-library/hooks';
import { Box } from '../Box/Box';
import Text, { TextColor } from '../../../component-library/components/Texts/Text';
import Input from '../../../component-library/components/Form/TextField/foundation/Input';
import { Token } from './Token';
import { selectCurrentCurrency, selectConversionRate } from '../../../selectors/currencyRateController';
import { weiToFiat, toWei } from '../../../util/number';

interface TokenInputAreaProps {
  value?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  tokenBalance?: string;
  tokenIconUrl?: ImageSourcePropType;
  networkImageSource?: ImageSourcePropType;
  networkName?: string;
  autoFocus?: boolean;
  isReadonly?: boolean;
  testID?: string;
}

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

export const TokenInputArea: React.FC<TokenInputAreaProps> = ({
  value,
  tokenSymbol,
  tokenAddress,
  tokenBalance,
  tokenIconUrl,
  networkImageSource,
  networkName,
  autoFocus,
  isReadonly = false,
  testID,
}) => {
  const { styles } = useStyles(createStyles, {});
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRate = useSelector(selectConversionRate);

  const formattedBalance = tokenSymbol && tokenBalance ? `${tokenBalance} ${tokenSymbol}` : undefined;
  const formattedAddress = tokenAddress ? formatAddress(tokenAddress) : undefined;

  const subtitle = formattedBalance ?? formattedAddress;

  // Convert token amount to fiat value using actual conversion rate
  const weiAmount = toWei(value ?? '0');
  const fiatValue = conversionRate
    ? weiToFiat(weiAmount, conversionRate, currentCurrency)
    : undefined;

  return (
    <Box style={styles.container}>
      <Box style={styles.content} gap={4}>
        <Box style={styles.row}>
          <Box style={styles.amountContainer}>
            <Input
              value={value}
              style={styles.input}
              isReadonly={isReadonly}
              autoFocus={autoFocus}
              placeholder="0"
              testID={`${testID}-input`}
            />
          </Box>
          <Token
            symbol={tokenSymbol}
            iconUrl={tokenIconUrl}
            networkImageSource={networkImageSource}
            networkName={networkName}
            testID={testID}
          />
        </Box>
        <Box style={styles.row}>
          {fiatValue && (
            <Text color={TextColor.Alternative}>
              {fiatValue}
            </Text>
          )}
          {subtitle && (
            <Text color={TextColor.Alternative}>
              {subtitle}
            </Text>
          )}
        </Box>
      </Box>
    </Box>
  );
};
