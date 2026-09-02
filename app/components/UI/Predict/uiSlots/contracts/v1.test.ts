import { PREDICT_UI_SLOTS_V1_CONTRACTS } from './v1';

const parseWidget =
  PREDICT_UI_SLOTS_V1_CONTRACTS.widgets?.['predict-discovery-list'];
const parseReference =
  PREDICT_UI_SLOTS_V1_CONTRACTS.dataReferences?.[
    'predict-homepage-market-slots'
  ];

const event = {
  type: 'event',
  id: '202857',
  slug: 'pro-football-2027-champion-20260729185915366',
};
const series = {
  type: 'series',
  seriesId: 'btc-up-or-down-5m',
};
const makeReference = (items: unknown[] = [event, series]) => ({
  id: 'markets',
  type: 'predict-homepage-market-slots',
  params: {
    venue: 'polymarket',
    items,
  },
});

describe('Predict UI Slots v1 contracts', () => {
  it('parses the exact discovery-list widget contract', () => {
    const widget = {
      type: 'predict-discovery-list',
      schemaVersion: 1,
      props: {},
    };

    const result = parseWidget?.(widget);

    expect(result).toEqual(widget);
  });

  it.each([
    ['a widget property', { ignored: true }, {}],
    ['a props property', {}, { ignored: true }],
  ])('rejects %s outside the closed widget contract', (_name, extra, props) => {
    const widget = {
      type: 'predict-discovery-list',
      schemaVersion: 1,
      props,
      ...extra,
    };

    expect(() => parseWidget?.(widget)).toThrow();
  });

  it('parses and preserves an event-series-event reference order', () => {
    const secondEvent = {
      type: 'event',
      id: '659518',
      slug: 'epl-2027-champion-20260701200428749',
    };
    const reference = makeReference([event, series, secondEvent]);

    const result = parseReference?.(reference);

    expect(result).toEqual(reference);
  });

  it.each([
    ['reference id', { ...makeReference(), id: 'featured' }],
    [
      'venue',
      {
        ...makeReference(),
        params: { ...makeReference().params, venue: 'kalshi' },
      },
    ],
    ['empty event id', makeReference([{ ...event, id: '' }])],
    ['whitespace event id', makeReference([{ ...event, id: '  ' }])],
    ['empty event slug', makeReference([{ ...event, slug: '' }])],
    ['whitespace event slug', makeReference([{ ...event, slug: '\t' }])],
    ['oversized event id', makeReference([{ ...event, id: '1'.repeat(513) }])],
    [
      'oversized event slug',
      makeReference([{ ...event, slug: 's'.repeat(513) }]),
    ],
    ['unknown item type', makeReference([{ type: 'market', id: '1' }])],
    ['extra event property', makeReference([{ ...event, title: 'NFL' }])],
    ['extra series property', makeReference([{ ...series, title: 'BTC' }])],
    [
      'series outside the allowlist',
      makeReference([{ ...series, seriesId: 'eth-up-or-down-5m' }]),
    ],
    ['empty items', makeReference([])],
    [
      'more than ten items',
      makeReference(
        Array.from({ length: 11 }, (_, index) => ({
          ...event,
          id: `${index}`,
          slug: `event-${index}`,
        })),
      ),
    ],
    ['duplicate event id', makeReference([event, { ...event, slug: 'other' }])],
    ['duplicate event slug', makeReference([event, { ...event, id: 'other' }])],
    ['duplicate series id', makeReference([series, series])],
    ['extra reference property', { ...makeReference(), ignored: true }],
    [
      'extra params property',
      {
        ...makeReference(),
        params: { ...makeReference().params, ignored: true },
      },
    ],
  ])('rejects %s', (_name, reference) => {
    expect(() => parseReference?.(reference)).toThrow();
  });
});
