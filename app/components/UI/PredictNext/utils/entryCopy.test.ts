import type { PredictEntityId, PredictEntryContext } from '../types';
import { getOutcomeName } from './entryCopy';

const context: PredictEntryContext = {
  eventId: 'event-1' as PredictEntityId,
  eventTitle: 'Patriots at Seahawks',
  marketQuestion: 'Will the Patriots win?',
  outcomeLabel: 'Patriots',
};

describe('getOutcomeName', () => {
  it('names the Outcome by its label', () => {
    expect(getOutcomeName('yes', context)).toBe('Patriots');
  });

  it('joins the Outcome label and the Market labels in order', () => {
    expect(
      getOutcomeName('yes', {
        ...context,
        outcomeLabel: 'Yes',
        marketLabels: ['Josh Jacobs', '60+'],
      }),
    ).toBe('Yes · Josh Jacobs · 60+');
  });

  it('joins a single Market label', () => {
    expect(
      getOutcomeName('no', {
        ...context,
        outcomeLabel: 'No',
        marketLabels: ['60+'],
      }),
    ).toBe('No · 60+');
  });

  it('names the Outcome by its label alone with empty Market labels', () => {
    expect(getOutcomeName('yes', { ...context, marketLabels: [] })).toBe(
      'Patriots',
    );
  });

  it('names the side without context', () => {
    expect(getOutcomeName('no')).toBe('No');
  });
});
