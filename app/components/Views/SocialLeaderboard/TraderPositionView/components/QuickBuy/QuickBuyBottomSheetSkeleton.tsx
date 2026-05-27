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
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { strings } from '../../../../../../../locales/i18n';

const QuickBuyBottomSheetSkeleton: React.FC = () => {
  const tw = useTailwind();

  return (
    <Box testID="quick-buy-content-loading">
      {/* Amount area — mirrors QuickBuyAmountSection pt-6 pb-4 */}
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={2}
        twClassName="px-4 pt-6 pb-4"
      >
        {/* Primary amount */}
        <Skeleton width={160} height={52} style={tw.style('rounded-xl')} />
        {/* Secondary amount / rate tag */}
        <Skeleton width={120} height={20} style={tw.style('rounded-md')} />
        {/* Available balance */}
        <Skeleton width={96} height={16} style={tw.style('rounded-md')} />
      </Box>

      {/* Footer area — mirrors QuickBuyActionFooter px-4 pb-4 */}
      <Box twClassName="px-4 pb-4">
        {/* Slider — mirrors pt-2 pb-3 */}
        <Box twClassName="pt-2 pb-3">
          <Skeleton
            width="100%"
            height={24}
            style={tw.style('rounded-full')}
            testID="quick-buy-skeleton-slider"
          />
        </Box>

        {/* Pay with row */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="pb-3"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('social_leaderboard.quick_buy.pay_with')}
          </Text>
          <Skeleton
            width={120}
            height={28}
            style={tw.style('rounded-full')}
            testID="quick-buy-skeleton-pay-with"
          />
        </Box>

        {/* Confirm button */}
        <Skeleton
          width="100%"
          height={48}
          style={tw.style('rounded-xl')}
          testID="quick-buy-skeleton-confirm-button"
        />
      </Box>
    </Box>
  );
};

export default QuickBuyBottomSheetSkeleton;
