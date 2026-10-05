import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import {
  formatLiquidationDistance,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import type { PerpsLiquidationPriceValueProps } from './PerpsLiquidationPriceValue.types';

const PerpsLiquidationPriceValue = ({
  liquidationPrice,
  currentPrice,
  isLong,
  isCross = false,
  privacyMode = false,
  textVariant = TextVariant.BodyMd,
  iconSize = IconSize.Sm,
  priceTestID,
  distanceTestID,
  iconTestID,
}: PerpsLiquidationPriceValueProps) => {
  const liquidationDistance = formatLiquidationDistance(
    currentPrice,
    liquidationPrice,
  );
  const priceDisplay =
    liquidationPrice !== undefined && liquidationPrice !== null
      ? formatPerpsFiat(liquidationPrice, { ranges: PRICE_RANGES_UNIVERSAL })
      : isCross
        ? strings('perps.cross_position.no_liquidation_price')
        : PERPS_CONSTANTS.FallbackPriceDisplay;

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName={isCross ? 'shrink' : undefined}
      accessible={false}
    >
      <SensitiveText
        variant={textVariant}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        isHidden={privacyMode}
        length={SensitiveTextLength.Short}
        testID={priceTestID}
        twClassName={isCross ? 'shrink text-right' : undefined}
      >
        {priceDisplay}
      </SensitiveText>
      {liquidationDistance !== undefined && !privacyMode ? (
        <>
          <Text
            variant={textVariant}
            color={TextColor.TextAlternative}
            testID={distanceTestID}
          >
            {' '}
            {liquidationDistance}
          </Text>
          <Icon
            name={isLong ? IconName.TrendDown : IconName.TrendUp}
            size={iconSize}
            color={IconColor.IconAlternative}
            testID={iconTestID}
          />
        </>
      ) : null}
    </Box>
  );
};

export default PerpsLiquidationPriceValue;
