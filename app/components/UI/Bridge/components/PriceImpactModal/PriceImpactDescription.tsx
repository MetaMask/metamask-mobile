import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { Box, Text, TextColor } from '@metamask/design-system-react-native';

interface PriceImpactDescriptionProps {
  content: string;
  formattedPriceImpact?: string;
}

export function PriceImpactDescription({
  content,
  formattedPriceImpact,
}: PriceImpactDescriptionProps) {
  return (
    <Box paddingHorizontal={4} paddingVertical={2}>
      <Text color={TextColor.TextAlternative}>
        {strings(content, {
          priceImpact: formattedPriceImpact ?? '0',
        })}
      </Text>
    </Box>
  );
}
