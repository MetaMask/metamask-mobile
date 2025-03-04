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

export const TokenInputArea: React.FC<TokenInputAreaProps> = ({
  value = '0',
  tokenSymbol = 'ETH',
  tokenAddress,
  tokenIconUrl,
}) => {
  const { styles } = useStyles(createStyles, {});

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
          address={tokenAddress}
          iconUrl={tokenIconUrl}
        />
      </Box>
    </Box>
  );
};
