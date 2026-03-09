import React from 'react';
import {
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { MUSD_CONVERSION_APY } from '../../../../UI/Earn/constants/musd';
import { strings } from '../../../../../../locales/i18n';

const PERCENTAGE_PART = `${MUSD_CONVERSION_APY}%`;

interface CashAnnualizedCopyProps {
  /** Optional Tailwind class for the wrapper Text (e.g. px-0). */
  twClassName?: string;
}

/**
 * Renders the Cash section annualized bonus copy with the percentage highlighted in green.
 * Single source of truth for locale key and formatting; used by CashSection and CashGetMusdEmptyState.
 */
const CashAnnualizedCopy = ({ twClassName }: CashAnnualizedCopyProps) => {
  const copyStr = strings('homepage.sections.cash_annualized_copy', {
    percentage: MUSD_CONVERSION_APY,
  });
  const copyParts = copyStr.split(PERCENTAGE_PART);

  return (
    <Text
      variant={TextVariant.BodyMd}
      color={TextColor.TextAlternative}
      twClassName={twClassName}
    >
      {copyParts.length >= 2 ? (
        <>
          {copyParts[0]}
          <Text color={TextColor.SuccessDefault} fontWeight={FontWeight.Medium}>
            {PERCENTAGE_PART}
          </Text>
          {copyParts[1]}
        </>
      ) : (
        copyStr
      )}
    </Text>
  );
};

CashAnnualizedCopy.displayName = 'CashAnnualizedCopy';

export default CashAnnualizedCopy;
