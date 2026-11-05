import React, { forwardRef } from 'react';
import type {
  HomeSectionMode,
  SectionRefreshHandle,
} from '../../../Views/Homepage/types';
import PredictionsSection from '../../Predict/homeSection';
import { PredictImplementationSwitch } from '../implementation';
import { NextPredictHomeSection } from './internal/next/NextPredictHomeSection';

export interface PredictHomeSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  /** @default 'default' */
  mode?: HomeSectionMode;
}

/**
 * The Homepage Predictions section. The legacy branch renders the existing
 * Polymarket section unchanged. The next branch renders the Active Venue's
 * open Positions and PnL; its sports mode, and discovery for a Predict User
 * without open Positions, render nothing until PRED-1406 builds them.
 * Homepage refreshes the mounted branch through the forwarded
 * `SectionRefreshHandle`, which is empty while no branch renders.
 *
 * The switch remounts the branch in the same render as a Venue change, so
 * the previous Venue's rows are never painted under the new one.
 */
export const PredictHomeSection = forwardRef<
  SectionRefreshHandle,
  PredictHomeSectionProps
>((props, ref) => (
  <PredictImplementationSwitch
    legacy={<PredictionsSection {...props} ref={ref} />}
    next={
      props.mode === 'sports' ? null : (
        <NextPredictHomeSection
          sectionIndex={props.sectionIndex}
          totalSectionsLoaded={props.totalSectionsLoaded}
          ref={ref}
        />
      )
    }
    resolving={null}
  />
));
