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
import { EventCard } from './internal/EventCard';
import { formatEventCardSubtitle } from './internal/formatEventCardSubtitle';

export interface EventCardLiveProps {
  event: PredictEvent;
  live?: boolean;
  onPress: () => void;
  onOrder?: (
    event: PredictEvent,
    market: PredictMarket,
    outcome: PredictOutcome,
  ) => void;
}

/** The card's height fits two rows. */
const EVENT_CARD_LIVE_VISIBLE_MARKET_COUNT = 2;

/**
 * Design-slice placeholders for each row's second line, by row position.
 * Where a live Event's ranking comes from is still an open question in
 * PRED-1483. It must come from the backend; never compute it on the client,
 * for example by sorting rows on price.
 */
const LIVE_ROW_LABELS: readonly [string, string] = ['Leads', 'Second'];

const LIVE_PRICE_CLASS_NAME = 'min-w-[64px] h-[37px] px-3';

interface LiveRow {
  market: PredictMarket;
  outcome: PredictOutcome;
}

/** The first Markets that have a yes Outcome, each priced by that Outcome. */
const getLiveRows = (markets: readonly PredictMarket[]): LiveRow[] =>
  markets
    .flatMap((market) => {
      const outcome = market.outcomes.find(({ side }) => side === 'yes');
      return outcome ? [{ market, outcome }] : [];
    })
    .slice(0, EVENT_CARD_LIVE_VISIBLE_MARKET_COUNT);

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

interface LiveMarketRowProps
  extends LiveRow,
    Pick<EventCardLiveProps, 'event' | 'onOrder'> {
  /** The muted second line under the name. */
  rank: string;
}

/**
 * One Market: its yes Outcome's name over a muted second line, and a 64x37
 * pill that opens an Order for that Outcome. No avatar and no price bar.
 */
const LiveMarketRow = ({
  event,
  market,
  outcome,
  rank,
  onOrder,
}: LiveMarketRowProps) => {
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
        twClassName={LIVE_PRICE_CLASS_NAME}
      />
    </SharedOutcomeRow.Root>
  );
};

/**
 * A non-game Event for the Trending carousel: its Category in caps, with a
 * LIVE marker while `live`, then the title and subtitle, which open the
 * Event, and up to two Markets. No surface renders it until a rule says when
 * a non-game Event is live.
 */
export const EventCardLive = ({
  event,
  live = false,
  onPress,
  onOrder,
}: EventCardLiveProps) => {
  const category = (event.category ?? event.title).toUpperCase();
  const subtitle = event.subtitle ?? formatEventCardSubtitle(event);
  const rows = getLiveRows(event.markets);

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
        {live ? <LiveMarker eventId={event.id} /> : null}
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
          <LiveMarketRow
            key={market.id}
            event={event}
            market={market}
            outcome={outcome}
            rank={LIVE_ROW_LABELS[index]}
            onOrder={onOrder}
          />
        ))}
      </EventCard.Body>
    </EventCard.Root>
  );
};
