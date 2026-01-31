import React, { useEffect, useState, useRef } from 'react';
import { SectionId, SECTIONS_CONFIG } from '../../sections.config';

/** Grace period in ms before showing skeleton loader to avoid UI flicker */
const SKELETON_GRACE_PERIOD_MS = 200;

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

  // Track if skeleton should be shown after grace period
  const [showSkeletonAfterGrace, setShowSkeletonAfterGrace] = useState(false);
  const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Manage skeleton visibility with grace period to avoid UI flicker
  useEffect(() => {
    if (isLoading && refreshConfig.silentRefresh) {
      // Start grace period timer - only show skeleton if loading takes longer than threshold
      graceTimerRef.current = setTimeout(() => {
        setShowSkeletonAfterGrace(true);
      }, SKELETON_GRACE_PERIOD_MS);
    } else {
      // Loading finished or silentRefresh is false - clear timer and hide skeleton
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
      setShowSkeletonAfterGrace(false);
    }

    return () => {
      if (graceTimerRef.current) {
        clearTimeout(graceTimerRef.current);
        graceTimerRef.current = null;
      }
    };
  }, [isLoading, refreshConfig.silentRefresh]);

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

  // Only show loading skeleton if grace period has passed
  const shouldShowSkeleton = showSkeletonAfterGrace;

  return (
    <section.Section
      sectionId={sectionId}
      data={data}
      isLoading={shouldShowSkeleton}
    />
  );
};

export default Section;
