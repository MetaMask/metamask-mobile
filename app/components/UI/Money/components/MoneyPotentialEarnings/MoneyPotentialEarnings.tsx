import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import { brandColor } from '@metamask/design-tokens';
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
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyPotentialEarningsTestIds } from './MoneyPotentialEarnings.testIds';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { Hex } from '@metamask/utils';
import { AssetType } from '../../../../Views/confirmations/types/token';

/** 4% APY sustained for 5 years = 20% projected gain on current balance. */
const PROJECTED_MULTIPLIER = 0.04 * 5;
const MAX_TOKENS = 5;
const STABLECOIN_SYMBOLS = new Set(['USDC', 'USDT', 'DAI']);
const GRADIENT_COLORS = [brandColor.lime100, brandColor.lime200];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };

const styles = StyleSheet.create({
  gradientContainer: { flexDirection: 'row' },
  gradient: { flex: 1 },
  rowPressable: { flex: 1 },
});

const formatUsd = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const tokenFiatValue = (token: AssetType) => token.fiat?.balance ?? 0;

const sortTokens = (tokens: AssetType[]) => {
  const withBalance = tokens.filter((t) => tokenFiatValue(t) > 0);
  const stables = withBalance
    .filter((t) => STABLECOIN_SYMBOLS.has(t.symbol))
    .sort((a, b) => tokenFiatValue(b) - tokenFiatValue(a));
  const others = withBalance
    .filter((t) => !STABLECOIN_SYMBOLS.has(t.symbol))
    .sort((a, b) => tokenFiatValue(b) - tokenFiatValue(a));
  return [...stables, ...others];
};

interface MoneyPotentialEarningsProps {
  tokens: AssetType[];
  onTokenPress?: (token: AssetType) => void;
  onViewAllPress?: () => void;
  onHeaderPress?: () => void;
}

const GradientAmountText = ({ value }: { value: string }) => {
  const textProps = {
    variant: TextVariant.HeadingMd,
    fontWeight: FontWeight.Bold,
    testID: MoneyPotentialEarningsTestIds.AMOUNT,
  };
  return (
    <MaskedView
      style={styles.gradientContainer}
      maskElement={
        <Text {...textProps} color={TextColor.TextDefault}>
          {value}
        </Text>
      }
    >
      <LinearGradient
        colors={GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.gradient}
      >
        <Text {...textProps} twClassName="opacity-0">
          {value}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

const TokenRow = ({
  token,
  hasSubsidizedFee,
  onPress,
}: {
  token: AssetType;
  hasSubsidizedFee: boolean;
  onPress: () => void;
}) => {
  const networkBadgeSource = useMemo(
    () => (token.chainId ? NetworkBadgeSource(token.chainId as Hex) : null),
    [token.chainId],
  );
  const projected = formatUsd(tokenFiatValue(token) * PROJECTED_MULTIPLIER);
  const balanceDisplay = token.balanceInSelectedCurrency;

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
                {balanceDisplay}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.SuccessDefault}
              >
                {`+${projected}`}
              </Text>
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

const MoneyPotentialEarnings = ({
  tokens,
  onTokenPress,
  onViewAllPress,
  onHeaderPress,
}: MoneyPotentialEarningsProps) => {
  const sortedTokens = useMemo(() => sortTokens(tokens ?? []), [tokens]);
  const visibleTokens = useMemo(
    () => sortedTokens.slice(0, MAX_TOKENS),
    [sortedTokens],
  );

  const projectedAmount = useMemo(
    () =>
      sortedTokens.reduce(
        (sum, token) => sum + tokenFiatValue(token) * PROJECTED_MULTIPLIER,
        0,
      ),
    [sortedTokens],
  );

  const handleTokenPress = useCallback(
    (token: AssetType) => () => onTokenPress?.(token),
    [onTokenPress],
  );

  if (!sortedTokens.length) {
    return null;
  }

  return (
    <Box testID={MoneyPotentialEarningsTestIds.CONTAINER}>
      <Box twClassName="px-4 py-3 gap-3">
        <MoneySectionHeader
          title={strings('money.potential_earnings.title')}
          onPress={onHeaderPress}
        />

        <GradientAmountText value={`+${formatUsd(projectedAmount)}`} />

        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {strings('money.potential_earnings.description')}
        </Text>
      </Box>

      {visibleTokens.map((token) => (
        <TokenRow
          key={`${token.address}-${token.chainId}`}
          token={token}
          hasSubsidizedFee={STABLECOIN_SYMBOLS.has(token.symbol)}
          onPress={handleTokenPress(token)}
        />
      ))}

      <Box twClassName="px-4 py-3">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onViewAllPress}
          testID={MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON}
        >
          {strings('money.potential_earnings.view_all')}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyPotentialEarnings;
