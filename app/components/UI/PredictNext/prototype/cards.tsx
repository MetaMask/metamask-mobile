import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  teamAvatar,
  type ProtoAvatar,
  type ProtoCryptoEvent,
  type ProtoGameEvent,
  type ProtoOutcome,
  type ProtoStandardEvent,
  type ProtoTeam,
} from './fixtures';
import {
  EventStatus,
  SecondaryButton,
  leadingIndex,
  PricePill,
  ProtoAvatarCircle,
  FeedPanel,
  type ProtoEventStatus,
} from './components';
import {
  useHeldContracts,
  type ProtoOrderIntent,
  type ProtoOrderOption,
} from './PrototypeState';
import {
  formatCryptoPrice,
  useCryptoRound,
  useLiveGame,
  useLiveOdds,
} from './simulation';
import { BITCOIN_LOGO } from './assets';
import { useRevealOnScroll } from './feedScroll';
import { oddsChartPaths } from './oddsLine';
import { PALETTE } from './palette';

const SUCCESS = PALETTE.green;
const ERROR = PALETTE.red;
/**
 * One height for every trending hero. Tall enough for the game score row and
 * a crypto chart, short enough that the carousel does not grow past the game card.
 */
const HERO_CARD_HEIGHT = 232;

export const toOption = (outcome: ProtoOutcome): ProtoOrderOption => ({
  outcomeId: outcome.id,
  label: outcome.label,
  price: outcome.price,
  color: outcome.color,
  avatar: outcome.avatar,
});

/** Binary markets get a swap control in the order sheet. */
export const buildIntent = (
  eventId: string,
  eventTitle: string,
  marketTitle: string,
  outcomes: ProtoOutcome[],
  selectedIndex: number,
): ProtoOrderIntent => ({
  eventId,
  eventTitle,
  marketTitle,
  selected: toOption(outcomes[selectedIndex]),
  alternate:
    outcomes.length === 2 ? toOption(outcomes[1 - selectedIndex]) : undefined,
});

export const cryptoOutcomes = (
  upPrice: number,
  downPrice: number,
): ProtoOutcome[] => [
  {
    id: 'up',
    label: 'Up',
    price: upPrice,
    color: SUCCESS,
    avatar: { text: '▲', color: PALETTE.upMuted, textColor: SUCCESS },
  },
  {
    id: 'down',
    label: 'Down',
    price: downPrice,
    color: ERROR,
    avatar: { text: '▼', color: PALETTE.downMuted, textColor: ERROR },
  },
];

export const ProtoCard = ({
  onPress,
  children,
  twClassName = '',
  width,
  height,
  testID,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  twClassName?: string;
  width?: number;
  height?: number;
  testID?: string;
}) => {
  const tw = useTailwind();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        width ? { width } : { alignSelf: 'stretch' },
        height ? { height } : null,
        pressed && onPress
          ? { transform: [{ scale: 0.985 }], opacity: 0.92 }
          : null,
      ]}
    >
      <FeedPanel
        twClassName={`${height ? 'h-full ' : ''}${twClassName}`}
        style={tw.style(height ? 'h-full w-full' : 'w-full')}
      >
        {children}
      </FeedPanel>
    </Pressable>
  );
};

const ONE_MINUTE_MS = 60 * 1000;

const formatStartsIn = (minutes: number) => {
  if (minutes <= 0) return 'Starting now';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours > 0 ? `Starts in ${hours}h ${rest}m` : `Starts in ${rest}m`;
};

/** Counts down to a start time set when the card first mounts. */
export const useStartsIn = (startsInMinutes?: number) => {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    if (startsInMinutes === undefined) return undefined;
    const id = setInterval(() => setNow(Date.now()), ONE_MINUTE_MS / 2);
    return () => clearInterval(id);
  }, [startsInMinutes]);
  if (startsInMinutes === undefined) return undefined;
  const elapsed = Math.floor((now - startedAt) / ONE_MINUTE_MS);
  return formatStartsIn(startsInMinutes - elapsed);
};

export const gameStatus = (
  event: ProtoGameEvent,
  live: { isFinal: boolean; clockLabel: string; isClosing?: boolean },
  suffix?: string,
): ProtoEventStatus => {
  const withSuffix = (label: string) =>
    suffix ? `${label} · ${suffix}` : label;
  if (!event.isLive) {
    return { kind: 'upcoming', label: withSuffix(event.startTime) };
  }
  if (live.isFinal) {
    return { kind: 'final', label: suffix };
  }
  return {
    kind: 'live',
    label: withSuffix(live.clockLabel),
    isClosing: live.isClosing,
  };
};

export const cryptoStatus = (round: {
  phase: string;
  countdown: string;
  winner: 'up' | 'down' | null;
}): ProtoEventStatus =>
  round.phase === 'resolved'
    ? { kind: 'final', label: round.winner === 'up' ? 'Up won' : 'Down won' }
    : {
        kind: 'live',
        label: `${round.countdown} left`,
        isClosing: round.phase === 'closing',
      };

/** Day of an upcoming game, without the kickoff time. */
export const gameDay = (event: ProtoGameEvent) =>
  event.startTime.split(' · ')[0];

const THUMB_SIZE = 32;

const styles = StyleSheet.create({
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8 },
});

const EventThumb = ({ avatar }: { avatar: ProtoAvatar }) =>
  avatar.image ? (
    <Image
      source={avatar.image}
      accessibilityIgnoresInvertColors
      resizeMode={avatar.imageFit === 'contain' ? 'contain' : 'cover'}
      style={styles.thumb}
    />
  ) : (
    <ProtoAvatarCircle avatar={avatar} size={THUMB_SIZE} />
  );

/**
 * Kalshi and Polymarket card top: event image, title, and an optional
 * headline number on the right (chance, live price).
 */
export const CardHeader = ({
  title,
  image,
  aside,
  titleLines = 2,
}: {
  title: string;
  image?: ProtoAvatar;
  aside?: React.ReactNode;
  titleLines?: number;
}) => (
  <Box twClassName="flex-row items-center gap-3 px-4">
    {image ? <EventThumb avatar={image} /> : null}
    <Box twClassName="min-w-0 flex-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        numberOfLines={titleLines}
      >
        {title}
      </Text>
    </Box>
    {aside ? <Box twClassName="shrink-0 items-end">{aside}</Box> : null}
  </Box>
);

export const ChanceLabel = ({ price }: { price: number }) => (
  <>
    <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
      {`${price}%`}
    </Text>
    <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
      chance
    </Text>
  </>
);

/** Status or close date on the left, volume on the right. */
export const CardFooter = ({
  status,
  meta,
  volume,
}: {
  status?: ProtoEventStatus;
  meta?: string;
  volume?: string;
}) => (
  <Box twClassName="flex-row items-center justify-between gap-3 px-4">
    <Box twClassName="min-w-0 flex-1">
      {status ? (
        <EventStatus status={status} align="start" />
      ) : meta ? (
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {meta}
        </Text>
      ) : null}
    </Box>
    {volume ? (
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {`${volume} Vol.`}
      </Text>
    ) : null}
  </Box>
);

const BINARY_LABELS = [
  ['Yes', 'No'],
  ['Up', 'Down'],
];

export interface OddsSeries {
  id: string;
  color: string;
  trail: number[];
}

/**
 * Two outcome lines. They draw from a flat line to the live trail the first
 * time the card scrolls into view.
 */
export const OddsLines = ({
  series,
  isFlexible = false,
}: {
  series: OddsSeries[];
  isFlexible?: boolean;
}) => {
  const { ref, progress, check } = useRevealOnScroll();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const paths =
    size.width > 0
      ? oddsChartPaths(
          series.map((item) => item.trail),
          size.width,
          size.height,
          progress,
        )
      : [];
  return (
    <Box
      ref={ref}
      twClassName={isFlexible ? 'mx-4 min-h-10 flex-1' : 'mx-4 h-12'}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setSize((current) =>
          current.width === width && current.height === height
            ? current
            : { width, height },
        );
        check();
      }}
    >
      {size.width > 0 ? (
        <Svg width={size.width} height={size.height}>
          {series.map((item, index) => (
            <Path
              key={item.id}
              d={paths[index]}
              stroke={item.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
      ) : null}
    </Box>
  );
};

/** Yes/No and Up/Down markets get two wide buttons instead of rows. */
export const isBinary = (outcomes: ProtoOutcome[]) =>
  outcomes.length === 2 &&
  BINARY_LABELS.some(
    ([first, second]) =>
      outcomes[0].label === first && outcomes[1].label === second,
  );

/** A binary event's outcomes share the event image, so it moves to the header. */
const standardImage = (event: ProtoStandardEvent) =>
  isBinary(event.outcomes) ? event.outcomes[0].avatar : undefined;

const TeamBlock = ({
  team,
  side,
}: {
  team: ProtoTeam;
  side: 'away' | 'home';
}) => (
  <Box twClassName="items-center gap-1">
    <ProtoAvatarCircle avatar={teamAvatar(team, side)} size={48} />
    <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Bold}>
      {team.abbr}
    </Text>
  </Box>
);

const HeroPriceButton = ({
  label,
  price,
  isLeading = false,
  badge = 0,
  onPress,
}: {
  label: string;
  price: number;
  isLeading?: boolean;
  badge?: number;
  onPress: () => void;
}) => {
  const tone = isLeading ? TextColor.SuccessDefault : TextColor.TextDefault;
  return (
    <SecondaryButton onPress={onPress} isLeading={isLeading} badge={badge}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        numberOfLines={1}
        color={tone}
      >
        {label}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={tone}
      >
        {`${price}%`}
      </Text>
    </SecondaryButton>
  );
};

export interface MarketCardRow {
  outcome: ProtoOutcome;
  score?: number;
}

/** Two wide buttons for a binary market, otherwise one row per outcome. */
const MarketBody = ({
  rows,
  eventId = '',
  onSelect,
}: {
  rows: MarketCardRow[];
  /** Used to badge the outcomes the user holds. */
  eventId?: string;
  onSelect: (index: number) => void;
}) => {
  const held = useHeldContracts(eventId);
  const outcomes = rows.map(({ outcome }) => outcome);
  const favorite = leadingIndex(outcomes);
  if (isBinary(outcomes)) {
    return (
      <Box twClassName="flex-row gap-2 px-4">
        {outcomes.map((outcome, index) => (
          <HeroPriceButton
            key={outcome.id}
            label={outcome.label}
            price={outcome.price}
            isLeading={index === favorite}
            badge={held(outcome.id)}
            onPress={() => onSelect(index)}
          />
        ))}
      </Box>
    );
  }
  return (
    <Box twClassName="gap-2 px-4">
      {rows.map(({ outcome, score }, index) => (
        <Box key={outcome.id} twClassName="flex-row items-center gap-3">
          {outcome.avatar ? (
            <ProtoAvatarCircle avatar={outcome.avatar} size={32} />
          ) : null}
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            numberOfLines={1}
            twClassName="min-w-0 flex-1"
          >
            {outcome.label}
          </Text>
          {score !== undefined ? (
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              twClassName="w-8 text-right"
            >
              {String(score)}
            </Text>
          ) : null}
          <PricePill
            price={outcome.price}
            isLeading={index === favorite}
            badge={held(outcome.id)}
            onPress={() => onSelect(index)}
          />
        </Box>
      ))}
    </Box>
  );
};

export const GameHeroCard = ({
  event,
  width,
  onPress,
  onOrder,
}: {
  event: ProtoGameEvent;
  width: number;
  onPress: () => void;
  onOrder: (intent: ProtoOrderIntent) => void;
}) => {
  const live = useLiveGame(event);
  const moneyline = event.sections[0].markets[0];
  const outcomes = moneyline.outcomes.map((outcome, index) => ({
    ...outcome,
    price: index === 0 ? live.awayProbability : live.homeProbability,
  }));
  const favorite = leadingIndex(outcomes);
  return (
    <ProtoCard
      onPress={onPress}
      width={width}
      height={HERO_CARD_HEIGHT}
      twClassName="justify-between py-4"
    >
      <CardHeader title={event.title} titleLines={1} />
      <Box twClassName="flex-row items-center justify-between px-4">
        <TeamBlock team={event.away} side="away" />
        <Box twClassName="flex-row items-center gap-4">
          <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Bold}>
            {live.awayScore}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            –
          </Text>
          <Text variant={TextVariant.DisplayMd} fontWeight={FontWeight.Bold}>
            {live.homeScore}
          </Text>
        </Box>
        <TeamBlock team={event.home} side="home" />
      </Box>
      <Box twClassName="flex-row gap-1 px-4">
        <Box
          twClassName="h-1 rounded-full"
          style={{
            flex: Math.max(1, live.awayProbability),
            backgroundColor: event.away.color,
          }}
        />
        <Box
          twClassName="h-1 rounded-full"
          style={{
            flex: Math.max(1, live.homeProbability),
            backgroundColor: event.home.color,
          }}
        />
      </Box>
      <Box twClassName="flex-row gap-2 px-4">
        <HeroPriceButton
          label={event.away.name}
          price={outcomes[0].price}
          isLeading={favorite === 0}
          onPress={() =>
            onOrder(
              buildIntent(event.id, event.title, moneyline.title, outcomes, 0),
            )
          }
        />
        <HeroPriceButton
          label={event.home.name}
          price={outcomes[1].price}
          isLeading={favorite === 1}
          onPress={() =>
            onOrder(
              buildIntent(event.id, event.title, moneyline.title, outcomes, 1),
            )
          }
        />
      </Box>
      <CardFooter
        status={gameStatus(event, live)}
        volume={event.sections[0].volume}
      />
    </ProtoCard>
  );
};

const standardStatus = (startsIn?: string): ProtoEventStatus | undefined =>
  startsIn ? { kind: 'upcoming', label: startsIn } : undefined;

export const StandardHeroCard = ({
  event,
  width,
  onPress,
  onOrder,
}: {
  event: ProtoStandardEvent;
  width: number;
  onPress: () => void;
  onOrder: (intent: ProtoOrderIntent) => void;
}) => {
  const live = useLiveOdds(event);
  const startsIn = useStartsIn(event.startsInMinutes);
  const livePrice = new Map(
    live.map((item) => [item.outcome.id, item.price] as const),
  );
  // The hero shows the two leading outcomes, matching the live odds feed.
  const outcomes = event.outcomes.slice(0, 2).map((outcome) => ({
    ...outcome,
    price: livePrice.get(outcome.id) ?? outcome.price,
  }));
  return (
    <ProtoCard
      onPress={onPress}
      width={width}
      height={HERO_CARD_HEIGHT}
      twClassName="justify-between py-4"
    >
      <CardHeader
        title={event.title}
        image={standardImage(event)}
        aside={
          isBinary(outcomes) ? (
            <ChanceLabel price={outcomes[0].price} />
          ) : undefined
        }
      />
      <OddsLines
        isFlexible
        series={live.map(({ outcome, trail }) => ({
          id: outcome.id,
          color: outcome.color,
          trail,
        }))}
      />
      <MarketBody
        eventId={event.id}
        rows={outcomes.map((outcome) => ({ outcome }))}
        onSelect={(index) =>
          onOrder(
            buildIntent(event.id, event.title, event.title, outcomes, index),
          )
        }
      />
      <CardFooter
        status={standardStatus(startsIn)}
        meta={event.meta}
        volume={event.volume}
      />
    </ProtoCard>
  );
};

const assetMark = (ticker: string) => (ticker === 'BTC' ? '₿' : ticker[0]);

const deltaLabel = (delta: number) =>
  `${delta >= 0 ? '▲' : '▼'} $${Math.abs(delta).toFixed(2)}`;

interface ChartPoint {
  x: number;
  y: number;
}
interface ChartRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const segmentHits = (
  start: ChartPoint,
  end: ChartPoint,
  edgeStart: ChartPoint,
  edgeEnd: ChartPoint,
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const ex = edgeEnd.x - edgeStart.x;
  const ey = edgeEnd.y - edgeStart.y;
  const denom = dx * ey - dy * ex;
  if (denom === 0) return null;
  const t =
    ((edgeStart.x - start.x) * ey - (edgeStart.y - start.y) * ex) / denom;
  const u =
    ((edgeStart.x - start.x) * dy - (edgeStart.y - start.y) * dx) / denom;
  if (t <= 0 || t >= 1 || u < 0 || u > 1) return null;
  return t;
};

/** Pieces of a polyline that fall outside a rectangle, so a stroke can stop at a pill. */
export const pathsOutsideRect = (points: ChartPoint[], rect: ChartRect) => {
  const edges = [
    [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
    ],
    [
      { x: rect.right, y: rect.top },
      { x: rect.right, y: rect.bottom },
    ],
    [
      { x: rect.right, y: rect.bottom },
      { x: rect.left, y: rect.bottom },
    ],
    [
      { x: rect.left, y: rect.bottom },
      { x: rect.left, y: rect.top },
    ],
  ];
  const covers = (point: ChartPoint) =>
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom;
  const pieces: ChartPoint[][] = [];
  let current: ChartPoint[] = [];
  const commit = () => {
    if (current.length > 1) pieces.push(current);
    current = [];
  };
  const add = (point: ChartPoint) => {
    const last = current[current.length - 1];
    if (last && last.x === point.x && last.y === point.y) return;
    current.push(point);
  };

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const hits = edges
      .map(([edgeStart, edgeEnd]) =>
        segmentHits(start, end, edgeStart, edgeEnd),
      )
      .filter((hit): hit is number => hit !== null)
      .sort((left, right) => left - right)
      .filter(
        (hit, hitIndex, all) =>
          hitIndex === 0 || hit - all[hitIndex - 1] > 0.0001,
      );
    const marks = [0, ...hits, 1];
    for (let mark = 0; mark < marks.length - 1; mark += 1) {
      const from = marks[mark];
      const to = marks[mark + 1];
      const fromPoint = {
        x: start.x + (end.x - start.x) * from,
        y: start.y + (end.y - start.y) * from,
      };
      const toPoint = {
        x: start.x + (end.x - start.x) * to,
        y: start.y + (end.y - start.y) * to,
      };
      const mid = {
        x: (fromPoint.x + toPoint.x) / 2,
        y: (fromPoint.y + toPoint.y) / 2,
      };
      if (covers(mid)) {
        commit();
      } else {
        add(fromPoint);
        add(toPoint);
      }
    }
  }
  commit();
  return pieces.map((piece) =>
    piece
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(' '),
  );
};

export const CryptoPriceChart = ({
  values,
  target,
  height,
}: {
  values: number[];
  target: number;
  /** Fixed height. Omit it and the chart fills its parent. */
  height?: number;
}) => {
  const [measured, setMeasured] = useState({ width: 0, height: 0 });
  const width = measured.width;
  const chartHeight = height ?? measured.height;
  const isUp = (values[values.length - 1] ?? target) >= target;
  const color = isUp ? SUCCESS : ERROR;
  const plotWidth = Math.max(24, width - 6);
  const min = Math.min(target, ...values);
  const max = Math.max(target, ...values);
  const range = max - min || 1;
  const plotHeight = Math.max(8, chartHeight - 16);
  const toY = (value: number) =>
    chartHeight - 8 - ((value - min) / range) * plotHeight;
  const step = plotWidth / Math.max(1, values.length - 1);
  const targetY = toY(target);
  const lastY = toY(values[values.length - 1] ?? target);
  const path = values
    .map((value, index) => {
      const x = index * step;
      const y = toY(value);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <Box
      twClassName={height ? 'w-full' : 'min-h-12 w-full flex-1'}
      style={height ? { height } : undefined}
      onLayout={(event) => {
        const next = {
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        };
        setMeasured((current) =>
          current.width === next.width && current.height === next.height
            ? current
            : next,
        );
      }}
    >
      {width > 0 && chartHeight > 0 ? (
        <Svg width={width} height={chartHeight}>
          <Line
            x1={0}
            x2={plotWidth}
            y1={targetY}
            y2={targetY}
            stroke={PALETTE.neutral}
            strokeDasharray="4,4"
            strokeWidth={1}
          />
          <Path d={path} stroke={color} strokeWidth={2} fill="none" />
          <Circle cx={plotWidth} cy={lastY} r={4} fill={color} />
        </Svg>
      ) : null}
    </Box>
  );
};

const CryptoSideButton = ({
  label,
  percent,
  isLeading = false,
  badge = 0,
  onPress,
}: {
  label: string;
  percent: number;
  isLeading?: boolean;
  badge?: number;
  onPress: () => void;
}) => {
  const tone = isLeading ? TextColor.SuccessDefault : TextColor.TextDefault;
  return (
    <SecondaryButton onPress={onPress} isLeading={isLeading} badge={badge}>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={tone}
      >
        {label}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Bold}
        color={tone}
      >
        {`${percent}%`}
      </Text>
    </SecondaryButton>
  );
};

export const CryptoTradeButtons = ({
  upPrice,
  downPrice,
  upBadge = 0,
  downBadge = 0,
  onUp,
  onDown,
}: {
  upPrice: number;
  downPrice: number;
  upBadge?: number;
  downBadge?: number;
  onUp: () => void;
  onDown: () => void;
}) => {
  const favorite = leadingIndex([{ price: upPrice }, { price: downPrice }]);
  return (
    <Box twClassName="flex-row gap-2">
      <CryptoSideButton
        label="Up"
        percent={upPrice}
        isLeading={favorite === 0}
        badge={upBadge}
        onPress={onUp}
      />
      <CryptoSideButton
        label="Down"
        percent={downPrice}
        isLeading={favorite === 1}
        badge={downBadge}
        onPress={onDown}
      />
    </Box>
  );
};

const assetAvatar = (event: ProtoCryptoEvent): ProtoAvatar =>
  event.ticker === 'BTC'
    ? { image: BITCOIN_LOGO, text: '₿', color: event.color }
    : { text: assetMark(event.ticker), color: event.color };

/** Live price over its move from the price to beat, for a card header. */
const CryptoPriceAside = ({
  price,
  delta,
}: {
  price: number;
  delta: number;
}) => (
  <>
    <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
      {formatCryptoPrice(price)}
    </Text>
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Bold}
      style={{ color: delta >= 0 ? SUCCESS : ERROR }}
    >
      {deltaLabel(delta)}
    </Text>
  </>
);

/** Live price, and how far it sits from the price to beat. */
export const CryptoQuote = ({
  event,
  price,
  delta,
}: {
  event: ProtoCryptoEvent;
  price: number;
  delta: number;
}) => (
  <Box twClassName="flex-row items-center gap-2">
    <ProtoAvatarCircle avatar={assetAvatar(event)} size={32} />
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Bold}
      numberOfLines={1}
      twClassName="min-w-0 flex-1"
    >
      {`Price ${formatCryptoPrice(price)}`}
    </Text>
    <Box twClassName="rounded-full bg-muted px-2 py-1">
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Regular}
        style={{ color: delta >= 0 ? SUCCESS : ERROR }}
      >
        {deltaLabel(delta)}
      </Text>
    </Box>
  </Box>
);

export const CryptoHeroCard = ({
  event,
  width,
  onPress,
  onOrder,
}: {
  event: ProtoCryptoEvent;
  width: number;
  onPress: () => void;
  onOrder: (intent: ProtoOrderIntent) => void;
}) => {
  const round = useCryptoRound(event);
  const outcomes = cryptoOutcomes(round.upPrice, round.downPrice);
  const openSide = (index: number) =>
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
    <ProtoCard
      testID="crypto-hero-card"
      onPress={onPress}
      width={width}
      height={HERO_CARD_HEIGHT}
      twClassName="gap-3 py-4"
    >
      <CardHeader
        title={event.title}
        titleLines={1}
        image={assetAvatar(event)}
        aside={<CryptoPriceAside price={round.price} delta={round.delta} />}
      />
      <Box twClassName="flex-1 px-4">
        <CryptoPriceChart
          values={round.history.slice(-40)}
          target={round.target}
        />
      </Box>
      <Box twClassName="px-4">
        <CryptoTradeButtons
          upPrice={round.upPrice}
          downPrice={round.downPrice}
          onUp={() => openSide(0)}
          onDown={() => openSide(1)}
        />
      </Box>
      <CardFooter status={cryptoStatus(round)} />
    </ProtoCard>
  );
};

/**
 * The one market card for the feed and every category page, laid out like
 * Kalshi and Polymarket: image and title, the market, then status and volume.
 */
export const MarketCard = ({
  title,
  image,
  chart,
  status,
  meta,
  rows,
  volume,
  eventId,
  onPress,
  onSelect,
}: {
  eventId?: string;
  title: string;
  image?: ProtoAvatar;
  chart?: React.ReactNode;
  status?: ProtoEventStatus;
  /** Close date or similar, shown when there is no live status. */
  meta?: string;
  rows: MarketCardRow[];
  volume?: string;
  onPress: () => void;
  onSelect: (index: number) => void;
}) => {
  const outcomes = rows.map(({ outcome }) => outcome);
  const yes = outcomes[0];
  return (
    <ProtoCard onPress={onPress} twClassName="gap-4 py-4">
      <CardHeader
        title={title}
        image={image}
        aside={
          isBinary(outcomes) && yes.label === 'Yes' ? (
            <ChanceLabel price={yes.price} />
          ) : undefined
        }
      />
      {chart}
      <MarketBody rows={rows} eventId={eventId} onSelect={onSelect} />
      <CardFooter status={status} meta={meta} volume={volume} />
    </ProtoCard>
  );
};

export const StandardEventCard = ({
  event,
  onPress,
  onOrder,
}: {
  event: ProtoStandardEvent;
  onPress: () => void;
  onOrder: (intent: ProtoOrderIntent) => void;
}) => {
  const startsIn = useStartsIn(event.startsInMinutes);
  const live = useLiveOdds(event);
  const livePrice = new Map(
    live.map((item) => [item.outcome.id, item.price] as const),
  );
  const outcomes = event.outcomes.map((outcome) => ({
    ...outcome,
    price: livePrice.get(outcome.id) ?? outcome.price,
  }));
  return (
    <MarketCard
      eventId={event.id}
      title={event.title}
      image={standardImage(event)}
      chart={
        <OddsLines
          series={live.map(({ outcome, trail }) => ({
            id: outcome.id,
            color: outcome.color,
            trail,
          }))}
        />
      }
      status={standardStatus(startsIn)}
      meta={event.meta}
      rows={outcomes.map((outcome) => ({ outcome }))}
      volume={event.volume}
      onPress={onPress}
      onSelect={(index) =>
        onOrder(
          buildIntent(event.id, event.title, event.title, outcomes, index),
        )
      }
    />
  );
};

/** Sports in the same card as every other category, with live score and status. */
export const GameMarketCard = ({
  event,
  onPress,
  onOrder,
}: {
  event: ProtoGameEvent;
  onPress: () => void;
  onOrder: (intent: ProtoOrderIntent) => void;
}) => {
  const live = useLiveGame(event);
  const section = event.sections[0];
  const moneyline = section.markets[0];
  const outcomes = moneyline.outcomes.map((outcome, index) => ({
    ...outcome,
    price: event.isLive
      ? index === 0
        ? live.awayProbability
        : live.homeProbability
      : outcome.price,
  }));
  return (
    <MarketCard
      eventId={event.id}
      status={
        event.isLive
          ? gameStatus(event, live)
          : { kind: 'upcoming', label: gameDay(event) }
      }
      title={event.title}
      rows={outcomes.map((outcome, index) => ({
        outcome,
        score: event.isLive
          ? index === 0
            ? live.awayScore
            : live.homeScore
          : undefined,
      }))}
      volume={section.volume}
      onPress={onPress}
      onSelect={(index) =>
        onOrder(
          buildIntent(event.id, event.title, moneyline.title, outcomes, index),
        )
      }
    />
  );
};

/** A crypto round as a list card, for the Crypto category page. */
export const CryptoMarketCard = ({
  event,
  onPress,
  onOrder,
}: {
  event: ProtoCryptoEvent;
  onPress: () => void;
  onOrder: (intent: ProtoOrderIntent) => void;
}) => {
  const round = useCryptoRound(event);
  const outcomes = cryptoOutcomes(round.upPrice, round.downPrice);
  const marketTitle = `${event.title} · ${event.window}`;
  return (
    <MarketCard
      eventId={event.id}
      title={marketTitle}
      image={assetAvatar(event)}
      status={cryptoStatus(round)}
      rows={outcomes.map((outcome) => ({ outcome }))}
      onPress={onPress}
      onSelect={(index) =>
        onOrder(
          buildIntent(event.id, event.title, marketTitle, outcomes, index),
        )
      }
    />
  );
};
