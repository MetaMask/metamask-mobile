import React, { useEffect } from 'react';
import { SectionId, SECTIONS_CONFIG } from '../../sections.config';

export interface RefreshConfig {
  /** Incrementing counter to trigger refetch */
  trigger: number;
  /** Whether to show loading skeleton during this refresh */
  silentRefresh: boolean;
}

export interface SectionProps {
  sectionId: SectionId;
  refreshConfig: RefreshConfig;
  /** Callback when data empty state changes (only called after loading completes) */
  toggleSectionEmptyState: (isEmpty: boolean) => void;
  /** Callback when loading state changes (for silent refresh indicator) */
  toggleSectionLoadingState: (isLoading: boolean) => void;
}

const Section: React.FC<SectionProps> = ({
  sectionId,
  refreshConfig,
  toggleSectionEmptyState,
  toggleSectionLoadingState,
}) => {
  const section = SECTIONS_CONFIG[sectionId];
  const { data, isLoading, refetch } = section.useSectionData();

  // Notify parent when data is empty
  useEffect(() => {
    if (!isLoading) {
      toggleSectionEmptyState(data.length === 0);
    }
  }, [data.length, isLoading, toggleSectionEmptyState]);

  // Notify parent when loading
  useEffect(() => {
    toggleSectionLoadingState(isLoading);
  }, [isLoading, toggleSectionLoadingState]);

  useEffect(() => {
    if (refreshConfig && refreshConfig.trigger > 0 && refetch) {
      refetch();
    }
  }, [refreshConfig, refetch]);

  // Only show loading skeleton if refreshConfig allows it
  const shouldShowSkeleton = isLoading && refreshConfig.silentRefresh;

  return (
    <section.Section
      sectionId={sectionId}
      data={data}
      isLoading={shouldShowSkeleton}
    />
  );
};

export default Section;
