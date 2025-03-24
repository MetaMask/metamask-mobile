import React from 'react';
import {
  StyleSheet,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import Text from '../../../component-library/components/Texts/Text';
import { useStyles } from '../../../component-library/hooks';
import { Theme } from '../../../util/theme/models';
import { Box } from '../Box/Box';
import { FlexDirection, AlignItems, JustifyContent } from '../Box/box.types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import TokenIcon from '../Swaps/components/TokenIcon';

interface TokenProps {
  symbol?: string;
  iconUrl?: string;
  networkImageSource?: ImageSourcePropType;
  networkName?: string;
  testID?: string;
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
  testID,
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
    <TouchableOpacity onPress={handlePress} testID={testID}>
      <Box
        style={styles.pillContainer}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.flexEnd}
        gap={4}
      >
        <BadgeWrapper
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImageSource}
              name={networkName}
            />
          }
        >
          <TokenIcon symbol={symbol} icon={iconUrl} style={styles.icon} />
        </BadgeWrapper>

        <Text style={styles.tokenSymbol}>{symbol}</Text>
      </Box>
    </TouchableOpacity>
  );
};
