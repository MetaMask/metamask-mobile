import React from 'react';
import { StyleSheet, Image, ImageSourcePropType } from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';

interface TokenProps {
  symbol: string;
  iconUrl?: ImageSourcePropType;
}

interface StylesParams {
  theme: Theme;
}

const createStyles = (params: StylesParams) => {
  const { theme } = params;
  const { shadows } = theme;
  return StyleSheet.create({
    icon: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    pillContainer: {
      backgroundColor: theme.colors.background.default,
      borderRadius: 100,
      paddingVertical: 8,
      paddingHorizontal: 12,
      ...shadows.size.xs,
    },
    tokenSymbol: {
      color: theme.colors.text.default,
      fontSize: 24,
      lineHeight: 28,
    },
    symbolSpacing: {
      marginLeft: 4,
    },
  });
};

export const Token: React.FC<TokenProps> = ({
  symbol,
  iconUrl,
}) => {
  const { styles } = useStyles(createStyles, {});

  return (
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
        <Text style={styles.tokenSymbol}>
          {symbol}
        </Text>
      </Box>
    </Box>
  );
};
