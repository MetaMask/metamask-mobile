import React from 'react';
import { StyleSheet } from 'react-native';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import Card from '../../../component-library/components/Cards/Card';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../../UI/Box/Box';
import { FlexDirection, JustifyContent, AlignItems } from '../../UI/Box/box.types';

interface TokenInputAreaProps {
  value: string;
  label?: string;
  tokenSymbol: string;
  tokenAddress?: string;
  isSource?: boolean;
  onPress?: () => void;
}

interface StylesParams {
  theme: Theme;
  vars: Pick<TokenInputAreaProps, never>;
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
    tokenInfo: {
      marginLeft: 8,
      alignItems: 'flex-end',
    },
    value: {
      fontSize: 24,
      color: theme.colors.text.default,
    },
    label: {
      color: theme.colors.text.alternative,
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

export const TokenInputArea: React.FC<TokenInputAreaProps> = ({
  value = '0',
  label,
  tokenSymbol = 'ETH',
  tokenAddress,
  isSource,
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
            {isSource ? `↓ $${value}` : `$${value}`}
          </Text>
          {label && <Text style={styles.label}>{label}</Text>}
        </Box>
        <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center}>
          <Box style={styles.tokenInfo}>
            <Text variant={TextVariant.BodyMD} style={styles.tokenSymbol}>
              {value} {tokenSymbol}
            </Text>
            {tokenAddress && (
              <Text style={styles.tokenAddress}>
                {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
              </Text>
            )}
          </Box>
        </Box>
      </Box>
    </Card>
  );
};
