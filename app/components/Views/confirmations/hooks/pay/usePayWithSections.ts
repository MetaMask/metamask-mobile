import { useMemo } from 'react';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import { usePayWithCryptoSection, usePayWithPerpsSection } from './sections';

export interface UsePayWithSectionsResult {
  sections: PayWithSectionConfig[];
}

export function usePayWithSections(): UsePayWithSectionsResult {
  const perpsSection = usePayWithPerpsSection();
  const cryptoSection = usePayWithCryptoSection();

  return useMemo<UsePayWithSectionsResult>(
    () => ({
      sections: [perpsSection, cryptoSection].filter(isPayWithSectionConfig),
    }),
    [cryptoSection, perpsSection],
  );
}

function isPayWithSectionConfig(
  section: PayWithSectionConfig | null,
): section is PayWithSectionConfig {
  return section !== null;
}
