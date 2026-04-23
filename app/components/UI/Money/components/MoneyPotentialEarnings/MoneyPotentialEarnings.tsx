import React, { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import LinearGradient from 'react-native-linear-gradient';
import { BigNumber } from 'bignumber.js';
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
import useFiatFormatter from '../../../SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  STABLECOIN_SYMBOLS,
  tokenFiatValue,
} from '../../../Earn/hooks/useMusdConversionTokens';
import { Hex } from '@metamask/utils';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { isPositiveNumber } from '../../utils/number';

/** Number of years the projected earnings are simulated over. */
const PROJECTION_YEARS = 5;
const MAX_TOKENS = 5;
const GRADIENT_COLORS = [brandColor.lime100, brandColor.lime200];
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 0 };

const styles = StyleSheet.create({
  gradientContainer: { flexDirection: 'row' },
  gradient: { flex: 1 },
  rowPressable: { flex: 1 },
});

/**
 * True when the token list contains at least one token with a positive fiat
 * balance — the same criterion MoneyPotentialEarnings uses before rendering.
 * Exported so parents can gate surrounding chrome (e.g. Dividers) without
 * drifting from the component's internal filter.
 */
export const hasConvertibleTokensWithBalance = (tokens: AssetType[]) =>
  tokens.some((token) => tokenFiatValue(token) > 0);

interface MoneyPotentialEarningsProps {
  tokens: AssetType[];
  /**
   * APY expressed as a percentage (e.g. 3 for 3%) used together with
   * {@link PROJECTION_YEARS} to compute the projected earnings displayed
   * alongside each token and in the gradient headline.
   */
  apy: number | undefined;
  onTokenPress?: (token: AssetType) => void;
  onViewAllPress?: () => void;
  onHeaderPress?: () => void;
  /** When true, hides token rows and shows a single "View potential earnings" button. */
  condensed?: boolean;
}

const GradientAmountText = ({ value }: { value: string }) => {
  const textProps = {
    variant: TextVariant.HeadingMd,
    fontWeight: FontWeight.Bold,
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
        <Text
          {...textProps}
          twClassName="opacity-0"
          testID={MoneyPotentialEarningsTestIds.AMOUNT}
        >
          {value}
        </Text>
      </LinearGradient>
    </MaskedView>
  );
};

const TokenRow = ({
  token,
  hasSubsidizedFee,
  projectedMultiplier,
  onPress,
}: {
  token: AssetType;
  hasSubsidizedFee: boolean;
  projectedMultiplier: number;
  onPress: () => void;
}) => {
  const formatFiat = useFiatFormatter();
  const networkBadgeSource = useMemo(
    () => (token.chainId ? NetworkBadgeSource(token.chainId as Hex) : null),
    [token.chainId],
  );

  const projectedFiatNumber = tokenFiatValue(token) * projectedMultiplier;
  const projectedFiatFormatted = formatFiat(new BigNumber(projectedFiatNumber));

  const balanceFiatFormatted = token.balanceInSelectedCurrency;

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

const MoneyPotentialEarnings = ({
  tokens,
  apy,
  onTokenPress,
  onViewAllPress,
  onHeaderPress,
  condensed = false,
}: MoneyPotentialEarningsProps) => {
  const formatFiat = useFiatFormatter();
  const projectedMultiplier = useMemo(
    () => ((apy ?? 0) / 100) * PROJECTION_YEARS,
    [apy],
  );

  // Tokens arrive pre-sorted (stablecoins first, then fiat desc) from
  // useMusdConversionTokens; strip zero-balance entries defensively — the
  // feature flag threshold may be set to 0 in some environments.
  const eligibleTokens = useMemo(
    () => (tokens ?? []).filter((token) => tokenFiatValue(token) > 0),
    [tokens],
  );
  const visibleTokens = useMemo(
    () => eligibleTokens.slice(0, MAX_TOKENS),
    [eligibleTokens],
  );

  // Sum across every eligible token (not just the five we render). The "View
  // all" affordance tells users there are more rows than shown, so the
  // gradient headline is intentionally the full projection — clipping the
  // headline to the visible five would contradict that affordance.
  const projectedAmount = useMemo(
    () =>
      eligibleTokens.reduce(
        (sum, token) => sum + tokenFiatValue(token) * projectedMultiplier,
        0,
      ),
    [eligibleTokens, projectedMultiplier],
  );

  const handleTokenPress = useCallback(
    (token: AssetType) => () => onTokenPress?.(token),
    [onTokenPress],
  );

  if (!visibleTokens.length) {
    return null;
  }

  return (
    <Box testID={MoneyPotentialEarningsTestIds.CONTAINER}>
      <Box twClassName="px-4 py-3 gap-3">
        <MoneySectionHeader
          title={strings('money.potential_earnings.title')}
          onPress={onHeaderPress}
        />

        {isPositiveNumber(projectedAmount) && (
          <GradientAmountText
            value={`+${formatFiat(new BigNumber(projectedAmount))}`}
          />
        )}

        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {strings('money.potential_earnings.description')}
        </Text>
      </Box>

      {condensed ? (
        <Box twClassName="px-4 py-3">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onViewAllPress}
            testID={
              MoneyPotentialEarningsTestIds.VIEW_POTENTIAL_EARNINGS_BUTTON
            }
          >
            {strings('money.potential_earnings.view_potential_earnings')}
          </Button>
        </Box>
      ) : (
        <>
          {visibleTokens.map((token) => (
            <TokenRow
              key={`${token.address}-${token.chainId}`}
              token={token}
              hasSubsidizedFee={STABLECOIN_SYMBOLS.has(token.symbol)}
              projectedMultiplier={projectedMultiplier}
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
        </>
      )}
    </Box>
  );
};

export default MoneyPotentialEarnings;
