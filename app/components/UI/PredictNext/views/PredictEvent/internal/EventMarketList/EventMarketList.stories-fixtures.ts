import { parsePredictEvent } from '../../../../contracts/v1/marketData';
import { parsePredictPositionsPage } from '../../../../contracts/v1/portfolio';
import type { PredictEvent } from '../../../../types';

const makeMarket = (id: string, question: string) => ({
  id,
  question,
  status: 'active',
  rules: 'The official final result determines settlement.',
  volume: '250000',
  outcomes: [
    { id: `${id}-yes`, side: 'yes', label: 'Yes', askPrice: '0.42' },
    { id: `${id}-no`, side: 'no', label: 'No', askPrice: '0.58' },
  ],
});

/** Synthetic, runtime-validated canonical Events; no Engine or test-runtime imports. */
export const makeStoryStandardEvent = (marketCount = 3): PredictEvent =>
  parsePredictEvent({
    venueId: 'kalshi',
    id: `story-standard-${marketCount}`,
    title: 'Which milestone will be reached this year?',
    category: 'Crypto',
    markets: Array.from({ length: marketCount }, (_, index) =>
      makeMarket(
        `story-standard-${index + 1}`,
        `Will milestone ${index + 1} be reached before the end of the year?`,
      ),
    ),
  });

export const makeStoryGameEvent = (): PredictEvent =>
  parsePredictEvent({
    venueId: 'kalshi',
    id: 'story-game',
    title: 'New England vs Seattle',
    category: 'Sports',
    sports: {
      sport: { id: 'american-football', label: 'American football' },
      competition: { id: 'nfl', label: 'NFL' },
      game: {
        status: 'in_progress',
        homeTeam: { name: 'Seattle', abbreviation: 'SEA' },
        awayTeam: { name: 'New England', abbreviation: 'NE' },
        score: { home: '21', away: '17' },
        period: 'Q4',
        clock: '12:22',
        observedAt: '2026-10-28T12:00:00.000Z',
      },
    },
    markets: [
      ...(['home', 'away'] as const).map((gameSelection) => {
        const market = makeMarket(
          `story-winner-${gameSelection}`,
          `Will ${gameSelection === 'home' ? 'Seattle' : 'New England'} win?`,
        );
        return {
          ...market,
          outcomes: [
            { ...market.outcomes[0], gameSelection },
            market.outcomes[1],
          ],
        };
      }),
      ...[45.5, 47.5, 49.5].map((value, displayOrder) => ({
        ...makeMarket(`story-total-${value}`, `Over ${value} total points?`),
        group: {
          key: 'story-totals',
          groupType: 'marketSelector',
          marketType: 'total',
          option: { type: 'number', value },
          displayOrder,
        },
      })),
      ...[-2.5, -1.5, 1.5].map((value, displayOrder) => ({
        ...makeMarket(`story-spread-${value}`, `Seattle spread ${value}`),
        group: {
          key: 'story-spreads',
          groupType: 'marketSelector',
          marketType: 'spread',
          option: { type: 'number', value },
          displayOrder,
        },
      })),
    ],
  });

/** One distinct holding per Market, including composed Markets when supplied. */
export const makeStoryPositions = (event: PredictEvent, count: number) =>
  parsePredictPositionsPage({
    venueId: event.venueId,
    positions: event.markets.slice(0, count).map((market, index) => ({
      venueId: event.venueId,
      marketId: market.id,
      side: index % 2 === 0 ? 'yes' : 'no',
      shares: index % 2 === 0 ? '75' : '12.5',
      context: {
        eventId: event.id,
        eventTitle: event.title,
        marketQuestion: market.question,
        outcomeLabel: index % 2 === 0 ? 'Yes' : 'No',
      },
    })),
  }).positions;
