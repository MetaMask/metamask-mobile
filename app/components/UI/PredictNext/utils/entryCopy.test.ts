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

  it('names a threshold Outcome with its line and label', () => {
    expect(
      getOutcomeName('yes', {
        ...context,
        outcomeLabel: 'Yes',
        threshold: { line: 60, label: 'Josh Jacobs' },
      }),
    ).toBe('Yes · Josh Jacobs · 60+');
  });

  it('names a threshold Outcome with an unlabelled line', () => {
    expect(
      getOutcomeName('no', {
        ...context,
        outcomeLabel: 'No',
        threshold: { line: 60 },
      }),
    ).toBe('No · 60+');
  });

  it('names the side without context', () => {
    expect(getOutcomeName('no')).toBe('No');
  });
});
