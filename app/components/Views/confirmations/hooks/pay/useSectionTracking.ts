import { useRef } from 'react';
import { PayWithSectionId } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

export interface SectionTrackingResult {
  presented: PayWithSectionId | null;
  selected: PayWithSectionId;
  switchCount: number;
}

export function useSectionTracking(
  currentSection: PayWithSectionId,
  isActive: boolean,
): SectionTrackingResult {
  const presentedRef = useRef<PayWithSectionId | undefined>(undefined);
  if (!presentedRef.current && isActive) {
    presentedRef.current = currentSection;
  }

  const previousRef = useRef<PayWithSectionId | undefined>(undefined);
  const switchCountRef = useRef(0);

  if (isActive) {
    if (previousRef.current === undefined) {
      previousRef.current = currentSection;
    } else if (previousRef.current !== currentSection) {
      switchCountRef.current += 1;
      previousRef.current = currentSection;
    }
  }

  return {
    presented: presentedRef.current ?? null,
    selected: currentSection,
    switchCount: switchCountRef.current,
  };
}
