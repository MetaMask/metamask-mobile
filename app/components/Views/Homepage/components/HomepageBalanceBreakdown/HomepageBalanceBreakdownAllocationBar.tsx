import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxFlexDirection,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { SLICE_ORDER } from '../../BalanceBreakdown/constants';
import type { SliceData, SliceKey } from '../../BalanceBreakdown/types';
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
}: HomepageBalanceBreakdownAllocationBarProps) => {
  const privacyMode = useSelector(selectPrivacyMode);

  return (
    <Box twClassName="mx-4 mb-2 gap-3 pt-1">
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
        {privacyMode ? (
          <Box
            testID={HomepageBalanceBreakdownTestIds.ALLOCATION_PRIVATE}
            twClassName="h-full flex-1 bg-muted"
          />
        ) : (
          SLICE_ORDER.filter(
            (key) =>
              slices[key].status === 'ready' && slices[key].percentOfTotal > 0,
          ).map((key) => (
            <View
              key={key}
              testID={HomepageBalanceBreakdownTestIds.ALLOCATION_SEGMENT(key)}
              style={getAllocationSegmentStyle(slices[key])}
            />
          ))
        )}
      </Box>
    </Box>
  );
};

export default HomepageBalanceBreakdownAllocationBar;
