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
      className="flex-1"
      testID={QuickBuySheetSelectorsIDs.CONTENT_LOADING}
    >
      {/* QuickBuyToolbar — token avatar + title/price | settings */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        className="px-4 pt-1 pb-3"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={4}
        >
          <Skeleton
            width={40}
            height={40}
            style={tw.style('rounded-full')}
            testID="quick-buy-skeleton-token"
          />
          <Box>
            <Box className="h-6" justifyContent={BoxJustifyContent.Center}>
              <Skeleton width={80} height={16} style={tw.style('rounded-md')} />
            </Box>
            <Box
              className="h-[22px]"
              justifyContent={BoxJustifyContent.Center}
            >
              <Skeleton width={64} height={14} style={tw.style('rounded-md')} />
            </Box>
          </Box>
        </Box>
        <Skeleton width={32} height={32} style={tw.style('rounded-md')} />
      </Box>

      {/* QuickBuyAmountSection — centered in the remaining space */}
      <Box className="flex-1" justifyContent={BoxJustifyContent.Center}>
        <Box alignItems={BoxAlignItems.Center} className="px-4 pt-6 pb-4">
          <Box className="h-[88px]" justifyContent={BoxJustifyContent.Center}>
            <Skeleton width={120} height={52} style={tw.style('rounded-xl')} />
          </Box>
          <Box className="mt-2">
            <Box className="h-6" justifyContent={BoxJustifyContent.Center}>
              <Skeleton width={64} height={16} style={tw.style('rounded-md')} />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* QuickBuyActionFooter — Est. receive row, Pay with row + quick-amount pills */}
      <Box className="px-4">
        <Box className="mb-4 min-h-6" />
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          className="pb-5"
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
        <Box className="py-1">
          <Skeleton
            width="100%"
            height={40}
            style={tw.style('rounded-xl')}
            testID="quick-buy-skeleton-quick-amounts"
          />
        </Box>
      </Box>

      {/* QuickBuyKeypad — 4 rows of 48px keys, gap-3 */}
      <Box className="px-4 py-4" gap={3} testID="quick-buy-skeleton-keypad">
        {KEYPAD_ROWS.map((row) => (
          <Box key={row} flexDirection={BoxFlexDirection.Row} gap={3}>
            {KEYPAD_COLUMNS.map((column) => (
              <Box key={column} className="flex-1">
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
