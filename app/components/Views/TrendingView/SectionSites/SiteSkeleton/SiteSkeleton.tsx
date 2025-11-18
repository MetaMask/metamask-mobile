import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';

const SiteSkeleton = () => (
  <Box twClassName="px-4 py-4">
    <SkeletonPlaceholder>
      <SkeletonPlaceholder.Item flexDirection="row" alignItems="center">
        {/* Circle avatar */}
        <SkeletonPlaceholder.Item width={48} height={48} borderRadius={24} />
        {/* Text content */}
        <SkeletonPlaceholder.Item marginLeft={16} flex={1}>
          <SkeletonPlaceholder.Item width="60%" height={20} borderRadius={4} />
          <SkeletonPlaceholder.Item
            width="40%"
            height={16}
            borderRadius={4}
            marginTop={8}
          />
        </SkeletonPlaceholder.Item>
      </SkeletonPlaceholder.Item>
    </SkeletonPlaceholder>
  </Box>
);

export default SiteSkeleton;
