import React from 'react';
import { StyleSheet, Image, ImageSourcePropType } from 'react-native';
import Text, { TextVariant } from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';

interface TokenProps {
  symbol: string;
  address?: string;
  iconUrl?: ImageSourcePropType;
}

interface StylesParams {
  theme: Theme;
}

const createStyles = (params: StylesParams) => {
  const { theme } = params;
  const { shadows } = theme;
  return StyleSheet.create({
    tokenAddress: {
      color: theme.colors.text.alternative,
      fontSize: 12,
    },
    icon: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    pillContainer: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 16,
      paddingVertical: 4,
      paddingHorizontal: 8,
      marginBottom: 4,
      ...shadows.size.xs,
    },
    tokenSymbol: {
      color: theme.colors.text.default,
    },
    symbolSpacing: {
      marginLeft: 4,
    },
  });
};

export const Token: React.FC<TokenProps> = ({
  symbol,
  address,
  iconUrl,
}) => {
  const { styles } = useStyles(createStyles, {});

  return (
    <Box flexDirection={FlexDirection.Column} alignItems={AlignItems.flexEnd}>
      <Box
        style={styles.pillContainer}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.flexEnd}
      >
        {iconUrl && (
          <Image source={iconUrl} style={styles.icon} />
        )}
        <Box style={styles.symbolSpacing}>
          <Text variant={TextVariant.BodyMD} style={styles.tokenSymbol}>
            {symbol}
          </Text>
        </Box>
      </Box>
      {address && (
        <Text style={styles.tokenAddress}>
          {address.slice(0, 6)}...{address.slice(-4)}
        </Text>
      )}
    </Box>
  );
};
