import React from 'react';
import {
  StyleSheet,
  ImageSourcePropType,
  TouchableOpacity,
} from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../component-library/hooks';
import { Theme } from '../../../../util/theme/models';
import { Box } from '../../Box/Box';
import { FlexDirection, AlignItems, JustifyContent } from '../../Box/box.types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../component-library/components/Badges/Badge';
import TokenIcon from '../../Swaps/components/TokenIcon';

interface TokenProps {
  symbol?: string;
  iconUrl?: string;
  networkImageSource?: ImageSourcePropType;
  networkName?: string;
  testID?: string;
  onPress?: () => void;
}

interface StylesParams {
  theme: Theme;
}

const createStyles = (params: StylesParams) => {
  const { theme } = params;
  return StyleSheet.create({
    icon: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    pillContainer: {
      backgroundColor: theme.colors.background.section,
      borderRadius: 100,
      paddingLeft: 8,
      paddingVertical: 8,
      paddingRight: 11,
    },
    tokenSymbol: {
      color: theme.colors.text.default,
      fontSize: 24,
    },
  });
};

export const TokenButton: React.FC<TokenProps> = ({
  symbol,
  iconUrl,
  networkImageSource,
  networkName,
  testID,
  onPress,
}) => {
  const { styles } = useStyles(createStyles, {});
  return (
    <TouchableOpacity onPress={onPress} testID={testID}>
      <Box
        style={styles.pillContainer}
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.flexEnd}
        justifyContent={JustifyContent.flexEnd}
        gap={8}
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

        <Text style={styles.tokenSymbol} variant={TextVariant.BodyMDMedium}>
          {symbol}
        </Text>
      </Box>
    </TouchableOpacity>
  );
};
