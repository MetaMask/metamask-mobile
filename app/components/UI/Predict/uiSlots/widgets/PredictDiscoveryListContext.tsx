import { createContext } from 'react';
import type { PredictEmptyStateCtaName } from '../../../../Views/Homepage/abTestConfig';
import type { PredictionsTrendingHeaderTestId } from '../../../../Views/Homepage/Sections/Predictions/predictionsSectionTypes';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

export interface PredictDiscoveryListHost {
  enabled: boolean;
  title: string;
  onViewAll: (
    transactionActiveAbTests?: TransactionActiveAbTestEntry[],
  ) => void;
  headerTestIdKey: PredictionsTrendingHeaderTestId;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  onTreatmentCtaClick?: (
    ctaName: PredictEmptyStateCtaName,
    categoryName?: string,
  ) => void;
  registerDiscoveryRefetch: (
    refetch: (() => Promise<unknown>) | undefined,
  ) => void;
  reportDiscoveryLoading: (isLoading: boolean) => void;
}

export const PredictDiscoveryListHostContext =
  createContext<PredictDiscoveryListHost | null>(null);
