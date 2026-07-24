import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { formatPercentage, formatPnl } from '../../../utils/formatUtils';

interface PerpsProUnrealizedPnlProps {
  unrealizedPnl: string;
  returnOnEquity: string;
}

/**
 * Aggregate Unrealized P&L summary for the Pro positions list.
 *
 * The Close all button is intentionally display-only until its flow is scoped.
 */
const PerpsProUnrealizedPnl = ({
  unrealizedPnl,
  returnOnEquity,
}: PerpsProUnrealizedPnlProps) => {
  const pnl = parseFloat(unrealizedPnl) || 0;
  const roe = parseFloat(returnOnEquity) || 0;
  const valueColor =
    pnl > 0
      ? TextColor.SuccessDefault
      : pnl < 0
        ? TextColor.ErrorDefault
        : TextColor.TextDefault;

  return (
    <Box twClassName="px-4 py-3">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-4 rounded-xl bg-muted px-4 py-3"
      >
        <Box twClassName="flex-1">
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('perps.unrealized_pnl')}
          </Text>
          <Text
            variant={TextVariant.HeadingSm}
            color={valueColor}
          >{`${formatPnl(pnl)} (${formatPercentage(roe, 1)})`}</Text>
        </Box>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          isDanger
          twClassName="self-center border-muted bg-transparent"
        >
          {strings('perps.home.close_all')}
        </Button>
      </Box>
    </Box>
  );
};

export default React.memo(PerpsProUnrealizedPnl);
