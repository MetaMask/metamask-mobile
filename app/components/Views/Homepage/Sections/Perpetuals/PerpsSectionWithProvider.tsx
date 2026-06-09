import React, { forwardRef } from 'react';
import { useSelector } from 'react-redux';
import { PerpsConnectionProvider } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import { PerpsSection } from './PerpsSection';
import type { SectionRefreshHandle, HomeSectionMode } from '../../types';
import type { HomeSectionName } from '../../hooks/useHomeViewedEvent';

export interface PerpsSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
  /** @default 'default' */
  mode?: HomeSectionMode;
  /** Override the section name used in analytics events. */
  sectionName?: HomeSectionName;
  /** Override the section header title. */
  titleOverride?: string;
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
      mode = 'default',
      sectionName,
      titleOverride,
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
            mode={mode}
            sectionName={sectionName}
            titleOverride={titleOverride}
            emptyStateContent={emptyStateContent}
            emptyStateTitleOverride={emptyStateTitleOverride}
          />
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    );
  },
);

export default PerpsSectionWithProvider;
