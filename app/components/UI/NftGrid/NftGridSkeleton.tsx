import React from 'react';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../util/theme';

const NftGridSkeleton = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <Box twClassName="flex-1 p-1">
      <SkeletonPlaceholder
        backgroundColor={colors.background.section}
        highlightColor={colors.background.subsection}
      >
        <Box twClassName="flex-row flex-wrap justify-between gap-2">
          {Array.from({ length: 18 }, (_, index) => (
            <Box key={index} style={tw.style('w-[30%] mb-2')}>
              <Box style={tw.style('w-full aspect-square rounded-xl mb-3')} />
              <Box>
                <Box style={tw.style('h-4 rounded-lg mb-1 w-[60%]')} />
                <Box style={tw.style('h-3.5 rounded-md w-full')} />
              </Box>
            </Box>
          ))}
        </Box>
      </SkeletonPlaceholder>
    </Box>
  );
};

export default NftGridSkeleton;
