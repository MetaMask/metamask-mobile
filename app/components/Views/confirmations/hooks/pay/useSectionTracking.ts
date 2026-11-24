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
  switchKey: string = currentSection,
): SectionTrackingResult {
  const presentedRef = useRef<PayWithSectionId | undefined>(undefined);
  if (!presentedRef.current && isActive) {
    presentedRef.current = currentSection;
  }

  const previousRef = useRef<string | undefined>(undefined);
  const switchCountRef = useRef(0);

  if (isActive) {
    if (previousRef.current === undefined) {
      previousRef.current = switchKey;
    } else if (previousRef.current !== switchKey) {
      switchCountRef.current += 1;
      previousRef.current = switchKey;
    }
  }

  return {
    presented: presentedRef.current ?? null,
    selected: currentSection,
    switchCount: switchCountRef.current,
  };
}
