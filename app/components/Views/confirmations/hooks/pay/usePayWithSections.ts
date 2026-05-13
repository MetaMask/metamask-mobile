import { useMemo } from 'react';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { usePayWithCryptoSection } from './sections';

export interface UsePayWithSectionsResult {
  sections: PayWithSectionConfig[];
}

export function usePayWithSections(): UsePayWithSectionsResult {
  const cryptoSection = usePayWithCryptoSection();

  return useMemo<UsePayWithSectionsResult>(
    () => ({
      sections: [cryptoSection].filter(isPayWithSectionConfig),
    }),
    [cryptoSection],
  );
}

function isPayWithSectionConfig(
  section: PayWithSectionConfig | null,
): section is PayWithSectionConfig {
  return section !== null;
}
