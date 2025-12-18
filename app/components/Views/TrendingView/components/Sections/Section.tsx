import React, { useEffect } from 'react';
import { SectionId, SECTIONS_CONFIG } from '../../sections.config';

export interface SectionProps {
  sectionId: SectionId;
  refreshTrigger?: number;
  /** Callback when data empty state changes (only called after loading completes) */
  toggleSectionEmptyState?: (isEmpty: boolean) => void;
}

const Section: React.FC<SectionProps> = ({
  sectionId,
  refreshTrigger,
  toggleSectionEmptyState,
}) => {
  const section = SECTIONS_CONFIG[sectionId];
  const { data, isLoading, refetch } = section.useSectionData();

  // Notify parent when data empty state changes (only after loading completes)
  useEffect(() => {
    if (!isLoading && toggleSectionEmptyState) {
      toggleSectionEmptyState(data.length === 0);
    }
  }, [data.length, isLoading, toggleSectionEmptyState]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && refetch) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  return (
    <section.Section sectionId={sectionId} data={data} isLoading={isLoading} />
  );
};

export default Section;
