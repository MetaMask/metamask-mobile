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
import {
  getPerpsProTwapFillRowSelector,
  getPerpsProTwapFillValueSelector,
  PerpsProMarketViewSelectorsIDs,
} from '../../../Perps.testIds';
import {
  formatPerpsFiat,
  formatPositionSize,
  formatProOrderCardTimestamp,
  PRICE_RANGES_UNIVERSAL,
} from '../../../utils/formatUtils';
import type { ProTwapFillRow } from '../utils/proTwapViews';
import { getTwapDirectionLabelKey } from '../../../utils/twapOrderUtils';

interface PerpsProTwapFillRowProps {
  row: ProTwapFillRow;
}

/**
 * One executed TWAP slice in the Fill History view. Slices are the individual
 * child fills a schedule expands into, so each row names its parent market and
 * side alongside the fill's price, size, and execution time.
 */
const PerpsProTwapFillRowItem = ({ row }: PerpsProTwapFillRowProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const { fill, twapOrder } = row;
  const displaySymbol = getPerpsDisplaySymbol(twapOrder.symbol);
  const isBuySide = fill.side === 'buy';
  const directionLabel = strings(
    getTwapDirectionLabelKey({
      reduceOnly: twapOrder.reduceOnly,
      side: fill.side,
    }),
  );
  const getValueTestID = (baseTestID: string) =>
    getPerpsProTwapFillValueSelector(
      baseTestID,
      twapOrder.providerId,
      twapOrder.orderId,
      fill.fillId,
    );

  return (
    <Box
      twClassName="gap-1 px-2 py-3"
      testID={getPerpsProTwapFillRowSelector(
        twapOrder.providerId,
        twapOrder.orderId,
        fill.fillId,
      )}
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
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            testID={getValueTestID(
              PerpsProMarketViewSelectorsIDs.TWAP_FILL_MARKET,
            )}
          >
            {displaySymbol}
          </Text>
          <Tag
            severity={isBuySide ? TagSeverity.Success : TagSeverity.Danger}
            testID={getValueTestID(
              PerpsProMarketViewSelectorsIDs.TWAP_FILL_DIRECTION,
            )}
          >
            {directionLabel}
          </Tag>
        </Box>
        <SensitiveText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
          testID={getValueTestID(
            PerpsProMarketViewSelectorsIDs.TWAP_FILL_PRICE,
          )}
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
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={getValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_FILL_TIME)}
        >
          {formatProOrderCardTimestamp(fill.timestamp)}
        </Text>
        <SensitiveText
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
          testID={getValueTestID(PerpsProMarketViewSelectorsIDs.TWAP_FILL_SIZE)}
        >
          {`${formatPositionSize(fill.size)} ${displaySymbol}`}
        </SensitiveText>
      </Box>
    </Box>
  );
};

export default React.memo(PerpsProTwapFillRowItem);
