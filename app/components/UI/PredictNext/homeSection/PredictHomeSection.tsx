import React, { forwardRef } from 'react';
import type {
  HomeSectionMode,
  SectionRefreshHandle,
} from '../../../Views/Homepage/types';
import PredictionsSection from '../../Predict/homeSection';
import { PredictImplementationSwitch } from '../implementation';

export interface PredictHomeSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  /** @default 'default' */
  mode?: HomeSectionMode;
}

/**
 * The Homepage Predictions section. The legacy branch renders the existing
 * Polymarket section unchanged; the next branch renders nothing until
 * PRED-1406 builds it. Homepage refreshes it through the forwarded
 * `SectionRefreshHandle`, which is empty while no branch renders.
 */
export const PredictHomeSection = forwardRef<
  SectionRefreshHandle,
  PredictHomeSectionProps
>((props, ref) => (
  <PredictImplementationSwitch
    legacy={<PredictionsSection {...props} ref={ref} />}
    next={null}
    resolving={null}
  />
));
