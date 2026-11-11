import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import type { PredictEvent, PredictMarket, PredictOutcome } from '../../types';
import { formatAskPrice } from '../shared/formatting';
import { isOutcomeTradeable } from '../shared/tradeable';
import { OutcomeRow as SharedOutcomeRow } from '../shared/ui';
import {
  EVENT_CARD_VISIBLE_MARKET_COUNT,
  EventCard,
} from './internal/EventCard';
import { formatEventCardSubtitle } from './internal/formatEventCardSubtitle';
import { isEventLive } from './internal/isEventLive';

/**
 * 'default' is the feed card. 'trending' is the Trending carousel card, with
 * the Category header, the LIVE marker while live, and two compact rows.
 */
export type EventCardStandardVariant = 'default' | 'trending';

export interface EventCardStandardProps {
  event: PredictEvent;
  /** Defaults to 'default'. */
  variant?: EventCardStandardVariant;
  onPress: () => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
}

type StandardCompositionProps = Omit<EventCardStandardProps, 'variant'>;

const SIDE_LABEL_IDS: Record<PredictOutcome['side'], string> = {
  yes: 'predict_next.portfolio.outcome_side.yes',
  no: 'predict_next.portfolio.outcome_side.no',
};

const getOutcome = (market: PredictMarket, side: 'yes' | 'no') =>
  market.outcomes.find((outcome) => outcome.side === side) as PredictOutcome;

/**
 * The default presentation: its title and a close date and volume line, then
 * a Yes and a No row for a binary Event, or the Yes row of up to three
 * Markets otherwise. Rows reuse the Event image as their avatar because the
 * read model has no per-Market image.
 */
const DefaultStandardCard = ({
  event,
  onPress,
  onOrder,
}: StandardCompositionProps) => {
  const isSingleMarket = event.markets.length === 1;
  const subtitle = formatEventCardSubtitle(event);

  return (
    <EventCard.Root testID={`predict-next-event-${event.venueId}-${event.id}`}>
      <EventCard.Pressable
        onPress={onPress}
        testID={`predict-next-event-content-${event.venueId}-${event.id}`}
      >
        <EventCard.Header twClassName="gap-1">
          <EventCard.Title twClassName="w-full">{event.title}</EventCard.Title>
          {subtitle ? (
            <EventCard.Subtitle
              testID={`predict-next-event-subtitle-${event.id}`}
            >
              {subtitle}
            </EventCard.Subtitle>
          ) : null}
        </EventCard.Header>
      </EventCard.Pressable>

      <EventCard.Body twClassName="gap-3">
        {isSingleMarket
          ? (['yes', 'no'] as const).map((side) => (
              <EventCard.OutcomeRow
                key={side}
                event={event}
                market={event.markets[0]}
                outcome={getOutcome(event.markets[0], side)}
                label={strings(SIDE_LABEL_IDS[side])}
                imageUrl={event.imageUrl}
                onOrder={onOrder}
                testID={`predict-next-outcome-${event.id}-${side}`}
              />
            ))
          : event.markets
              .slice(0, EVENT_CARD_VISIBLE_MARKET_COUNT)
              .map((market) => (
                <EventCard.OutcomeRow
                  key={market.id}
                  event={event}
                  market={market}
                  outcome={getOutcome(market, 'yes')}
                  imageUrl={event.imageUrl}
                  onOrder={onOrder}
                  testID={`predict-next-outcome-${event.id}-${market.id}-yes`}
                />
              ))}
      </EventCard.Body>
    </EventCard.Root>
  );
};

/** The trending card's height fits two rows. */
const TRENDING_VISIBLE_MARKET_COUNT = 2;

/**
 * Design-slice placeholders for each trending row's second line, by row
 * position. Where an Event's ranking comes from is still an open question in
 * PRED-1483. It must come from the backend; never compute it on the client,
 * for example by sorting rows on price.
 */
const TRENDING_ROW_LABELS: readonly [string, string] = ['Leads', 'Second'];

const TRENDING_PRICE_CLASS_NAME = 'min-w-[64px] h-[37px] px-3';

interface TrendingRow {
  market: PredictMarket;
  outcome: PredictOutcome;
}

/** The first Markets that have a yes Outcome, each priced by that Outcome. */
const getTrendingRows = (markets: readonly PredictMarket[]): TrendingRow[] =>
  markets
    .flatMap((market) => {
      const outcome = market.outcomes.find(({ side }) => side === 'yes');
      return outcome ? [{ market, outcome }] : [];
    })
    .slice(0, TRENDING_VISIBLE_MARKET_COUNT);

const LiveMarker = ({ eventId }: { eventId: string }) => (
  <Box
    twClassName="flex-row items-center gap-1"
    testID={`predict-next-event-live-${eventId}`}
  >
    <Box
      twClassName="h-2 w-2 rounded-full bg-success-default"
      testID={`predict-next-event-live-dot-${eventId}`}
    />
    <Text
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Bold}
      color={TextColor.SuccessDefault}
    >
      {strings('predict.game_status.live')}
    </Text>
  </Box>
);

interface TrendingMarketRowProps
  extends TrendingRow,
    Pick<StandardCompositionProps, 'event' | 'onOrder'> {
  /** The muted second line under the name. */
  rank: string;
}

/**
 * One Market: its yes Outcome's name over a muted second line, and a 64x37
 * pill that opens an Order for that Outcome. No avatar and no price bar.
 */
const TrendingMarketRow = ({
  event,
  market,
  outcome,
  rank,
  onOrder,
}: TrendingMarketRowProps) => {
  const { colors } = useTheme();
  const price = formatAskPrice(outcome.askPrice);

  return (
    <SharedOutcomeRow.Root
      testID={`predict-next-outcome-row-${event.id}-${market.id}`}
    >
      <Box twClassName="min-w-0 flex-1">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          numberOfLines={1}
        >
          {outcome.label}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
        >
          {rank}
        </Text>
      </Box>
      <SharedOutcomeRow.Price
        price={price}
        color={colors.text.default}
        isDisabled={!onOrder || !isOutcomeTradeable(market, outcome)}
        onPress={() => onOrder?.(event, market, outcome)}
        accessibilityLabel={strings(
          'predict_next.event.standard_outcome_accessibility_label',
          {
            title: event.title,
            outcome: outcome.label,
            price: price ?? strings('predict.market_groups.price_unavailable'),
          },
        )}
        testID={`predict-next-outcome-${event.id}-${market.id}-yes`}
        twClassName={TRENDING_PRICE_CLASS_NAME}
      />
    </SharedOutcomeRow.Root>
  );
};

/**
 * The Trending carousel presentation: a header row with the Category in caps and,
 * while the Event is live, a LIVE marker, over a dashed divider; then the
 * title and subtitle, which open the Event, and up to two Markets.
 */
const TrendingStandardCard = ({
  event,
  onPress,
  onOrder,
}: StandardCompositionProps) => {
  const category = (event.category ?? event.title).toUpperCase();
  const subtitle = event.subtitle ?? formatEventCardSubtitle(event);
  const rows = getTrendingRows(event.markets);

  return (
    <EventCard.Root
      twClassName="gap-3 rounded-2xl bg-section py-4"
      testID={`predict-next-event-${event.venueId}-${event.id}`}
    >
      <EventCard.HeaderRow testID={`predict-next-event-header-${event.id}`}>
        <Text
          variant={TextVariant.BodyXs}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          twClassName="min-w-0 flex-1"
          testID={`predict-next-event-category-${event.id}`}
        >
          {category}
        </Text>
        {isEventLive(event) ? <LiveMarker eventId={event.id} /> : null}
      </EventCard.HeaderRow>

      <EventCard.Pressable
        onPress={onPress}
        accessibilityRole="button"
        testID={`predict-next-event-content-${event.venueId}-${event.id}`}
      >
        <EventCard.Header twClassName="gap-1 px-4">
          <EventCard.Title twClassName="w-full">{event.title}</EventCard.Title>
          {subtitle ? (
            <EventCard.Subtitle
              testID={`predict-next-event-subtitle-${event.id}`}
            >
              {subtitle}
            </EventCard.Subtitle>
          ) : null}
        </EventCard.Header>
      </EventCard.Pressable>

      <EventCard.Body twClassName="gap-3 px-4 pt-1">
        {rows.map(({ market, outcome }, index) => (
          <TrendingMarketRow
            key={market.id}
            event={event}
            market={market}
            outcome={outcome}
            rank={TRENDING_ROW_LABELS[index]}
            onOrder={onOrder}
          />
        ))}
      </EventCard.Body>
    </EventCard.Root>
  );
};

/** A non-game Event, as a feed card or as a Trending carousel card. */
export const EventCardStandard = ({
  variant = 'default',
  ...props
}: EventCardStandardProps) =>
  variant === 'trending' ? (
    <TrendingStandardCard {...props} />
  ) : (
    <DefaultStandardCard {...props} />
  );
