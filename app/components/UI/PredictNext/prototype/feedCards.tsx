import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';
import { BITCOIN_LOGO, ETH_LOGO } from './assets';
import { ArrowUpIcon } from './assets/icons';
import { buildIntent, cryptoOutcomes, isBinary, useStartsIn } from './cards';
import { ProtoAvatarCircle } from './components';
import {
  FeedCardSurface,
  FeedFooter,
  FeedLiveChart,
  FeedOutcomeRow,
  FeedStatusLine,
  OddsPill,
  PhosphorIcon,
  type FeedStatus,
} from './feedUi';
import {
  commentSeed,
  teamAvatar,
  type ProtoCryptoEvent,
  type ProtoGameEvent,
  type ProtoOutcome,
  type ProtoStandardEvent,
} from './fixtures';
import {
  usePrototypeState,
  type ProtoCommentsTarget,
  type ProtoOrderIntent,
  useHeldContracts,
} from './PrototypeState';
import {
  useLiveEngagement,
  useLiveGame,
  useTickingPrice,
  type CryptoRoundState,
} from './simulation';

const styles = StyleSheet.create({
  mark: { width: 32, height: 32 },
  flipped: { transform: [{ rotate: '180deg' }] },
  thumb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** Every trending card is this tall so the carousel reads as one row. */
export const FEED_TRENDING_HEIGHT = 256;
/** The crypto round turns red for the last stretch, like the Figma BTC card. */
const CLOSING_SECONDS = 30;

interface FeedStats {
  volume: string;
  comments: number;
}

interface FeedCardBase {
  /** `trending` is a fixed-size carousel card, `list` stretches in a column. */
  variant: 'trending' | 'list';
  width?: number;
  stats: FeedStats;
  onPress: () => void;
  onOrder: (intent: ProtoOrderIntent) => void;
  onComments: (target: ProtoCommentsTarget) => void;
}

/** `Panthers vs. Eagles` is `Panthers vs Eagles` in the Figma feed. */
const feedTitle = (title: string) => title.replace(' vs. ', ' vs ');

const useFeedStyles = () => {
  const { colors } = useTheme();
  return { colors };
};

export const FeedGameCard = ({
  event,
  variant,
  width,
  stats,
  onPress,
  onOrder,
  onComments,
}: FeedCardBase & { event: ProtoGameEvent }) => {
  const live = useLiveGame(event, { realtime: true, replay: true });
  const held = useHeldContracts(event.id);
  const engagement = useLiveEngagement(stats);
  const moneyline = event.sections[0].markets[0];
  const idleAway = useTickingPrice(moneyline.outcomes[0].price, !event.isLive);
  const awayPrice = event.isLive ? live.awayProbability : idleAway;
  const outcomes = moneyline.outcomes.map((outcome, index) => ({
    ...outcome,
    price: index === 0 ? awayPrice : 100 - awayPrice,
  }));
  const isTrending = variant === 'trending';
  const showScores = event.isLive && isTrending;
  const status: FeedStatus = event.isLive
    ? live.isFinal
      ? { label: 'Final', suffix: event.league }
      : {
          label: live.feedClockLabel,
          tone: live.isFinalPeriod ? 'error' : 'success',
          suffix: event.league,
        }
    : { label: event.startTime.replace(' · ', ' • '), suffix: event.league };
  const sides = [
    { team: event.away, side: 'away' as const, score: live.awayScore },
    { team: event.home, side: 'home' as const, score: live.homeScore },
  ];
  return (
    <FeedCardSurface
      testID={`feed-game-card-${event.id}`}
      width={width}
      height={isTrending ? FEED_TRENDING_HEIGHT : undefined}
      onPress={onPress}
    >
      <Box twClassName={`gap-3 ${isTrending ? 'flex-1 justify-between' : ''}`}>
        <Box twClassName="gap-1">
          <Text
            variant={isTrending ? TextVariant.BodyMd : TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            numberOfLines={1}
          >
            {feedTitle(event.title)}
          </Text>
          <FeedStatusLine status={status} />
        </Box>
        <Box twClassName="gap-2">
          {sides.map(({ team, side, score }, index) => (
            <FeedOutcomeRow
              key={team.name}
              thumb={
                <ProtoAvatarCircle avatar={teamAvatar(team, side)} size={28} />
              }
              name={isTrending ? `${team.abbr} ${team.name}` : team.name}
              nameVariant={TextVariant.BodyMd}
              share={outcomes[index].price}
              barColor={team.color}
              score={showScores ? score : undefined}
              pill={
                <OddsPill
                  isFixedWidth
                  tone="success"
                  badge={held(outcomes[index].id)}
                  price={outcomes[index].price}
                  accessibilityLabel={`${team.name}, buy at ${outcomes[index].price} percent`}
                  testID={`feed-pill-${event.id}-${index}`}
                  onPress={() =>
                    onOrder(
                      buildIntent(
                        event.id,
                        event.title,
                        moneyline.title,
                        outcomes,
                        index,
                      ),
                    )
                  }
                />
              }
            />
          ))}
        </Box>
        <FeedFooter
          volume={engagement.volume}
          comments={engagement.comments}
          onCommentsPress={() =>
            onComments({
              eventId: event.id,
              title: feedTitle(event.title),
              count: engagement.comments,
            })
          }
        />
      </Box>
    </FeedCardSurface>
  );
};

/** Square token mark, 32px, rounded like the Figma lockup. */
const CryptoMark = ({ ticker, color }: { ticker: string; color: string }) => {
  const tw = useTailwind();
  const source =
    ticker === 'BTC' ? BITCOIN_LOGO : ticker === 'ETH' ? ETH_LOGO : undefined;
  return source ? (
    <Image
      source={source}
      accessibilityIgnoresInvertColors
      style={[tw.style('rounded-lg'), styles.mark]}
    />
  ) : (
    <View
      style={[
        tw.style('items-center justify-center rounded-lg'),
        styles.mark,
        { backgroundColor: color },
      ]}
    >
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
        {ticker[0]}
      </Text>
    </View>
  );
};

/** Lean up or down arrow in a tinted circle, the outcome thumb for crypto rounds. */
const DirectionThumb = ({ direction }: { direction: 'up' | 'down' }) => {
  const { colors } = useFeedStyles();
  const isUp = direction === 'up';
  return (
    <View
      style={[
        styles.thumb,
        { backgroundColor: isUp ? colors.success.muted : colors.error.muted },
      ]}
    >
      <View style={isUp ? undefined : styles.flipped}>
        <PhosphorIcon
          icon={ArrowUpIcon}
          label={isUp ? 'arrow-up' : 'arrow-down'}
          size={20}
          color={isUp ? colors.success.default : colors.error.default}
        />
      </View>
    </View>
  );
};

export const FeedCryptoCard = ({
  event,
  round,
  variant,
  width,
  stats,
  onPress,
  onOrder,
  onComments,
}: FeedCardBase & { event: ProtoCryptoEvent; round: CryptoRoundState }) => {
  const engagement = useLiveEngagement(stats);
  const held = useHeldContracts(event.id);
  const isTrending = variant === 'trending';
  const baseTitle = event.feedTitle ?? event.title;
  // Figma: `5 Min` on the trending card, `5 min` on the list card.
  const title = isTrending ? baseTitle : baseTitle.replace(' Min', ' min');
  const outcomes = cryptoOutcomes(round.upPrice, round.downPrice);
  const status: FeedStatus =
    round.phase === 'resolved'
      ? { label: round.winner === 'up' ? 'Up won' : 'Down won' }
      : {
          label: round.feedCountdown,
          tone: round.secondsLeft <= CLOSING_SECONDS ? 'error' : 'success',
        };
  const order = (index: number) =>
    onOrder(
      buildIntent(
        event.id,
        event.title,
        `${event.title} · ${event.window}`,
        outcomes,
        index,
      ),
    );
  return (
    <FeedCardSurface
      testID={`feed-crypto-card-${event.id}`}
      width={width}
      height={isTrending ? FEED_TRENDING_HEIGHT : undefined}
      onPress={onPress}
    >
      <Box twClassName={`gap-3 ${isTrending ? 'flex-1 justify-between' : ''}`}>
        <Box twClassName="flex-row items-center gap-3">
          <CryptoMark ticker={event.ticker} color={event.color} />
          <Box twClassName="min-w-0 flex-1 gap-1">
            <Text
              variant={isTrending ? TextVariant.BodyMd : TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              numberOfLines={1}
            >
              {title}
            </Text>
            <FeedStatusLine status={status} />
          </Box>
        </Box>
        {isTrending ? (
          <>
            <FeedLiveChart
              values={round.history.slice(-48)}
              target={round.target}
            />
            <Box twClassName="flex-row gap-2">
              {outcomes.map((outcome, index) => (
                <OddsPill
                  key={outcome.id}
                  tone={index === 0 ? 'success' : 'error'}
                  badge={held(outcome.id)}
                  prefix={`${outcome.label} · `}
                  price={outcome.price}
                  accessibilityLabel={`${outcome.label}, buy at ${outcome.price} percent`}
                  testID={`feed-pill-${event.id}-${index}`}
                  onPress={() => order(index)}
                />
              ))}
            </Box>
          </>
        ) : (
          <Box twClassName="gap-2">
            {outcomes.map((outcome, index) => (
              <FeedOutcomeRow
                key={outcome.id}
                thumb={
                  <DirectionThumb direction={index === 0 ? 'up' : 'down'} />
                }
                name={outcome.label}
                nameVariant={TextVariant.BodyMd}
                share={outcome.price}
                barColor={outcome.color}
                pill={
                  <OddsPill
                    isFixedWidth
                    tone={index === 0 ? 'success' : 'error'}
                    badge={held(outcome.id)}
                    price={outcome.price}
                    accessibilityLabel={`${outcome.label}, buy at ${outcome.price} percent`}
                    testID={`feed-pill-${event.id}-${index}`}
                    onPress={() => order(index)}
                  />
                }
              />
            ))}
          </Box>
        )}
        <FeedFooter
          volume={engagement.volume}
          comments={engagement.comments}
          onCommentsPress={() =>
            onComments({ eventId: event.id, title, count: engagement.comments })
          }
        />
      </Box>
    </FeedCardSurface>
  );
};

/** One outcome of a standard market. Owns its own ticking price. */
const StandardOutcomeRow = ({
  event,
  outcome,
  index,
  isBinaryMarket,
  onOrder,
}: {
  event: ProtoStandardEvent;
  outcome: ProtoOutcome;
  index: number;
  isBinaryMarket: boolean;
  onOrder: (intent: ProtoOrderIntent) => void;
}) => {
  const price = useTickingPrice(outcome.price);
  const held = useHeldContracts(event.id);
  const outcomes = event.outcomes.map((item) =>
    item.id === outcome.id ? { ...item, price } : item,
  );
  return (
    <FeedOutcomeRow
      thumb={
        isBinaryMarket ? null : (
          <ProtoAvatarCircle avatar={outcome.avatar} size={28} />
        )
      }
      name={outcome.label}
      nameVariant={TextVariant.BodyMd}
      share={price}
      barColor={outcome.color}
      pill={
        <OddsPill
          isFixedWidth
          tone={isBinaryMarket && index === 1 ? 'error' : 'success'}
          badge={held(outcome.id)}
          price={price}
          accessibilityLabel={`${outcome.label}, buy at ${price} percent`}
          testID={`feed-pill-${event.id}-${index}`}
          onPress={() =>
            onOrder(
              buildIntent(event.id, event.title, event.title, outcomes, index),
            )
          }
        />
      }
    />
  );
};

/**
 * Politics, tech, culture and the like: the market title, then each outcome
 * with its own odds line underneath. The line is what moves here. The big
 * chart is kept for the hero cards.
 */
export const FeedStandardCard = ({
  event,
  onPress,
  onOrder,
}: {
  event: ProtoStandardEvent;
  onPress: () => void;
  onOrder: (intent: ProtoOrderIntent) => void;
}) => {
  const { openComments } = usePrototypeState();
  const startsIn = useStartsIn(event.startsInMinutes);
  const stats = useMemo(
    () => ({ volume: event.volume, comments: commentSeed(event.id) }),
    [event.id, event.volume],
  );
  const engagement = useLiveEngagement(stats);
  const isBinaryMarket = isBinary(event.outcomes);
  const image = isBinaryMarket ? event.outcomes[0].avatar : undefined;
  return (
    <FeedCardSurface
      testID={`feed-standard-card-${event.id}`}
      onPress={onPress}
    >
      <Box twClassName="gap-3">
        <Box twClassName="flex-row items-center gap-3">
          {image ? <ProtoAvatarCircle avatar={image} size={32} /> : null}
          <Box twClassName="min-w-0 flex-1 gap-1">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              numberOfLines={2}
            >
              {event.title}
            </Text>
            <FeedStatusLine status={{ label: startsIn ?? event.meta }} />
          </Box>
        </Box>
        <Box twClassName="gap-2">
          {event.outcomes.map((outcome, index) => (
            <StandardOutcomeRow
              key={outcome.id}
              event={event}
              outcome={outcome}
              index={index}
              isBinaryMarket={isBinaryMarket}
              onOrder={onOrder}
            />
          ))}
        </Box>
        <FeedFooter
          volume={engagement.volume}
          comments={engagement.comments}
          onCommentsPress={() =>
            openComments({
              eventId: event.id,
              title: event.title,
              count: engagement.comments,
            })
          }
        />
      </Box>
    </FeedCardSurface>
  );
};
