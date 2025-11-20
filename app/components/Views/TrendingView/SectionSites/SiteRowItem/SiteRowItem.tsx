import React from 'react';
import { Pressable, Image } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Tag from '../../../../../component-library/components/Tags/Tag';

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
  isViewAll?: boolean;
}

const SiteRowItem = ({
  site,
  onPress,
  isViewAll = false,
}: SiteRowItemProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      testID="site-row-item"
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'flex-row items-center justify-between py-4',
          isViewAll ? 'px-4' : 'pr-4',
          pressed && 'bg-pressed',
        )
      }
    >
      {/* Logo */}
      <Box twClassName="flex-row items-center flex-1">
        {site.logoUrl ? (
          <Image
            testID="site-logo-image"
            source={{ uri: site.logoUrl }}
            style={tw.style('w-10 h-10 rounded-full mr-4')}
            resizeMode="cover"
          />
        ) : (
          <Box twClassName="w-10 h-10 rounded-full bg-alternative mr-4 items-center justify-center">
            <Text variant={TextVariant.HeadingMd}>🌐</Text>
          </Box>
        )}
        {/* Site Info */}
        <Box twClassName="flex-1">
          <Box twClassName="flex-row items-center gap-2">
            <Text variant={TextVariant.HeadingMd}>{site.name}</Text>
            {site.featured && <Tag label="Featured" />}
          </Box>
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {site.displayUrl}
          </Text>
        </Box>
      </Box>
      {/* Arrow Icon */}
      <Icon name={IconName.Arrow2UpRight} size={IconSize.Md} />
    </Pressable>
  );
};

export default SiteRowItem;
