import React, { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { Box, Text, TextColor } from '@metamask/design-system-react-native';
import { PriceImpactModalType } from './constants';

interface PriceImpactDescriptionProps {
  type: PriceImpactModalType;
  formattedPriceImpact?: string;
}

export function PriceImpactDescription({
  type,
  formattedPriceImpact,
}: PriceImpactDescriptionProps) {
  const isWarning = Boolean(formattedPriceImpact);

  const body = useMemo(() => {
    if (type === PriceImpactModalType.Execution) {
      return strings('bridge.price_impact_execution_description', {
        priceImpact: formattedPriceImpact ?? '0',
      });
    }
    if (isWarning) {
      return strings('bridge.price_impact_warning_description', {
        priceImpact: formattedPriceImpact ?? '0',
      });
    }
    return strings('bridge.price_impact_info_description');
  }, [type, formattedPriceImpact, isWarning]);

  return (
    <Box paddingHorizontal={4} paddingVertical={2}>
      <Text color={TextColor.TextAlternative}>{body}</Text>
    </Box>
  );
}
