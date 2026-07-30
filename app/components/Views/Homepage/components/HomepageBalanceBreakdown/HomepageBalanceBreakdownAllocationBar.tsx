import React from 'react';
import { View, type ViewStyle } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { SLICE_ORDER } from '../../../BalanceBreakdown/constants';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SliceData, SliceKey } from '../../../BalanceBreakdown/types';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';

const getAllocationSegmentStyle = (slice: SliceData): ViewStyle => ({
  backgroundColor: slice.color,
  borderRadius: 999,
  flexBasis: 0,
  flexGrow: slice.percentOfTotal,
  minWidth: 4,
});

interface HomepageBalanceBreakdownAllocationBarProps {
  slices: Record<SliceKey, SliceData>;
}

const HomepageBalanceBreakdownAllocationBar = ({
  slices,
}: HomepageBalanceBreakdownAllocationBarProps) => (
  <Box twClassName="mb-2 gap-3 pt-1">
    <Text
      testID={HomepageBalanceBreakdownTestIds.ALLOCATION_TITLE}
      variant={TextVariant.HeadingMd}
    >
      {strings('balance_breakdown.allocation')}
    </Text>
    <Box
      flexDirection={BoxFlexDirection.Row}
      gap={1}
      testID={HomepageBalanceBreakdownTestIds.ALLOCATION_BAR}
      twClassName="h-1.5 overflow-hidden rounded-full"
    >
      {SLICE_ORDER.filter(
        (key) =>
          slices[key].status === 'ready' && slices[key].percentOfTotal > 0,
      ).map((key) => (
        <View
          key={key}
          testID={HomepageBalanceBreakdownTestIds.ALLOCATION_SEGMENT(key)}
          style={getAllocationSegmentStyle(slices[key])}
        />
      ))}
    </Box>
  </Box>
);

export default HomepageBalanceBreakdownAllocationBar;
