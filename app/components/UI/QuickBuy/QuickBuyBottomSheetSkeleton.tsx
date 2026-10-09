import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../locales/i18n';
import { QuickBuySheetSelectorsIDs } from './QuickBuySheet.testIds';

const KEYPAD_ROWS = [0, 1, 2, 3];
const KEYPAD_COLUMNS = [0, 1, 2];

/**
 * Mirrors QuickBuyAmountScreen's layout box-for-box (same paddings, line
 * heights and element sizes) so nothing shifts when the real content swaps in.
 */
const QuickBuyBottomSheetSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box
      twClassName="flex-1"
      testID={QuickBuySheetSelectorsIDs.CONTENT_LOADING}
    >
      {/* QuickBuyToolbar — token avatar + title/price | settings */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 pt-4 pb-3"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
        >
          <Skeleton width={32} height={32} style={tw.style('rounded-full')} />
          <Box>
            <Box twClassName="h-6" justifyContent={BoxJustifyContent.Center}>
              <Skeleton width={80} height={16} style={tw.style('rounded-md')} />
            </Box>
            <Box
              twClassName="h-[22px]"
              justifyContent={BoxJustifyContent.Center}
            >
              <Skeleton width={64} height={14} style={tw.style('rounded-md')} />
            </Box>
          </Box>
        </Box>
        <Skeleton width={32} height={32} style={tw.style('rounded-md')} />
      </Box>

      {/* QuickBuyAmountSection — centered in the remaining space */}
      <Box twClassName="flex-1" justifyContent={BoxJustifyContent.Center}>
        <Box
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="px-4 pt-6 pb-4"
        >
          <Box twClassName="h-[70px]" justifyContent={BoxJustifyContent.Center}>
            <Skeleton width={120} height={52} style={tw.style('rounded-xl')} />
          </Box>
          <Box twClassName="h-[22px]" justifyContent={BoxJustifyContent.Center}>
            <Skeleton width={64} height={14} style={tw.style('rounded-md')} />
          </Box>
        </Box>
      </Box>

      {/* QuickBuyActionFooter — Pay with row + quick-amount pills */}
      <Box twClassName="px-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="pb-5"
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.quick_buy.pay_with')}
          </Text>
          <Skeleton
            width={96}
            height={16}
            style={tw.style('rounded-md')}
            testID="quick-buy-skeleton-pay-with"
          />
        </Box>
        <Box twClassName="py-1">
          <Skeleton
            width="100%"
            height={40}
            style={tw.style('rounded-xl')}
            testID="quick-buy-skeleton-quick-amounts"
          />
        </Box>
      </Box>

      {/* QuickBuyKeypad — 4 rows of 48px keys, gap-3 */}
      <Box twClassName="px-4 py-4" gap={3} testID="quick-buy-skeleton-keypad">
        {KEYPAD_ROWS.map((row) => (
          <Box key={row} flexDirection={BoxFlexDirection.Row} gap={3}>
            {KEYPAD_COLUMNS.map((column) => (
              <Box key={column} twClassName="flex-1">
                <Skeleton
                  width="100%"
                  height={48}
                  style={tw.style('rounded-xl')}
                />
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default QuickBuyBottomSheetSkeleton;
