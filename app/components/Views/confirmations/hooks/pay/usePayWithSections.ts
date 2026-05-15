import { useMemo } from 'react';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import {
  usePayWithCryptoSection,
  usePayWithPerpsSection,
  usePayWithPredictSection,
} from './sections';

export interface UsePayWithSectionsResult {
  sections: PayWithSectionConfig[];
}

export function usePayWithSections(): UsePayWithSectionsResult {
  const perpsSection = usePayWithPerpsSection();
  const predictSection = usePayWithPredictSection();
  const cryptoSection = usePayWithCryptoSection();

  return useMemo<UsePayWithSectionsResult>(
    () => ({
      sections: [perpsSection, predictSection, cryptoSection].filter(
        isPayWithSectionConfig,
      ),
    }),
    [cryptoSection, perpsSection, predictSection],
  );
}

function isPayWithSectionConfig(
  section: PayWithSectionConfig | null,
): section is PayWithSectionConfig {
  return section !== null;
}
