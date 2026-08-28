import React, { useMemo } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  AvatarAccount,
  AvatarAccountSize,
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import { SOCIAL_TRADING_EVENTS } from '../../../analytics/events';
import { useSocialTrading } from '../../../context/SocialTradingContext';
import { formatPct, formatUsd, getTrader } from '../../../data/mockData';

interface SocialTradingPortfolioProps {
  onPressTrader: (traderId: string) => void;
}

/**
 * Summary of simulated copied positions and followed traders. All values
 * are mock data; closing a position only removes it from local state.
 */
export function SocialTradingPortfolio({
  onPressTrader,
}: SocialTradingPortfolioProps) {
  const { positions, followedIds, closePosition } = useSocialTrading();
  const { trackEvent, createEventBuilder } = useAnalytics();

  const { totalValue, totalPnlUsd, totalPnlPct } = useMemo(() => {
    const invested = positions.reduce((sum, p) => sum + p.amountUsd, 0);
    const pnl = positions.reduce(
      (sum, p) => sum + (p.amountUsd * p.pnlPct) / 100,
      0,
    );
    return {
      totalValue: invested + pnl,
      totalPnlUsd: pnl,
      totalPnlPct: invested > 0 ? (pnl / invested) * 100 : 0,
    };
  }, [positions]);

  const followedTraders = followedIds
    .map((id) => getTrader(id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  const handleClose = (positionId: string) => {
    closePosition(positionId);
    trackEvent(
      createEventBuilder(SOCIAL_TRADING_EVENTS.POSITION_CLOSE_SIMULATED)
        .addProperties({ position_id: positionId, simulated: true })
        .build(),
    );
  };

  return (
    <ScrollView
      testID="social-trading-portfolio-scroll"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 24,
        paddingTop: 12,
        gap: 16,
      }}
    >
      {/* Summary card */}
      <Box
        backgroundColor={BoxBackgroundColor.BackgroundSection}
        twClassName="rounded-2xl"
        padding={5}
        gap={2}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('social_trading.portfolio.value_label')}
        </Text>
        <Text variant={TextVariant.DisplayMd}>{formatUsd(totalValue)}</Text>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Tag
            severity={
              totalPnlUsd > 0
                ? TagSeverity.Success
                : totalPnlUsd < 0
                  ? TagSeverity.Danger
                  : TagSeverity.Neutral
            }
            startIconName={
              totalPnlUsd > 0
                ? IconName.TrendUp
                : totalPnlUsd < 0
                  ? IconName.TrendDown
                  : undefined
            }
          >
            {`${formatUsd(totalPnlUsd)} (${formatPct(totalPnlPct)})`}
          </Tag>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextMuted}>
            {strings('social_trading.portfolio.open_following', {
              open: positions.length,
              following: followedTraders.length,
            })}
          </Text>
        </Box>
      </Box>

      {/* Positions */}
      <Box gap={3}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('social_trading.portfolio.positions_title')}
        </Text>
        {positions.length === 0 ? (
          <Box
            alignItems={BoxAlignItems.Center}
            backgroundColor={BoxBackgroundColor.BackgroundSection}
            twClassName="rounded-2xl"
            paddingVertical={8}
            paddingHorizontal={4}
            gap={2}
          >
            <Icon
              name={IconName.Copy}
              size={IconSize.Xl}
              color={IconColor.IconMuted}
            />
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('social_trading.portfolio.empty_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {strings('social_trading.portfolio.empty_description')}
            </Text>
          </Box>
        ) : (
          positions.map((pos) => {
            const trader = getTrader(pos.traderId);
            const pnlUsd = (pos.amountUsd * pos.pnlPct) / 100;
            return (
              <Box
                key={pos.id}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                backgroundColor={BoxBackgroundColor.BackgroundSection}
                twClassName="rounded-2xl"
                padding={3}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={3}
                  twClassName="flex-1"
                >
                  <AvatarToken
                    name={pos.tokenName}
                    fallbackText={pos.tokenSymbol.slice(0, 1)}
                    size={AvatarTokenSize.Md}
                  />
                  <Box twClassName="flex-1">
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {pos.tokenSymbol}{' '}
                      {pos.side === 'buy'
                        ? strings('social_trading.portfolio.long')
                        : strings('social_trading.portfolio.short')}
                    </Text>
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextAlternative}
                      numberOfLines={1}
                    >
                      {strings('social_trading.portfolio.copying', {
                        name:
                          trader?.name ??
                          strings('social_trading.sheet.a_trader'),
                        amount: formatUsd(pos.amountUsd),
                      })}
                    </Text>
                  </Box>
                </Box>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={2}
                >
                  <Box alignItems={BoxAlignItems.End}>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      color={
                        pos.pnlPct > 0
                          ? TextColor.SuccessDefault
                          : pos.pnlPct < 0
                            ? TextColor.ErrorDefault
                            : TextColor.TextDefault
                      }
                    >
                      {formatPct(pos.pnlPct)}
                    </Text>
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextAlternative}
                    >
                      {formatUsd(pnlUsd)}
                    </Text>
                  </Box>
                  <ButtonIcon
                    iconName={IconName.Close}
                    size={ButtonIconSize.Sm}
                    onPress={() => handleClose(pos.id)}
                    accessibilityLabel={strings(
                      'social_trading.portfolio.close_position',
                    )}
                    testID={`social-trading-close-${pos.id}`}
                  />
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      {/* Following */}
      <Box gap={3}>
        <Text variant={TextVariant.HeadingSm}>
          {strings('social_trading.portfolio.following_title')}
        </Text>
        {followedTraders.length === 0 ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('social_trading.portfolio.following_empty')}
          </Text>
        ) : (
          followedTraders.map((trader) => (
            <Pressable
              key={trader.id}
              onPress={() => onPressTrader(trader.id)}
              accessibilityRole="button"
              accessibilityLabel={trader.name}
              testID={`social-trading-following-${trader.id}`}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                backgroundColor={BoxBackgroundColor.BackgroundSection}
                twClassName="rounded-2xl"
                padding={3}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={3}
                >
                  <AvatarAccount
                    address={trader.address}
                    size={AvatarAccountSize.Md}
                  />
                  <Box>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {trader.name}
                    </Text>
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextAlternative}
                    >
                      {trader.handle}
                    </Text>
                  </Box>
                </Box>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={
                    trader.pnl30d >= 0
                      ? TextColor.SuccessDefault
                      : TextColor.ErrorDefault
                  }
                >
                  {formatPct(trader.pnl30d)}
                </Text>
              </Box>
            </Pressable>
          ))
        )}
      </Box>
    </ScrollView>
  );
}

export default SocialTradingPortfolio;
