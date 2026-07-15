import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Image,
  type TextStyle,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useStyles } from '../../../../../component-library/hooks';
import WebsiteIcon from '../../../../UI/WebsiteIcon';
import type { SiteData } from '../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type { Theme } from '../../../../../util/theme/models';

export const SITE_TILE_WIDTH = 180;
export const SITE_TILE_HEIGHT = 120;
export const SITE_TILE_BORDER_RADIUS = 12;

const LOGO_SIZE = 40;

const websiteIconTextStyle: TextStyle = { fontSize: 12 };

const styleSheet = ({ theme }: { theme: Theme }) =>
  StyleSheet.create({
    card: {
      width: SITE_TILE_WIDTH,
      height: SITE_TILE_HEIGHT,
      backgroundColor: theme.colors.background.section,
      borderRadius: SITE_TILE_BORDER_RADIUS,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    websiteIcon: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      borderRadius: LOGO_SIZE / 2,
    },
  });

interface SiteTileRowItemProps {
  site: SiteData;
  /** Called synchronously before the card's navigation press fires. */
  onCardPress?: () => void;
}

/**
 * Compact tile (icon, title, url) for Explore "Recents" / "Networks" carousels.
 */
const SiteTileRowItem: React.FC<SiteTileRowItemProps> = ({
  site,
  onCardPress,
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { styles } = useStyles(styleSheet);
  const tw = useTailwind();

  const onPress = () => {
    onCardPress?.();
    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: site.url,
        timestamp: Date.now(),
        fromTrending: true,
      },
    });
  };

  return (
    <TouchableOpacity
      testID={`site-recents-tile-${site.name}`}
      style={tw.style(styles.card, 'shrink-0 flex-col justify-start')}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          style={tw.style('overflow-hidden rounded-full border border-muted')}
        >
          {site.logoSource ? (
            <Image source={site.logoSource} style={styles.websiteIcon} />
          ) : (
            <WebsiteIcon
              url={site.url}
              title={site.name}
              style={styles.websiteIcon}
              textStyle={websiteIconTextStyle}
              icon={site.logoUrl}
            />
          )}
        </Box>
      </Box>

      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        numberOfLines={1}
        fontWeight={FontWeight.Medium}
        twClassName="pt-2"
      >
        {site.name}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
      >
        {site.displayUrl}
      </Text>
    </TouchableOpacity>
  );
};

export default SiteTileRowItem;
