import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';

interface PriceImpactDescriptionProps {
  content: string;
  formattedPriceImpact?: string;
  formattedPriceImpactFiat?: string;
  isDanger: boolean;
}

export function PriceImpactDescription({
  content,
  formattedPriceImpact,
  formattedPriceImpactFiat,
  isDanger,
}: PriceImpactDescriptionProps) {
  return (
    <Box paddingHorizontal={4} paddingVertical={2} gap={4}>
      <Box>
        <Text color={TextColor.TextAlternative}>
          {strings(content, {
            priceImpact: formattedPriceImpact ?? '0',
          })}
        </Text>
      </Box>
      {formattedPriceImpactFiat && isDanger && (
        <Box>
          <BannerAlert
            severity={BannerAlertSeverity.Danger}
            description={strings('bridge.price_impact_fiat_alert', {
              priceImpactFiat: formattedPriceImpactFiat,
            })}
          />
        </Box>
      )}
    </Box>
  );
}
