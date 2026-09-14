import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { LimitOrderDetailsSelectorsIDs } from './testIds';

const ROWS: readonly (readonly [string, string])[] = [
  ['35%', '42%'],
  ['28%', '24%'],
  ['30%', '18%'],
];

const LimitOrderDetailsSkeleton = () => (
  <Box
    twClassName="mx-4 mt-3 p-4 rounded-xl border border-muted bg-default gap-3.5"
    testID={LimitOrderDetailsSelectorsIDs.SKELETON}
  >
    {ROWS.map(([left, right], i) => (
      <Box
        key={i}
        testID={LimitOrderDetailsSelectorsIDs.SKELETON_ROW}
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
      >
        <Skeleton width={left} height={18} />
        <Skeleton width={right} height={18} />
      </Box>
    ))}
  </Box>
);

export default LimitOrderDetailsSkeleton;
