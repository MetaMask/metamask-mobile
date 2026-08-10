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
      {/* Toolbar — gear | toggle | close */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 pt-4 pb-3"
      >
        <Skeleton width={24} height={24} style={tw.style('rounded-md')} />
        <Skeleton
          width={130}
          height={40}
          style={tw.style('rounded-xl')}
          testID="quick-buy-skeleton-trade-mode"
        />
        <Skeleton width={24} height={24} style={tw.style('rounded-md')} />
      </Box>

      {/* Amount area — mirrors QuickBuyAmountSection pt-6 pb-4 */}
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={2}
        twClassName="px-4 pt-6 pb-4"
      >
        <Skeleton width={160} height={52} style={tw.style('rounded-xl')} />
        <Skeleton width={120} height={20} style={tw.style('rounded-md')} />
      </Box>

      {/* Footer area — mirrors QuickBuyActionFooter */}
      <Box twClassName="px-4 pb-4">
        <Box twClassName="pb-3">
          <Skeleton
            width="100%"
            height={40}
            style={tw.style('rounded-xl')}
            testID="quick-buy-skeleton-quick-amounts"
          />
        </Box>

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

        <Skeleton
          width="100%"
          height={48}
          style={tw.style('rounded-xl')}
          testID="quick-buy-skeleton-confirm-button"
        />
      </Box>

      <Box twClassName="px-4 py-4" testID="quick-buy-skeleton-keypad">
        <Skeleton width="100%" height={220} style={tw.style('rounded-xl')} />
      </Box>
    </Box>
  );
};

export default QuickBuyBottomSheetSkeleton;
