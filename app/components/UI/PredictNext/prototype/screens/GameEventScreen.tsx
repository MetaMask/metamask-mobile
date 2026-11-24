import React, { useState } from 'react';
import {
  LayoutAnimation,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  Box,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PredictMarketChart } from '../../views/PredictEvent/internal/PredictMarketChart';
import {
  getProtoEvent,
  teamAvatar,
  type ProtoGameEvent,
  type ProtoMarket,
  type ProtoOutcome,
  type ProtoSection,
} from '../fixtures';
import {
  EventStatus,
  GlassHeader,
  OutcomeRow,
  SecondaryButton,
  PositionCard,
  ProtoAvatarCircle,
  RangeChips,
  SectionHeader,
  FeedPanel,
  UnderlineTabs,
  leadingIndex,
} from '../components';
import { buildIntent, gameStatus } from '../cards';
import {
  useProtoNavigation,
  type ProtoRoutes,
  type ProtoStackParamList,
} from '../navigation';
import {
  useHeldContracts,
  usePrototypeState,
  type ProtoPosition,
} from '../PrototypeState';
import { GAME_RANGES, useLiveGame, type GameRange } from '../simulation';

type GameTab = 'positions' | 'lines' | 'props';

const styles = StyleSheet.create({
  dotted: { textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
});

const clampPrice = (value: number) =>
  Math.min(97, Math.max(3, Math.round(value)));

/** Re-prices a line market for the selected line, around the fixture's base. */
const priceForLine = (
  section: ProtoSection,
  market: ProtoMarket,
  lineIndex: number,
): ProtoOutcome[] => {
  const lines = section.lines ?? [];
  const baseIndex = Math.floor(lines.length / 2);
  const line = lines[lineIndex];
  const shift = (lineIndex - baseIndex) * (section.id === 'spread' ? 6 : 5);
  const [first, second] = market.outcomes;
  const firstPrice = clampPrice(
    first.price + (section.id === 'spread' ? shift : -shift),
  );
  const isSpread = section.id === 'spread';
  return [
    {
      ...first,
      price: firstPrice,
      detail: isSpread ? `-${line}` : `O ${line}`,
    },
    {
      ...second,
      price: 100 - firstPrice,
      detail: isSpread ? `+${line}` : `U ${line}`,
    },
  ];
};

const LineSelector = ({
  lines,
  value,
  onChange,
}: {
  lines: number[];
  value: number;
  onChange: (index: number) => void;
}) => (
  <Box twClassName="flex-row justify-between px-2 pt-2">
    {lines.map((line, index) => {
      const isActive = index === value;
      return (
        <Pressable key={line} onPress={() => onChange(index)} hitSlop={6}>
          <Box twClassName="items-center gap-1">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={isActive ? FontWeight.Bold : FontWeight.Regular}
              color={
                isActive ? TextColor.TextDefault : TextColor.TextAlternative
              }
            >
              {String(line)}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={isActive ? TextColor.TextDefault : TextColor.TextMuted}
            >
              {isActive ? '▲' : ' '}
            </Text>
          </Box>
        </Pressable>
      );
    })}
  </Box>
);

const ViewAllButton = ({ count }: { count: number }) => (
  <Box twClassName="px-4 pt-3">
    <SecondaryButton
      label={`View all ${count} markets`}
      onPress={() => undefined}
      isFlexible={false}
    />
  </Box>
);

const MarketSection = ({
  section,
  liveMoneyline,
  held,
  onOrder,
  onRules,
}: {
  section: ProtoSection;
  liveMoneyline: [number, number];
  /** Contracts the user holds in an outcome, for the price button badge. */
  held: (outcomeId: string) => number;
  onOrder: (
    market: ProtoMarket,
    outcomes: ProtoOutcome[],
    index: number,
  ) => void;
  onRules: (market: ProtoMarket) => void;
}) => {
  const tw = useTailwind();
  const [isCollapsed, setIsCollapsed] = useState(
    Boolean(section.initiallyCollapsed),
  );
  const [lineIndex, setLineIndex] = useState(
    Math.floor((section.lines?.length ?? 0) / 2),
  );

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsCollapsed((current) => !current);
  };

  const outcomesFor = (market: ProtoMarket): ProtoOutcome[] => {
    if (section.id === 'moneyline') {
      return market.outcomes.map((outcome, index) => ({
        ...outcome,
        price: liveMoneyline[index],
      }));
    }
    if (section.kind === 'line')
      return priceForLine(section, market, lineIndex);
    return market.outcomes;
  };

  return (
    <Box twClassName="border-b border-muted pb-4">
      <SectionHeader
        title={section.title}
        volume={section.volume}
        isCollapsed={isCollapsed}
        onPress={toggle}
      />
      {isCollapsed ? null : (
        <>
          <Box twClassName="gap-3">
            {section.markets.map((market) => {
              const outcomes = outcomesFor(market);
              const favorite = leadingIndex(outcomes);
              return (
                <FeedPanel
                  key={market.id}
                  twClassName="gap-4 p-4"
                  style={tw.style('mx-4')}
                >
                  {section.kind === 'grouped' ? (
                    <Pressable onPress={() => onRules(market)} hitSlop={6}>
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Bold}
                        style={styles.dotted}
                      >
                        {market.title}
                      </Text>
                    </Pressable>
                  ) : null}
                  {outcomes.map((outcome, index) => (
                    <OutcomeRow
                      key={outcome.id}
                      outcome={outcome}
                      showAvatar={section.id === 'moneyline'}
                      isLeading={index === favorite}
                      badge={held(outcome.id)}
                      onPress={() => onOrder(market, outcomes, index)}
                    />
                  ))}
                  {section.kind === 'line' && section.lines ? (
                    <LineSelector
                      lines={section.lines}
                      value={lineIndex}
                      onChange={(index) => {
                        LayoutAnimation.configureNext(
                          LayoutAnimation.Presets.easeInEaseOut,
                        );
                        setLineIndex(index);
                      }}
                    />
                  ) : null}
                </FeedPanel>
              );
            })}
          </Box>
          {section.moreCount ? (
            <ViewAllButton count={section.moreCount} />
          ) : null}
        </>
      )}
    </Box>
  );
};

const Scoreboard = ({
  event,
  awayScore,
  homeScore,
  clockLabel,
  isFinal,
  isClosing,
}: {
  event: ProtoGameEvent;
  awayScore: number;
  homeScore: number;
  clockLabel: string;
  isFinal: boolean;
  isClosing: boolean;
}) => (
  <Box twClassName="flex-row items-start px-4 pt-4">
    <Box twClassName="w-24 items-center gap-2">
      <ProtoAvatarCircle avatar={teamAvatar(event.away, 'away')} size={48} />
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
      >
        {event.away.name}
      </Text>
    </Box>
    {/* Scores sit on the helmet row, status on the team-name row. */}
    <Box twClassName="flex-1 items-center gap-2">
      <Box twClassName="h-12 flex-row items-center gap-6">
        <Text variant={TextVariant.DisplayMd}>
          {event.isLive ? awayScore : '–'}
        </Text>
        <Text variant={TextVariant.DisplayMd}>
          {event.isLive ? homeScore : '–'}
        </Text>
      </Box>
      <EventStatus
        align="center"
        isStacked
        status={gameStatus(event, { isFinal, clockLabel, isClosing })}
      />
    </Box>
    <Box twClassName="w-24 items-center gap-2">
      <ProtoAvatarCircle avatar={teamAvatar(event.home, 'home')} size={48} />
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={1}
      >
        {event.home.name}
      </Text>
    </Box>
  </Box>
);

export const EventPositions = ({
  positions,
  onBuyMore,
}: {
  positions: ProtoPosition[];
  onBuyMore: (position: ProtoPosition) => void;
}) => {
  const { openCashOut } = usePrototypeState();
  return (
    <Box twClassName="gap-3 px-4">
      {positions.map((position) => (
        <PositionCard
          key={position.id}
          position={position}
          onBuyMore={() => onBuyMore(position)}
          onCashOut={() => openCashOut(position)}
        />
      ))}
    </Box>
  );
};

export const PositionsEmpty = () => (
  <Box twClassName="items-center gap-1 px-8 py-12">
    <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
      No positions yet
    </Text>
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      twClassName="text-center"
    >
      Pick an outcome to get started.
    </Text>
  </Box>
);

export const GameEventScreen = () => {
  const tw = useTailwind();
  const navigation = useProtoNavigation();
  const { eventId } =
    useRoute<RouteProp<ProtoStackParamList, typeof ProtoRoutes.GAME>>().params;
  const event = getProtoEvent(eventId) as ProtoGameEvent;
  const state = usePrototypeState();
  const held = useHeldContracts(event.id);
  const live = useLiveGame(event);
  const [range, setRange] = useState<GameRange>(event.isLive ? 'LIVE' : '1D');
  const [tab, setTab] = useState<GameTab>('lines');
  const eventPositions = state.positions.filter(
    (position) => position.eventId === event.id,
  );
  const liveMoneyline: [number, number] = [
    live.awayProbability,
    live.homeProbability,
  ];
  const moneyline = event.sections[0].markets[0];

  const handleOrder = (
    market: ProtoMarket,
    outcomes: ProtoOutcome[],
    index: number,
  ) =>
    state.openOrder(
      buildIntent(event.id, event.title, market.title, outcomes, index),
    );

  const handleRules = (market: ProtoMarket) =>
    state.openRules({
      title: `${market.title} · ${event.title}`,
      body: market.rules,
    });

  const handleBuyMore = (position: ProtoPosition) =>
    state.openOrder({
      eventId: event.id,
      eventTitle: event.title,
      marketTitle: position.marketTitle,
      selected: {
        outcomeId: position.outcomeId,
        label: position.label,
        price: position.currentPrice,
        color: position.color,
        avatar: position.avatar,
      },
    });

  const handleTab = (next: GameTab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(next);
  };

  const ranges = event.isLive
    ? GAME_RANGES
    : GAME_RANGES.filter((item) => item !== 'LIVE');

  return (
    <Box twClassName="flex-1 bg-default">
      <GlassHeader
        title={event.title}
        onBack={() => navigation.goBack()}
        actions={[
          {
            iconName: IconName.Export,
            onPress: () => undefined,
            accessibilityLabel: 'Share',
          },
          {
            iconName: IconName.Question,
            onPress: () =>
              state.openRules({
                title: `${moneyline.title} · Moneyline`,
                body: moneyline.rules,
              }),
            accessibilityLabel: 'Rules',
          },
        ]}
      />
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={tw.style('pb-16')}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="gap-4 pb-4">
          <Scoreboard
            event={event}
            awayScore={live.awayScore}
            homeScore={live.homeScore}
            clockLabel={live.clockLabel}
            isFinal={live.isFinal}
            isClosing={live.isClosing}
          />
          <Box twClassName="px-4">
            <PredictMarketChart series={live.buildSeries(range)} height={150} />
          </Box>
          <RangeChips ranges={ranges} value={range} onChange={setRange} />
        </Box>
        <Box twClassName="bg-default pt-2">
          <UnderlineTabs<GameTab>
            tabs={[
              {
                key: 'positions',
                label: eventPositions.length
                  ? `Positions · ${eventPositions.length}`
                  : 'Positions',
              },
              { key: 'lines', label: 'Game lines' },
              { key: 'props', label: 'Player props' },
            ]}
            value={tab}
            onChange={handleTab}
          />
          <Box twClassName="h-px bg-muted" />
        </Box>
        <Box twClassName="pt-2">
          {tab === 'positions' ? (
            eventPositions.length ? (
              <Box twClassName="pt-4">
                <EventPositions
                  positions={eventPositions}
                  onBuyMore={handleBuyMore}
                />
              </Box>
            ) : (
              <PositionsEmpty />
            )
          ) : (
            <>
              {eventPositions.length ? (
                <Box twClassName="gap-3 pb-2 pt-4">
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Bold}
                    twClassName="px-4"
                  >
                    Your positions
                  </Text>
                  <EventPositions
                    positions={eventPositions}
                    onBuyMore={handleBuyMore}
                  />
                </Box>
              ) : null}
              {event.sections
                .filter((section) => section.tab === tab)
                .map((section) => (
                  <MarketSection
                    key={section.id}
                    section={section}
                    liveMoneyline={liveMoneyline}
                    held={held}
                    onOrder={handleOrder}
                    onRules={handleRules}
                  />
                ))}
            </>
          )}
        </Box>
      </ScrollView>
    </Box>
  );
};
