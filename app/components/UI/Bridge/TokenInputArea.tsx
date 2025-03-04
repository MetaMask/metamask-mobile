import React from 'react';
import { StyleSheet, ImageSourcePropType } from 'react-native';
import TextField, { TextFieldSize } from '../../../component-library/components/Form/TextField';
import { useStyles } from '../../../component-library/hooks';
import { Box } from '../Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../Box/box.types';
import { Token } from './Token';

interface TokenInputAreaProps {
  value: string;
  tokenSymbol: string;
  tokenAddress?: string;
  tokenBalance?: string;
  tokenIconUrl?: ImageSourcePropType;
}

const createStyles = () =>
  StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    content: {
      padding: 16,
    },
    amountContainer: {
      flex: 1,
    },
    textField: {
      fontSize: 40,
      borderWidth: 0,
      padding: 0,
    },
  });

const formatAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

export const TokenInputArea: React.FC<TokenInputAreaProps> = ({
  value = '0',
  tokenSymbol = 'ETH',
  tokenAddress,
  tokenBalance,
  tokenIconUrl,
}) => {
  const { styles } = useStyles(createStyles, {});

  const formattedBalance = tokenBalance ? `${tokenBalance} ${tokenSymbol}` : undefined;
  const formattedAddress = tokenAddress ? formatAddress(tokenAddress) : undefined;

  const subtitle = formattedBalance ?? formattedAddress;

  return (
    <Box style={styles.container}>
      <Box
        style={styles.content}
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        alignItems={AlignItems.center}
      >
        <Box style={styles.amountContainer}>
          <TextField
            value={value}
            style={styles.textField}
            isDisabled
            placeholder="0"
            size={TextFieldSize.Lg}
          />
        </Box>
        <Token
          symbol={tokenSymbol}
          subtitle={subtitle}
          iconUrl={tokenIconUrl}
        />
      </Box>
    </Box>
  );
};
