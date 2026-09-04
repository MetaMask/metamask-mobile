import React, { useContext, useEffect, useMemo } from 'react';
import type { UiSlot } from '../../../../../core/Engine/controllers/ui-slots-controller/types';
import HomepagePredictDiscovery from '../../../../Views/Homepage/Sections/Predictions/components/HomepagePredictDiscovery';
import {
  HOMEPAGE_PREDICT_MARKET_SLOTS,
  type HomepagePredictMarketSlot,
} from '../../../../Views/Homepage/Sections/Predictions/constants/homepagePredictMarketSlots';
import { useHomepagePredictMarketSlots } from '../../../../Views/Homepage/Sections/Predictions/hooks';
import { useTreatmentDiscoveryFeedsLoading } from '../../../../Views/Homepage/Sections/Predictions/hooks/useTreatmentDiscoveryFeedsLoading';
import {
  isPredictHomepageMarketSlotReference,
  type PredictHomepageMarketSlotReference,
} from '../types';
import { PREDICT_HOMEPAGE_SERIES_REGISTRY } from '../seriesRegistry';
import { PredictDiscoveryListHostContext } from './PredictDiscoveryListContext';

const resolveHomepagePredictMarketSlots = (
  reference: PredictHomepageMarketSlotReference,
): HomepagePredictMarketSlot[] =>
  reference.params.items.map((item) =>
    item.type === 'event'
      ? { type: 'event', id: item.id, slug: item.slug }
      : {
          type: 'series',
          series: PREDICT_HOMEPAGE_SERIES_REGISTRY[item.seriesId],
        },
  );

function ActivePredictDiscoveryList({
  slots,
}: Readonly<{
  slots: readonly HomepagePredictMarketSlot[];
}>) {
  const host = useContext(PredictDiscoveryListHostContext);
  if (!host) {
    throw new Error('Predict discovery list host context is missing.');
  }
  const { registerDiscoveryRefetch, reportDiscoveryLoading } = host;
  const marketSlots = useHomepagePredictMarketSlots({
    enabled: host.enabled,
    slots,
  });
  const isLoading = useTreatmentDiscoveryFeedsLoading({
    isTreatmentDiscovery: host.enabled,
    isDiscoveryFetching: marketSlots.isFetching,
  });

  useEffect(() => {
    registerDiscoveryRefetch(marketSlots.refetch);
    return () => registerDiscoveryRefetch(undefined);
  }, [marketSlots.refetch, registerDiscoveryRefetch]);

  useEffect(() => {
    reportDiscoveryLoading(isLoading);
    return () => reportDiscoveryLoading(true);
  }, [isLoading, reportDiscoveryLoading]);

  return (
    <HomepagePredictDiscovery
      title={host.title}
      onViewAll={host.onViewAll}
      headerTestIdKey={host.headerTestIdKey}
      slots={slots}
      marketSlots={marketSlots}
      transactionActiveAbTests={host.transactionActiveAbTests}
      onTreatmentCtaClick={host.onTreatmentCtaClick}
    />
  );
}

export function BundledPredictDiscoveryList() {
  return <ActivePredictDiscoveryList slots={HOMEPAGE_PREDICT_MARKET_SLOTS} />;
}

export function PredictDiscoveryListWidget({
  slot,
}: Readonly<{ slot: UiSlot }>) {
  const reference = slot.dataReferences?.find(
    isPredictHomepageMarketSlotReference,
  );
  const slots = useMemo(
    () => reference && resolveHomepagePredictMarketSlots(reference),
    [reference],
  );
  if (!slots) {
    throw new Error(
      'Predict discovery list requires a market slots data reference.',
    );
  }

  return <ActivePredictDiscoveryList slots={slots} />;
}
