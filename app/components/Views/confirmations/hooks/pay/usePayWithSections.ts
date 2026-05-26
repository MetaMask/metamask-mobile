import { useMemo } from 'react';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import {
  usePayWithCryptoSection,
  usePayWithFiatSection,
  usePayWithMoneyAccountSection,
  usePayWithPerpsSection,
  usePayWithPredictSection,
} from './sections';

export interface UsePayWithSectionsResult {
  sections: PayWithSectionConfig[];
}

export function usePayWithSections(): UsePayWithSectionsResult {
  const moneyAccountSection = usePayWithMoneyAccountSection();
  const perpsSection = usePayWithPerpsSection();
  const predictSection = usePayWithPredictSection();
  const bankCardSection = usePayWithFiatSection();
  const cryptoSection = usePayWithCryptoSection();

  return useMemo<UsePayWithSectionsResult>(
    () => ({
      sections: [
        moneyAccountSection,
        perpsSection,
        predictSection,
        bankCardSection,
        cryptoSection,
      ].filter(isPayWithSectionConfig),
    }),
    [
      bankCardSection,
      cryptoSection,
      moneyAccountSection,
      perpsSection,
      predictSection,
    ],
  );
}

function isPayWithSectionConfig(
  section: PayWithSectionConfig | null,
): section is PayWithSectionConfig {
  return section !== null;
}
