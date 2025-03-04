import React from 'react';
import { StyleSheet } from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import Card from '../../../component-library/components/Cards/Card';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../Box/box.types';
import { Token } from './Token';

interface TokenInputAreaProps {
  value: string;
  label?: string;
  tokenSymbol: string;
  tokenAddress?: string;
  onPress?: () => void;
}

interface StylesParams {
  theme: Theme;
}

const createStyles = (params: StylesParams) => {
  const { theme } = params;
  return StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    content: {
      padding: 16,
    },
    amountContainer: {
      flex: 1,
    },
    value: {
      fontSize: 24,
      color: theme.colors.text.default,
    },
    label: {
      color: theme.colors.text.alternative,
    },
  });
};

export const TokenInputArea: React.FC<TokenInputAreaProps> = ({
  value = '0',
  label,
  tokenSymbol = 'ETH',
  tokenAddress,
  onPress,
}) => {
  const { styles } = useStyles(createStyles, {});

  return (
    <Card style={styles.container} onPress={onPress}>
      <Box
        style={styles.content}
        flexDirection={FlexDirection.Row}
        justifyContent={JustifyContent.spaceBetween}
        alignItems={AlignItems.center}
      >
        <Box style={styles.amountContainer}>
          <Text style={styles.value}>
            ${value}
          </Text>
          {label && <Text style={styles.label}>{label}</Text>}
        </Box>
        <Token
          value={value}
          symbol={tokenSymbol}
          address={tokenAddress}
        />
      </Box>
    </Card>
  );
};
