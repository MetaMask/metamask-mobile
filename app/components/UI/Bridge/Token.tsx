import React from 'react';
import { StyleSheet, Image, ImageSourcePropType, TouchableOpacity } from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, { BadgeVariant } from '../../../component-library/components/Badges/Badge';
import { BOTTOM_BADGEWRAPPER_BADGEPOSITION } from '../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.constants';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

interface TokenProps {
  symbol: string;
  iconUrl?: ImageSourcePropType;
  networkImageSource?: ImageSourcePropType;
  networkName?: string;
}

interface StylesParams {
  theme: Theme;
}

const createStyles = (params: StylesParams) => {
  const { theme } = params;
  const { shadows } = theme;
  return StyleSheet.create({
    icon: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    fallbackIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.background.alternative,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackText: {
      fontSize: 16,
      color: theme.colors.text.default,
      textAlign: 'center',
      textTransform: 'uppercase',
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
  });
};

export const Token: React.FC<TokenProps> = ({
  symbol,
  iconUrl,
  networkImageSource,
  networkName,
}) => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();

  const handlePress = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      params: {},
    });
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Box
        style={styles.pillContainer}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.flexEnd}
        gap={4}
      >
        <BadgeWrapper
          badgePosition={BOTTOM_BADGEWRAPPER_BADGEPOSITION}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImageSource}
              name={networkName}
            />
          }
        >
          {iconUrl ? (
            <Image source={iconUrl} style={styles.icon} />
          ) : (
            <Box style={styles.fallbackIcon}>
              <Text style={styles.fallbackText}>{symbol[0]}</Text>
            </Box>
          )}
        </BadgeWrapper>

          <Text style={styles.tokenSymbol}>
            {symbol}
          </Text>

      </Box>
    </TouchableOpacity>
  );
};
