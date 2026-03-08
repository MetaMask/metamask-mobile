import React from 'react';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { BridgeViewSelectorsIDs } from '../../Views/BridgeView/BridgeView.testIds';

const ROWS: readonly (readonly [string, string])[] = [
  ['35%', '42%'],
  ['28%', '24%'],
  ['30%', '18%'],
  ['32%', '22%'],
];

const QuoteDetailsCardSkeleton = () => (
  <Box
    twClassName="mx-4 p-4 rounded-xl border border-muted bg-default gap-3.5"
    testID={BridgeViewSelectorsIDs.QUOTE_DETAILS_SKELETON}
  >
    {ROWS.map(([left, right], i) => (
      <Box
        key={i}
        testID="quote-details-card-loading-row"
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

export default QuoteDetailsCardSkeleton;
