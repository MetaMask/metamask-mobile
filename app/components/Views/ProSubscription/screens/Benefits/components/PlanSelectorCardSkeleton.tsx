import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import { BenefitsTestIds } from '../Benefits.testIds';

/**
 * Placeholder that mirrors the {@link PlanSelectorCard} layout while pricing
 * is being fetched.
 */
const PlanSelectorCardSkeleton = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="rounded-2xl p-4 bg-background-section flex flex-row items-center justify-between border border-transparent"
    testID={BenefitsTestIds.PLAN_CARD_SKELETON}
  >
    {/* Plan details */}
    <Box twClassName="flex flex-col gap-y-2">
      <Skeleton width={148} height={16} />
      <Skeleton width={96} height={16} />
    </Box>

    {/* Radio indicator */}
    <Skeleton width={32} height={32} twClassName="rounded-full" />
  </Box>
);

export default PlanSelectorCardSkeleton;
