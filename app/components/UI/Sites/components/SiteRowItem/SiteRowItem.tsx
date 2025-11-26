import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Image } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

export interface SiteData {
  id: string;
  name: string;
  url: string;
  displayUrl: string;
  logoUrl?: string;
  featured?: boolean;
}

interface SiteRowItemProps {
  site: SiteData;
  onPress: () => void;
}

const SiteRowItem = ({ site, onPress }: SiteRowItemProps) => {
  const tw = useTailwind();
  const [imageError, setImageError] = useState(false);

  // Reset error state when site changes (for list recycling)
  useEffect(() => {
    setImageError(false);
  }, [site.id, site.logoUrl]);

  return (
    <TouchableOpacity
      testID="site-row-item"
      onPress={onPress}
      style={tw.style('flex-row items-center py-2')}
    >
      {/* Logo */}
      <Box twClassName="flex-row items-center flex-1">
        {site.logoUrl && !imageError ? (
          <Box twClassName="w-10 h-10 rounded-full bg-white border border-muted mr-4 overflow-hidden items-center justify-center p-0.1">
            <Image
              testID="site-logo-image"
              source={{ uri: site.logoUrl }}
              style={tw.style('w-full h-full')}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          </Box>
        ) : (
          <Box
            testID="site-logo-fallback"
            twClassName="w-10 h-10 mr-4 items-center justify-center"
          >
            <Icon name={IconName.Global} size={IconSize.Lg} />
          </Box>
        )}
        {/* Site Info */}
        <Box twClassName="flex-1">
          <Text variant={TextVariant.BodyMd} style={tw.style('font-medium')}>
            {site.name}
          </Text>
          <Text variant={TextVariant.BodySm} twClassName="text-alternative">
            {site.displayUrl}
          </Text>
        </Box>
      </Box>
      {/* Arrow Icon */}
      <Box twClassName="ml-3">
        <Icon name={IconName.Arrow2UpRight} size={IconSize.Md} />
      </Box>
    </TouchableOpacity>
  );
};

export default SiteRowItem;
