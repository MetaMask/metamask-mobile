import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import { formatPercentage, formatPnl } from '../../../utils/formatUtils';

interface PerpsProUnrealizedPnlProps {
  unrealizedPnl: string;
  returnOnEquity: string;
  positionCount: number;
  isFiltered?: boolean;
  onCloseAll?: () => void;
}

/**
 * Aggregate Unrealized P&L summary for the Pro positions list.
 */
const PerpsProUnrealizedPnl = ({
  unrealizedPnl,
  returnOnEquity,
  positionCount,
  isFiltered = false,
  onCloseAll,
}: PerpsProUnrealizedPnlProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const pnl = parseFloat(unrealizedPnl) || 0;
  const roe = parseFloat(returnOnEquity) || 0;
  const valueColor = privacyMode
    ? TextColor.TextDefault
    : pnl > 0
      ? TextColor.SuccessDefault
      : pnl < 0
        ? TextColor.ErrorDefault
        : TextColor.TextDefault;

  return (
    <Box twClassName="px-2 py-3">
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
          <SensitiveText
            variant={TextVariant.HeadingSm}
            color={valueColor}
            isHidden={privacyMode}
            length={SensitiveTextLength.Short}
          >{`${formatPnl(pnl)} (${formatPercentage(roe, 1)})`}</SensitiveText>
        </Box>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          isDanger
          twClassName="self-center border-muted bg-transparent"
          onPress={onCloseAll}
          testID={PerpsProMarketViewSelectorsIDs.POSITIONS_CLOSE_ALL}
        >
          {isFiltered
            ? strings('perps.pro_positions_panel.close_count', {
                count: positionCount,
              })
            : strings('perps.home.close_all')}
        </Button>
      </Box>
    </Box>
  );
};

export default React.memo(PerpsProUnrealizedPnl);
