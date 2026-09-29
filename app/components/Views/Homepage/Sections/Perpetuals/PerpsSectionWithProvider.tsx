import React, { forwardRef } from 'react';
import { useSelector } from 'react-redux';
import { PerpsConnectionProvider } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import { PerpsSection } from './PerpsSection';
import type { SectionRefreshHandle } from '../../types';

export interface PerpsSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  /** Empty state content rendered when there are no positions or orders. */
  emptyStateContent?: 'tiles' | 'pills';
  /** Override the section title only while rendering empty state content. */
  emptyStateTitleOverride?: string;
}

/**
 * Wraps PerpsSection with connection context and stream providers.
 * Connection lifecycle is managed by the top-level PerpsAlwaysOnProvider.
 * Gates rendering on the perps feature flag.
 */
const PerpsSectionWithProvider = forwardRef<
  SectionRefreshHandle,
  PerpsSectionProps
>(
  (
    {
      sectionIndex,
      totalSectionsLoaded,
      emptyStateContent,
      emptyStateTitleOverride,
    },
    ref,
  ) => {
    const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);

    if (!isPerpsEnabled) {
      return null;
    }

    return (
      <PerpsConnectionProvider suppressErrorView>
        <PerpsStreamProvider>
          <PerpsSection
            ref={ref}
            sectionIndex={sectionIndex}
            totalSectionsLoaded={totalSectionsLoaded}
            emptyStateContent={emptyStateContent}
            emptyStateTitleOverride={emptyStateTitleOverride}
          />
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    );
  },
);

export default PerpsSectionWithProvider;
