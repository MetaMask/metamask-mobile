import type {
  PredictAmount,
  PredictDecimal,
  PredictEntityId,
  PredictEvent,
  PredictHttpsUrl,
  PredictPosition,
  PredictVenueId,
} from '../../types';
import { buyIntent, cashOutIntent } from './orderFlowIntents';

const VENUE_ID = 'kalshi' as PredictVenueId;

const event: PredictEvent = {
  venueId: VENUE_ID,
  id: 'event-1' as PredictEntityId,
  title: 'Bills vs. Chiefs',
  imageUrl: 'https://predict.example/event.png',
  markets: [
    {
      id: 'market-1' as PredictEntityId,
      question: 'Will the Bills win?',
      status: 'active',
      outcomes: [
        {
          id: 'market-1-yes' as PredictEntityId,
          side: 'yes',
          label: 'Bills',
          askPrice: '0.53' as PredictDecimal,
        },
        {
          id: 'market-1-no' as PredictEntityId,
          side: 'no',
          label: 'Chiefs',
          askPrice: '0.48' as PredictDecimal,
        },
      ],
    },
  ],
};

const createPosition = (
  overrides: Partial<PredictPosition> = {},
): PredictPosition => ({
  venueId: VENUE_ID,
  marketId: 'market-1' as PredictEntityId,
  side: 'no',
  status: 'open',
  shares: '12.75' as PredictAmount,
  context: {
    eventId: 'event-1' as PredictEntityId,
    eventTitle: 'Catalog title',
    marketQuestion: 'Will the Bills win?',
    outcomeLabel: 'Catalog Chiefs',
    imageUrl: 'https://predict.example/catalog.png' as PredictHttpsUrl,
  },
  ...overrides,
});

describe('buyIntent', () => {
  it('buys the Outcome within its Event at the quoted ask', () => {
    const [market] = event.markets;

    expect(buyIntent(event, market, market.outcomes[0])).toEqual({
      action: 'buy',
      eventId: 'event-1',
      venueId: VENUE_ID,
      marketId: 'market-1',
      side: 'yes',
      outcomeLabel: 'Bills',
      eventTitle: 'Bills vs. Chiefs',
      eventImageUrl: 'https://predict.example/event.png',
      askPrice: '0.53',
    });
  });
});

describe('cashOutIntent', () => {
  it('sells at most the whole contracts held', () => {
    expect(cashOutIntent(createPosition())).toMatchObject({
      maxContracts: 12,
    });
  });

  it('labels a Cash Out from the presented Event', () => {
    expect(cashOutIntent(createPosition(), event)).toEqual({
      action: 'sell',
      eventId: 'event-1',
      venueId: VENUE_ID,
      marketId: 'market-1',
      side: 'no',
      outcomeLabel: 'Chiefs',
      eventTitle: 'Bills vs. Chiefs',
      eventImageUrl: 'https://predict.example/event.png',
      maxContracts: 12,
    });
  });

  it('labels the Outcome from catalog context when the Event lacks its Market', () => {
    const position = createPosition({
      marketId: 'appended-market' as PredictEntityId,
    });

    expect(cashOutIntent(position, event).outcomeLabel).toBe('Catalog Chiefs');
  });

  it('labels a Cash Out from catalog context without an Event', () => {
    expect(cashOutIntent(createPosition())).toMatchObject({
      eventId: 'event-1',
      outcomeLabel: 'Catalog Chiefs',
      eventTitle: 'Catalog title',
      eventImageUrl: 'https://predict.example/catalog.png',
    });
  });

  it('falls back to neutral copy without catalog context', () => {
    expect(cashOutIntent(createPosition({ context: undefined }))).toMatchObject(
      {
        eventId: undefined,
        outcomeLabel: 'No',
        eventTitle: 'Market details unavailable',
        eventImageUrl: undefined,
      },
    );
  });
});
