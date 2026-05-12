import { useMemo } from 'react';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';

export interface UsePayWithSectionsResult {
  sections: PayWithSectionConfig[];
}

export function usePayWithSections(): UsePayWithSectionsResult {
  return useMemo<UsePayWithSectionsResult>(() => ({ sections: [] }), []);
}
