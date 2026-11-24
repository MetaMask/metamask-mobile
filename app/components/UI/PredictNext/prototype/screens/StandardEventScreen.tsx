import React, { useMemo, useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet } from 'react-native';
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
import {
  PredictMarketChart,
  type PredictMarketChartSeries,
} from '../../views/PredictEvent/internal/PredictMarketChart';
import {
  getProtoEvent,
  type ProtoOutcome,
  type ProtoStandardEvent,
} from '../fixtures';
import { PALETTE } from '../palette';
import {
  EventStatus,
  GlassHeader,
  OutcomeRow,
  ProtoAvatarCircle,
  RangeChips,
  SectionHeader,
  FeedPanel,
  UnderlineTabs,
  leadingIndex,
} from '../components';
import { buildIntent, useStartsIn } from '../cards';
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
import { buildProbabilityWalk } from '../simulation';
import { EventPositions, PositionsEmpty } from './GameEventScreen';

type StandardTab = 'positions' | 'outcomes' | 'about';
type StandardRange = '1D' | '1W' | '1M' | 'ALL';
const RANGES: readonly StandardRange[] = ['1D', '1W', '1M', 'ALL'];
/** A multi-outcome market shows this many lines on the chart. */
const CHART_OUTCOME_LIMIT = 3;

const styles = StyleSheet.create({
  dotted: { textDecorationLine: 'underline', textDecorationStyle: 'dotted' },
});

/** Yes and No for one named outcome, so a crowded market can trade each side. */
const yesNoPair = (outcome: ProtoOutcome): ProtoOutcome[] => [
  {
    id: `${outcome.id}-yes`,
    label: 'Yes',
    price: outcome.price,
    color: PALETTE.green,
    avatar: outcome.avatar,
  },
  {
    id: `${outcome.id}-no`,
    label: 'No',
    price: 100 - outcome.price,
    color: PALETTE.red,
  },
];
const RANGE_DAYS: Record<StandardRange, number> = {
  '1D': 1,
  '1W': 7,
  '1M': 30,
  ALL: 180,
};

export const StandardEventScreen = () => {
  const tw = useTailwind();
  const navigation = useProtoNavigation();
  const { eventId } =
    useRoute<RouteProp<ProtoStackParamList, typeof ProtoRoutes.STANDARD>>()
      .params;
  const event = getProtoEvent(eventId) as ProtoStandardEvent;
  const state = usePrototypeState();
  const held = useHeldContracts(event.id);
  const [range, setRange] = useState<StandardRange>('1W');
  const [tab, setTab] = useState<StandardTab>('outcomes');
  const startsIn = useStartsIn(event.startsInMinutes);
  const isMultiOutcome = event.outcomes.length >= CHART_OUTCOME_LIMIT;
  const chartOutcomes = useMemo(() => {
    if (!isMultiOutcome) {
      return event.outcomes.length === 2
        ? event.outcomes.slice(0, 1)
        : event.outcomes;
    }
    return [...event.outcomes]
      .sort((left, right) => right.price - left.price)
      .slice(0, CHART_OUTCOME_LIMIT);
  }, [event.outcomes, isMultiOutcome]);
  const eventPositions = state.positions.filter(
    (position) => position.eventId === event.id,
  );
  const series = useMemo<PredictMarketChartSeries[]>(() => {
    const now = Date.now();
    const span = RANGE_DAYS[range] * 24 * 3600 * 1000;
    return chartOutcomes.map((outcome, index) => {
      const values = buildProbabilityWalk(
        index * 131 + range.length * 17 + event.id.length,
        48,
        outcome.price / 100,
        0.03,
      );
      return {
        id: outcome.id,
        label: isMultiOutcome ? `${outcome.price}%` : outcome.label,
        color: outcome.color,
        data: values.map((value, pointIndex) => ({
          time:
            now -
            ((values.length - 1 - pointIndex) * span) / (values.length - 1),
          value,
        })),
      };
    });
  }, [chartOutcomes, event.id.length, isMultiOutcome, range]);

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

  const handleTab = (next: StandardTab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTab(next);
  };

  return (
    <Box twClassName="flex-1 bg-default">
      <GlassHeader
        title={event.category}
        onBack={() => navigation.goBack()}
        actions={[
          {
            iconName: IconName.Export,
            onPress: () => undefined,
            accessibilityLabel: 'Share',
          },
        ]}
      />
      <ScrollView
        stickyHeaderIndices={[1]}
        contentContainerStyle={tw.style('pb-16')}
      >
        <Box twClassName="gap-4 pb-4">
          <Box twClassName="flex-row items-center gap-3 px-4 pt-2">
            <ProtoAvatarCircle avatar={event.outcomes[0].avatar} size={44} />
            <Box twClassName="flex-1 gap-0.5">
              {startsIn ? (
                <EventStatus status={{ kind: 'upcoming', label: startsIn }} />
              ) : null}
              <Text variant={TextVariant.HeadingSm}>{event.title}</Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {`${event.meta} · ${event.volume} Vol.`}
              </Text>
            </Box>
          </Box>
          {isMultiOutcome ? (
            <Box twClassName="flex-row flex-wrap gap-x-3 gap-y-1 px-4">
              {chartOutcomes.map((outcome) => (
                <Box
                  key={outcome.id}
                  twClassName="flex-row items-center gap-1.5"
                >
                  <Box
                    twClassName="h-2 w-2 rounded-full"
                    style={{ backgroundColor: outcome.color }}
                  />
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                  >
                    {`${outcome.label} ${outcome.price}%`}
                  </Text>
                </Box>
              ))}
            </Box>
          ) : null}
          <Box twClassName="px-4">
            <PredictMarketChart
              series={series}
              height={150}
              compactEndpointLabels={isMultiOutcome}
            />
          </Box>
          <RangeChips ranges={RANGES} value={range} onChange={setRange} />
        </Box>
        <Box twClassName="bg-default pt-2">
          <UnderlineTabs<StandardTab>
            tabs={[
              {
                key: 'positions',
                label: eventPositions.length
                  ? `Positions · ${eventPositions.length}`
                  : 'Positions',
              },
              { key: 'outcomes', label: 'Outcomes' },
              { key: 'about', label: 'About' },
            ]}
            value={tab}
            onChange={handleTab}
          />
          <Box twClassName="h-px bg-muted" />
        </Box>
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
        ) : tab === 'about' ? (
          <Box twClassName="gap-2 px-4 pt-4">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
              How this market resolves
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {event.rules}
            </Text>
          </Box>
        ) : (
          <Box twClassName="gap-3">
            <SectionHeader title="Markets" volume={event.volume} />
            {isMultiOutcome ? (
              event.outcomes.map((outcome) => {
                const pair = yesNoPair(outcome);
                const favorite = leadingIndex(pair);
                return (
                  <FeedPanel
                    key={outcome.id}
                    twClassName="gap-3 p-4"
                    style={tw.style('mx-4')}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Bold}
                      style={styles.dotted}
                    >
                      {outcome.label}
                    </Text>
                    {pair.map((side, index) => (
                      <OutcomeRow
                        key={side.id}
                        outcome={side}
                        showAvatar={false}
                        isLeading={index === favorite}
                        badge={held(side.id)}
                        onPress={() =>
                          state.openOrder(
                            buildIntent(
                              event.id,
                              event.title,
                              outcome.label,
                              pair,
                              index,
                            ),
                          )
                        }
                      />
                    ))}
                  </FeedPanel>
                );
              })
            ) : (
              <FeedPanel twClassName="gap-4 p-4" style={tw.style('mx-4')}>
                {event.outcomes.map((outcome, index) => (
                  <OutcomeRow
                    key={outcome.id}
                    outcome={outcome}
                    isLeading={index === leadingIndex(event.outcomes)}
                    badge={held(outcome.id)}
                    onPress={() =>
                      state.openOrder(
                        buildIntent(
                          event.id,
                          event.title,
                          event.title,
                          event.outcomes,
                          index,
                        ),
                      )
                    }
                  />
                ))}
              </FeedPanel>
            )}
          </Box>
        )}
      </ScrollView>
    </Box>
  );
};
