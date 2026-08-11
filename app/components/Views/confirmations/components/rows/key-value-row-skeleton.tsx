import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Skeleton,
} from '@metamask/design-system-react-native';

export function KeyValueRowSkeleton({ testID }: { testID?: string }) {
  return (
    <Box
      testID={testID}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 h-10"
    >
      <Skeleton height={18} width={100} />
      <Skeleton height={18} width={80} />
    </Box>
  );
}
