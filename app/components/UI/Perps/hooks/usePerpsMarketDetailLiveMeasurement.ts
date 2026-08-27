import { useMemo } from 'react';
import { TraceName } from '../../../../util/trace';
import { PERPS_CUF_TAG, PERPS_CUF_VARIANT } from '../constants/perpsCufTags';
import { buildPerpsCufStartTags } from '../utils/perpsCufTrace';
import { usePerpsMeasurement } from './usePerpsMeasurement';
import type {
  PerpsMarketDetailGenerationTrigger,
  PerpsMarketDetailSectionState,
} from './perpsMarketDetailSessionState';

interface DetailSessionForLiveMeasurement {
  generationTrigger: PerpsMarketDetailGenerationTrigger;
  isActive: boolean;
  liveResetKey: string;
}

interface UsePerpsMarketDetailLiveMeasurementParams {
  detailMode: 'lite' | 'pro';
  detailSession: DetailSessionForLiveMeasurement;
  marketSectionState: PerpsMarketDetailSectionState;
  priceSectionState: PerpsMarketDetailSectionState;
  statsSectionState: PerpsMarketDetailSectionState;
  accountSectionState: PerpsMarketDetailSectionState;
  totalBalance: string | undefined;
}

/**
 * Owns the `PerpsMarketDetailLive` CUF trace shared by Lite and Pro market
 * detail views. Ends only on current-symbol/current-account readiness.
 */
export function usePerpsMarketDetailLiveMeasurement({
  detailMode,
  detailSession,
  marketSectionState,
  priceSectionState,
  statsSectionState,
  accountSectionState,
  totalBalance,
}: UsePerpsMarketDetailLiveMeasurementParams): void {
  const marketDetailCufTags = useMemo(
    () =>
      buildPerpsCufStartTags({
        detail_mode: detailMode,
        generation_trigger: detailSession.generationTrigger,
      }),
    [detailMode, detailSession.generationTrigger],
  );
  const marketDetailEndData = useMemo(
    () => ({
      [PERPS_CUF_TAG.VARIANT]:
        !!totalBalance && Number.parseFloat(totalBalance) > 0
          ? PERPS_CUF_VARIANT.FUNDED
          : PERPS_CUF_VARIANT.UNFUNDED,
    }),
    [totalBalance],
  );
  usePerpsMeasurement({
    traceName: TraceName.PerpsMarketDetailLive,
    resetKey: detailSession.liveResetKey,
    ownerActive: detailSession.isActive,
    cancelOnAppBackground: true,
    endConditions: [
      marketSectionState === 'content',
      priceSectionState === 'content',
      statsSectionState === 'content',
      accountSectionState !== 'loading',
    ],
    resetConditions: [statsSectionState === 'error'],
    resetReason: 'stats_error',
    blockStartWhileReset: true,
    tags: marketDetailCufTags,
    endData: marketDetailEndData,
  });
}
