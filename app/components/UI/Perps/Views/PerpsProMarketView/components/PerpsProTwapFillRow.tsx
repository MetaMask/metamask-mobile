import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import React from 'react';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import {
  formatPerpsFiat,
  formatPositionSize,
  formatProOrderCardTimestamp,
  PRICE_RANGES_UNIVERSAL,
} from '../../../utils/formatUtils';
import type { ProTwapFillRow } from '../utils/proTwapViews';

interface PerpsProTwapFillRowProps {
  row: ProTwapFillRow;
  testID?: string;
}

/**
 * One executed TWAP slice in the Fill History view. Slices are the individual
 * child fills a schedule expands into, so each row names its parent market and
 * side alongside the fill's own price, size, and fee.
 */
const PerpsProTwapFillRowItem = ({ row, testID }: PerpsProTwapFillRowProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const { fill, twapOrder } = row;
  const displaySymbol = getPerpsDisplaySymbol(twapOrder.symbol);
  const isBuySide = fill.side === 'buy';

  return (
    <Box
      twClassName="gap-1 px-2 py-3"
      testID={testID ?? PerpsProMarketViewSelectorsIDs.TWAP_FILL_ROW}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-2"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {displaySymbol}
          </Text>
          <Tag severity={isBuySide ? TagSeverity.Success : TagSeverity.Danger}>
            {isBuySide
              ? strings('perps.market.long')
              : strings('perps.market.short')}
          </Tag>
        </Box>
        <SensitiveText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
        >
          {formatPerpsFiat(Number.parseFloat(fill.price), {
            ranges: PRICE_RANGES_UNIVERSAL,
          })}
        </SensitiveText>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-2"
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {formatProOrderCardTimestamp(fill.timestamp)}
        </Text>
        <SensitiveText
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
        >
          {`${formatPositionSize(fill.size)} ${displaySymbol}`}
        </SensitiveText>
      </Box>
    </Box>
  );
};

export default React.memo(PerpsProTwapFillRowItem);
