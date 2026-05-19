import React, { forwardRef } from 'react';
import { useABTest } from '../../../../../hooks';
import {
  HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
  HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
} from '../../abTestConfig';
import {
  usePerpsLiveOrders,
  usePerpsLivePositions,
} from '../../../../UI/Perps/hooks';
import { usePerpsConnection } from '../../../../UI/Perps/hooks/usePerpsConnection';
import type { SectionRefreshHandle } from '../../types';
import type { PerpsSectionProps } from './PerpsSectionWithProvider';
import PerpsSection from './PerpsSection';
import HomepagePerpsMoversSection from './HomepagePerpsMoversSection';

const HOMEPAGE_THROTTLE_MS = 5000;

/**
 * Only mounted when the TMCU-725 experiment is in treatment (and not
 * positions-only). Owns `usePerpsLivePositions` / `usePerpsLiveOrders` so control
 * users never pay for duplicate subscriptions with `PerpsSection`.
 */
const HomepagePerpsTreatmentEmptyBranch = forwardRef<
  SectionRefreshHandle,
  PerpsSectionProps
>((props, ref) => {
  const { positions, isInitialLoading: positionsLoading } =
    usePerpsLivePositions({
      throttleMs: HOMEPAGE_THROTTLE_MS,
    });

  const { orders, isInitialLoading: ordersLoading } = usePerpsLiveOrders({
    hideTpSl: true,
    throttleMs: HOMEPAGE_THROTTLE_MS,
  });

  const { error: connectionError } = usePerpsConnection();

  const showSkeleton = positionsLoading || ordersLoading;
  const hasItems = positions.length > 0 || orders.length > 0;

  const showMoversEmpty = !showSkeleton && !hasItems;

  if (connectionError) {
    return <PerpsSection ref={ref} {...props} />;
  }

  if (showMoversEmpty) {
    return <HomepagePerpsMoversSection ref={ref} {...props} />;
  }

  return <PerpsSection ref={ref} {...props} />;
});

HomepagePerpsTreatmentEmptyBranch.displayName =
  'HomepagePerpsTreatmentEmptyBranch';

/**
 * Chooses between the classic homepage Perps section and the Explore-style
 * "Perps movers" rail for the empty state when the TMCU-725 experiment is in treatment.
 * `PerpsSection.tsx` stays unchanged; experiment wiring lives here.
 */
const HomepagePerpsHomeSlot = forwardRef<
  SectionRefreshHandle,
  PerpsSectionProps
>((props, ref) => {
  const { mode = 'default' } = props;
  const isPositionsOnly = mode === 'positions-only';

  const { variant: perpsPillsEmptyAbVariant } = useABTest(
    HOMEPAGE_PERPS_PILLS_EMPTY_AB_KEY,
    HOMEPAGE_PERPS_PILLS_EMPTY_VARIANTS,
    {
      experimentName: 'Homepage Perps empty state pills',
      variationNames: {
        control: 'Tile carousel empty state',
        treatment: 'Explore Perps Movers pills empty state',
      },
    },
  );

  const emptyStateUsesExplorePills =
    !isPositionsOnly && perpsPillsEmptyAbVariant.showExplorePillsWhenEmpty;

  if (!emptyStateUsesExplorePills) {
    return <PerpsSection ref={ref} {...props} />;
  }

  return <HomepagePerpsTreatmentEmptyBranch ref={ref} {...props} />;
});

HomepagePerpsHomeSlot.displayName = 'HomepagePerpsHomeSlot';

export default HomepagePerpsHomeSlot;
