import React from 'react';
import { StyleSheet } from 'react-native';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, AlignItems } from '../Box/box.types';

interface TokenProps {
  value: string;
  symbol: string;
  address?: string;
}

interface StylesParams {
  theme: Theme;
}

const createStyles = (params: StylesParams) => {
  const { theme } = params;
  return StyleSheet.create({
    tokenInfo: {
      marginLeft: 8,
      alignItems: 'flex-end',
    },
    tokenSymbol: {
      color: theme.colors.text.default,
    },
    tokenAddress: {
      color: theme.colors.text.alternative,
      fontSize: 12,
    },
  });
};

export const Token: React.FC<TokenProps> = ({
  value,
  symbol,
  address,
}) => {
  const { styles } = useStyles(createStyles, {});

  return (
    <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center}>
      <Box style={styles.tokenInfo}>
        <Text variant={TextVariant.BodyMD} style={styles.tokenSymbol}>
          {value} {symbol}
        </Text>
        {address && (
          <Text style={styles.tokenAddress}>
            {address.slice(0, 6)}...{address.slice(-4)}
          </Text>
        )}
      </Box>
    </Box>
  );
};
