import React from 'react';
import { TouchableOpacity, StyleSheet, type TextStyle } from 'react-native';
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
import { useStyles } from '../../../../../../../component-library/hooks';
import WebsiteIcon from '../../../../../../UI/WebsiteIcon';
import type { SiteData } from '../../../../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import type { AppNavigationProp } from '../../../../../../../core/NavigationService/types';
import Routes from '../../../../../../../constants/navigation/Routes';
import type { Theme } from '../../../../../../../util/theme/models';
import {
  SITE_RECENTS_TILE_BORDER_RADIUS,
  SITE_RECENTS_TILE_HEIGHT,
  SITE_RECENTS_TILE_WIDTH,
} from './siteRecentsTileDimensions';

const LOGO_SIZE = 28;

const websiteIconTextStyle: TextStyle = { fontSize: 12 };

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    card: {
      width: SITE_RECENTS_TILE_WIDTH,
      height: SITE_RECENTS_TILE_HEIGHT,
      backgroundColor: theme.colors.background.section,
      borderRadius: SITE_RECENTS_TILE_BORDER_RADIUS,
      padding: 12,
    },
    websiteIcon: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
      borderRadius: LOGO_SIZE / 2,
    },
  });
};

export interface SiteRecentsTileRowItemProps {
  item: unknown;
  index: number;
  navigation: AppNavigationProp;
  extra?: unknown;
}

/**
 * Compact site tile (Explore Dapps “Recents”): icon row, then title + URL — no filler space between rows.
 */
const SiteRecentsTileRowItem: React.FC<SiteRecentsTileRowItemProps> = ({
  item,
  navigation,
}) => {
  const site = item as SiteData;
  const { styles } = useStyles(styleSheet);
  const tw = useTailwind();

  const onPress = () => {
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
          <WebsiteIcon
            /* Same favicon path as URL autocomplete (cache + fetch via useFavicon) */
            url={site.url}
            title={site.name}
            style={styles.websiteIcon}
            textStyle={websiteIconTextStyle}
            icon={site.logoUrl}
          />
        </Box>
        <Icon
          name={IconName.Arrow2UpRight}
          size={IconSize.Sm}
          color={IconColor.IconDefault}
        />
      </Box>

      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextDefault}
        numberOfLines={1}
        fontWeight={FontWeight.Medium}
      >
        {site.name}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
        twClassName="mt-0.5"
      >
        {site.displayUrl}
      </Text>
    </TouchableOpacity>
  );
};

export default SiteRecentsTileRowItem;
