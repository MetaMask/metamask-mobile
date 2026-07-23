import { useMemo } from 'react';
import { useABTest } from '../../../../../../hooks';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import {
  PREDICT_POSITIONS_EMPTY_STATE_AB_KEY,
  PREDICT_POSITIONS_EMPTY_STATE_VARIANTS,
  getPredictPositionsEmptyStateActiveAbTests,
} from '../../../abTestConfig';

const DISCOVERY_AB_METADATA = {
  experimentName: 'Predict positions empty state',
  variationNames: {
    control: 'Trending carousel',
    treatment: 'Sports discovery list',
  },
} as const;

export type PredictHomepageDiscoveryLayout = 'carousel' | 'list';

/**
 * Homepage predict discovery experiment (carousel vs sports list).
 */
export function usePredictHomepageDiscoveryExperiment(): {
  discoveryLayout: PredictHomepageDiscoveryLayout;
  isTreatmentDiscovery: boolean;
  predictEmptyStateActiveAbTests: TransactionActiveAbTestEntry[] | undefined;
  predictEmptyStateVariantName: string;
  isPredictEmptyStateAssignmentActive: boolean;
} {
  const { variant, variantName, isActive } = useABTest(
    PREDICT_POSITIONS_EMPTY_STATE_AB_KEY,
    PREDICT_POSITIONS_EMPTY_STATE_VARIANTS,
    DISCOVERY_AB_METADATA,
  );
  const discoveryLayout = variant.layout as PredictHomepageDiscoveryLayout;
  const predictEmptyStateActiveAbTests = useMemo(
    () => getPredictPositionsEmptyStateActiveAbTests(isActive, variantName),
    [isActive, variantName],
  );

  return {
    discoveryLayout,
    isTreatmentDiscovery: discoveryLayout === 'list',
    predictEmptyStateActiveAbTests,
    predictEmptyStateVariantName: variantName,
    isPredictEmptyStateAssignmentActive: isActive,
  };
}
