import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import {
  calculateProjectedEarnings,
  PROJECTION_YEARS,
} from '../../utils/projections';
import { tokenFiatValue } from '../../../Earn/hooks/useMusdConversionTokens';
import { Hex } from '@metamask/utils';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { isPositiveNumber } from '../../utils/number';

const styles = StyleSheet.create({
  rowPressable: { flex: 1 },
});

const PotentialEarningsTokenRow = ({
  token,
  hasSubsidizedFee,
  apyPercent,
  onPress,
}: {
  token: AssetType;
  hasSubsidizedFee: boolean;
  /** APY as a percentage (e.g. 4 for 4%). */
  apyPercent: number;
  onPress: () => void;
}) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const networkBadgeSource = useMemo(
    () => (token.chainId ? NetworkBadgeSource(token.chainId as Hex) : null),
    [token.chainId],
  );

  const fiatBalance = tokenFiatValue(token);
  const projectedFiatNumber = calculateProjectedEarnings(
    fiatBalance,
    apyPercent,
    PROJECTION_YEARS,
  );
  const projectedFiatFormatted = moneyFormatFiat(
    new BigNumber(projectedFiatNumber),
    currentCurrency,
  );

  const balanceFiatFormatted = moneyFormatFiat(
    new BigNumber(fiatBalance),
    currentCurrency,
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3 gap-4"
    >
      <Pressable onPress={onPress} style={styles.rowPressable}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-4"
        >
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              networkBadgeSource && (
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={networkBadgeSource}
                />
              )
            }
          >
            <AssetLogo asset={token} />
          </BadgeWrapper>

          <Box twClassName="flex-1">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {token.symbol}
              </Text>
              {hasSubsidizedFee && (
                <Box twClassName="rounded bg-muted px-1.5">
                  <Text
                    variant={TextVariant.BodyXs}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {strings('money.potential_earnings.no_fee')}
                  </Text>
                </Box>
              )}
            </Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-1"
            >
              <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
                {balanceFiatFormatted}
              </Text>
              {isPositiveNumber(projectedFiatNumber) && (
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.SuccessDefault}
                >
                  {`+${projectedFiatFormatted}`}
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      </Pressable>

      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        onPress={onPress}
      >
        {strings('money.potential_earnings.convert')}
      </Button>
    </Box>
  );
};

export default PotentialEarningsTokenRow;
