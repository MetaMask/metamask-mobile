import React, { createContext, useContext, type ReactNode } from 'react';
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

const PredictDiscoveryListHostContext =
  createContext<PredictDiscoveryListHost | null>(null);

export function PredictDiscoveryListHostProvider({
  value,
  children,
}: {
  value: PredictDiscoveryListHost;
  children: ReactNode;
}) {
  return (
    <PredictDiscoveryListHostContext.Provider value={value}>
      {children}
    </PredictDiscoveryListHostContext.Provider>
  );
}

export function usePredictDiscoveryListHost(): PredictDiscoveryListHost {
  const host = useContext(PredictDiscoveryListHostContext);
  if (!host) {
    throw new Error('Predict discovery list host context is missing.');
  }
  return host;
}
