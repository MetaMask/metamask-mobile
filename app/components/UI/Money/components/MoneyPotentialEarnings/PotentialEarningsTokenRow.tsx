import React, { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { BigNumber } from 'bignumber.js';
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
import {
  moneyFormatFiat,
  moneySafeTokenFiatCurrency,
} from '../../utils/moneyFormatFiat';
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
  apyDecimal,
  onCardPress,
  onButtonPress,
  testID,
}: {
  token: AssetType;
  hasSubsidizedFee: boolean;
  /** APY as a decimal (e.g. 0.04 for 4%). */
  apyDecimal: number;
  onCardPress: () => void;
  onButtonPress: () => void;
  testID?: string;
}) => {
  const fiatCurrency = moneySafeTokenFiatCurrency(token);

  const networkBadgeSource = useMemo(
    () => (token.chainId ? NetworkBadgeSource(token.chainId as Hex) : null),
    [token.chainId],
  );

  const fiatBalance = tokenFiatValue(token);
  const projectedFiatNumber = calculateProjectedEarnings(
    fiatBalance,
    apyDecimal,
    PROJECTION_YEARS,
  );
  const projectedFiatFormatted = moneyFormatFiat(
    new BigNumber(projectedFiatNumber),
    fiatCurrency,
  );

  const balanceFiatFormatted = moneyFormatFiat(
    new BigNumber(fiatBalance),
    fiatCurrency,
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3 gap-4"
    >
      <Pressable
        onPress={onCardPress}
        style={styles.rowPressable}
        testID={testID}
      >
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
                <Box twClassName="rounded bg-primary-muted px-1.5">
                  <Text
                    variant={TextVariant.BodyXs}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.PrimaryDefault}
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
        onPress={onButtonPress}
      >
        {strings('money.potential_earnings.add')}
      </Button>
    </Box>
  );
};

export default PotentialEarningsTokenRow;
