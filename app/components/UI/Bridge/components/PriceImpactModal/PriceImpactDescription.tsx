import React, { useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { Box, Text, TextColor } from '@metamask/design-system-react-native';
import { PriceImpactModalType } from './constants';

interface PriceImpactDescriptionProps {
  type: PriceImpactModalType;
  priceImpact?: string;
}

export function PriceImpactDescription({
  type,
  priceImpact,
}: PriceImpactDescriptionProps) {
  const isWarning = Boolean(priceImpact);

  const body = useMemo(() => {
    if (type === PriceImpactModalType.Execution) {
      return strings('bridge.price_impact_execution_description', {
        priceImpact: priceImpact ?? '0',
      });
    }
    if (isWarning) {
      return strings('bridge.price_impact_warning_description', {
        priceImpact: priceImpact ?? '0',
      });
    }
    return strings('bridge.price_impact_info_description');
  }, [type, priceImpact, isWarning]);

  return (
    <Box paddingHorizontal={4} paddingVertical={2}>
      <Text color={TextColor.TextAlternative}>{body}</Text>
    </Box>
  );
}
