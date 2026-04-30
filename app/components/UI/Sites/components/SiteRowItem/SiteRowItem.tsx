import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  Image,
  View,
  type ImageSourcePropType,
} from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import WebsiteIcon from '../../../WebsiteIcon';

export interface SiteData {
  id: string;
  name: string;
  url: string;
  displayUrl: string;
  /**
   * Exact bookmark URL as persisted in Redux. When set (e.g. favorites from
   * `useBrowserFavoritesSites`), use {@link bookmarkUrlForRemoval} for
   * `removeBookmark` so removal matches even if `url` was normalized with a protocol.
   */
  storedBookmarkUrl?: string;
  /** Remote URL string — passed to WebsiteIcon for favicon lookup. */
  logoUrl?: string;
  /** Local bundled image (require result) — rendered directly with <Image>, takes priority over logoUrl. */
  logoSource?: ImageSourcePropType;
  featured?: boolean;
  /**
   * When true, applies additional padding around the logo image.
   * Useful for logos that extend to the edges (like the MetaMask fox).
   */
  logoNeedsPadding?: boolean;
}

/** `url` value to pass to `removeBookmark` for this site row. */
export function bookmarkUrlForRemoval(site: SiteData): string {
  return site.storedBookmarkUrl ?? site.url;
}

interface SiteRowItemProps {
  site: SiteData;
  onPress: () => void;
  onRemoveFavorite?: () => void;
}

const { icon: websiteIconStyle, iconWithPadding } = StyleSheet.create({
  icon: { width: 40, height: 40, borderRadius: 20 },
  iconWithPadding: { width: 40, height: 40, borderRadius: 20, padding: 6 },
});

const SiteRowItem = ({ site, onPress, onRemoveFavorite }: SiteRowItemProps) => {
  const tw = useTailwind();
  const [remoteLogoLoadError, setRemoteLogoLoadError] = useState(false);

  useEffect(() => {
    setRemoteLogoLoadError(false);
  }, [site.id, site.logoUrl]);

  const showRemoteLogoImage = Boolean(site.logoUrl) && !remoteLogoLoadError;

  return (
    <TouchableOpacity
      testID={`site-row-item-${site.name}`}
      onPress={onPress}
      style={tw.style('flex-row items-center py-2')}
    >
      {/* Logo */}
      <Box twClassName="flex-row items-center flex-1">
        <Box twClassName="w-10 h-10 rounded-full border border-muted mr-4 overflow-hidden items-center justify-center">
          {site.logoSource ? (
            <Image
              testID="site-logo-image"
              source={site.logoSource}
              style={websiteIconStyle}
            />
          ) : showRemoteLogoImage ? (
            <Image
              testID="site-logo-image"
              source={{ uri: site.logoUrl }}
              style={site.logoNeedsPadding ? iconWithPadding : websiteIconStyle}
              resizeMode="contain"
              onError={() => setRemoteLogoLoadError(true)}
            />
          ) : (
            <View testID="site-logo-fallback">
              <WebsiteIcon
                url={site.url}
                title={site.name}
                style={websiteIconStyle}
              />
            </View>
          )}
        </Box>
        {/* Site Info */}
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            style={tw.style('font-medium')}
            numberOfLines={1}
          >
            {site.name}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative"
            numberOfLines={1}
          >
            {site.displayUrl}
          </Text>
        </Box>
      </Box>
      {/* Action Icons */}
      <Box twClassName="ml-3 flex-row items-center gap-3">
        {onRemoveFavorite && (
          <TouchableOpacity onPress={onRemoveFavorite} hitSlop={8}>
            <Icon
              name={IconName.StarFilled}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          </TouchableOpacity>
        )}
        <Icon name={IconName.Arrow2UpRight} size={IconSize.Md} />
      </Box>
    </TouchableOpacity>
  );
};

export default SiteRowItem;
