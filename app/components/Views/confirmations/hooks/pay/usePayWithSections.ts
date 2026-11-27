import { useMemo } from 'react';
import { PayWithSectionConfig } from '../../components/modals/pay-with-bottom-sheet/pay-with-bottom-sheet.types';
import {
  usePayWithCryptoSection,
  usePayWithFiatSection,
  usePayWithMoneyAccountSection,
  usePayWithPerpsAccountSection,
  usePayWithPerpsSection,
  usePayWithPredictSection,
} from './sections';

export interface UsePayWithSectionsResult {
  sections: PayWithSectionConfig[];
}

export function usePayWithSections(): UsePayWithSectionsResult {
  const moneyAccountSection = usePayWithMoneyAccountSection();
  const perpsSection = usePayWithPerpsSection();
  const perpsAccountSection = usePayWithPerpsAccountSection();
  const predictSection = usePayWithPredictSection();
  const bankCardSection = usePayWithFiatSection();
  const cryptoSection = usePayWithCryptoSection();

  return useMemo<UsePayWithSectionsResult>(
    () => ({
      sections: [
        moneyAccountSection,
        perpsSection,
        perpsAccountSection,
        predictSection,
        bankCardSection,
        cryptoSection,
      ].filter(isPayWithSectionConfig),
    }),
    [
      bankCardSection,
      cryptoSection,
      moneyAccountSection,
      perpsAccountSection,
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
