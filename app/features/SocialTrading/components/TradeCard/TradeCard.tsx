import React from 'react';
import { Pressable } from 'react-native';
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
  Button,
  ButtonSize,
  ButtonVariant,
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

import { strings } from '../../../../../locales/i18n';
import { useAnalytics } from '../../../../components/hooks/useAnalytics/useAnalytics';
import { SOCIAL_TRADING_EVENTS } from '../../analytics/events';
import { useSocialTrading } from '../../context/SocialTradingContext';
import {
  formatCount,
  formatMinutesAgo,
  formatPct,
  formatUsd,
  getTrader,
  Trade,
} from '../../data/mockData';

interface TradeCardProps {
  trade: Trade;
  onCopy: (trade: Trade) => void;
  onPressTrader?: (traderId: string) => void;
}

/**
 * Renders a single simulated trade in the Social Trading prototype feed.
 * All values shown are mock data; the copy action only opens the simulated
 * copy sheet.
 */
export function TradeCard({ trade, onCopy, onPressTrader }: TradeCardProps) {
  const { isLiked, toggleLike } = useSocialTrading();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const trader = getTrader(trade.traderId);
  if (!trader) return null;

  const liked = isLiked(trade.id);
  const isBuy = trade.side === 'buy';
  const pnlPositive = trade.pnlPct > 0;
  const pnlFlat = trade.pnlPct === 0;

  const handleLike = () => {
    toggleLike(trade.id);
    trackEvent(
      createEventBuilder(SOCIAL_TRADING_EVENTS.TRADE_LIKE_TOGGLED)
        .addProperties({ trade_id: trade.id, liked: !liked })
        .build(),
    );
  };

  return (
    <Box
      backgroundColor={BoxBackgroundColor.BackgroundSection}
      twClassName="rounded-2xl"
      padding={4}
      gap={3}
    >
      {/* Trader row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Pressable
          onPress={() => onPressTrader?.(trader.id)}
          disabled={!onPressTrader}
          accessibilityRole="button"
          accessibilityLabel={trader.name}
          testID={`social-trading-trade-${trade.id}-trader`}
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
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {trader.name}
                </Text>
                {trader.verified ? (
                  <Icon
                    name={IconName.VerifiedFilled}
                    size={IconSize.Sm}
                    color={IconColor.PrimaryDefault}
                  />
                ) : null}
              </Box>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {trader.handle} ·{' '}
                {strings('social_trading.trade.time_ago', {
                  time: formatMinutesAgo(trade.minutesAgo),
                })}
              </Text>
            </Box>
          </Box>
        </Pressable>
        <Tag severity={isBuy ? TagSeverity.Success : TagSeverity.Danger}>
          {isBuy
            ? strings('social_trading.trade.buy')
            : strings('social_trading.trade.sell')}
        </Tag>
      </Box>

      {/* Asset row */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        backgroundColor={BoxBackgroundColor.BackgroundMuted}
        twClassName="rounded-xl"
        padding={3}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
        >
          <AvatarToken
            name={trade.tokenName}
            fallbackText={trade.tokenSymbol.slice(0, 1)}
            size={AvatarTokenSize.Md}
          />
          <Box>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {trade.tokenSymbol}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {formatUsd(trade.price)}
            </Text>
          </Box>
        </Box>
        <Box alignItems={BoxAlignItems.End}>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {formatUsd(trade.amountUsd)}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            {!pnlFlat ? (
              <Icon
                name={pnlPositive ? IconName.TrendUp : IconName.TrendDown}
                size={IconSize.Xs}
                color={
                  pnlPositive
                    ? IconColor.SuccessDefault
                    : IconColor.ErrorDefault
                }
              />
            ) : null}
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              color={
                pnlFlat
                  ? TextColor.TextAlternative
                  : pnlPositive
                    ? TextColor.SuccessDefault
                    : TextColor.ErrorDefault
              }
            >
              {formatPct(trade.pnlPct)}
            </Text>
          </Box>
        </Box>
      </Box>

      {trade.note ? (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {trade.note}
        </Text>
      ) : null}

      {/* Actions */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={5}
        >
          <Pressable
            onPress={handleLike}
            accessibilityRole="button"
            accessibilityLabel={strings('social_trading.trade.like')}
            testID={`social-trading-trade-${trade.id}-like`}
            hitSlop={8}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Icon
                name={liked ? IconName.HeartFilled : IconName.Heart}
                size={IconSize.Sm}
                color={
                  liked ? IconColor.ErrorDefault : IconColor.IconAlternative
                }
              />
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {formatCount(trade.likes + (liked ? 1 : 0))}
              </Text>
            </Box>
          </Pressable>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            <Icon
              name={IconName.Copy}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {strings('social_trading.trade.copied_count', {
                count: formatCount(trade.copies),
              })}
            </Text>
          </Box>
        </Box>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={() => onCopy(trade)}
          testID={`social-trading-trade-${trade.id}-copy`}
        >
          {strings('social_trading.trade.copy_trade')}
        </Button>
      </Box>
    </Box>
  );
}

export default TradeCard;
