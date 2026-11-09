import { PREDICT_MARKET_TYPES } from '../../../constants';
import type { PredictEntityId, PredictMarket } from '../../../types';
import {
  formatThresholdLine,
  formatThresholdLineOutcome,
  formatThresholdOutcome,
  formatThresholdTitle,
} from './formatThresholdLine';

const createMarket = (group: PredictMarket['group']): PredictMarket => ({
  id: 'market-1' as PredictEntityId,
  question: 'Market question',
  status: 'active',
  group,
  outcomes: [
    { id: 'market-1:yes' as PredictEntityId, side: 'yes', label: 'Yes' },
    { id: 'market-1:no' as PredictEntityId, side: 'no', label: 'No' },
  ],
});

const thresholdGroup = (label?: string): PredictMarket['group'] => ({
  key: 'group-1',
  groupType: 'marketSelector',
  marketType: PREDICT_MARKET_TYPES.THRESHOLD,
  option: { type: 'number', value: 60 },
  label,
});

describe('formatThresholdLine', () => {
  it('names a threshold line with its label', () => {
    expect(
      formatThresholdLine(createMarket(thresholdGroup('Josh Jacobs'))),
    ).toBe('Josh Jacobs · 60+');
  });

  it('names an unlabelled threshold line by the line alone', () => {
    expect(formatThresholdLine(createMarket(thresholdGroup()))).toBe('60+');
  });

  it('names no other Market', () => {
    const total = createMarket({
      key: 'group-1',
      groupType: 'marketSelector',
      marketType: PREDICT_MARKET_TYPES.TOTAL,
      option: { type: 'number', value: 220.5 },
      label: 'Total points',
    });

    expect(formatThresholdLine(total)).toBeUndefined();
    expect(formatThresholdLine(createMarket(undefined))).toBeUndefined();
  });
});

describe('formatThresholdTitle', () => {
  it('titles a threshold line with its label', () => {
    expect(
      formatThresholdTitle(createMarket(thresholdGroup('Josh Jacobs'))),
    ).toBe('Josh Jacobs: 60+');
  });

  it('titles an unlabelled threshold line by the line alone', () => {
    expect(formatThresholdTitle(createMarket(thresholdGroup('  ')))).toBe(
      '60+',
    );
  });

  it('titles no other Market', () => {
    expect(formatThresholdTitle(createMarket(undefined))).toBeUndefined();
  });
});

describe('formatThresholdOutcome', () => {
  it('names an Outcome with its threshold line and label', () => {
    expect(
      formatThresholdOutcome(
        createMarket(thresholdGroup('Josh Jacobs')),
        'Yes',
      ),
    ).toBe('Yes · Josh Jacobs · 60+');
  });

  it('names an Outcome with an unlabelled threshold line', () => {
    expect(formatThresholdOutcome(createMarket(thresholdGroup()), 'No')).toBe(
      'No · 60+',
    );
  });

  it('names no Outcome of any other Market', () => {
    expect(
      formatThresholdOutcome(createMarket(undefined), 'Yes'),
    ).toBeUndefined();
  });
});

describe('formatThresholdLineOutcome', () => {
  it('names an Outcome with a context threshold line and label', () => {
    expect(
      formatThresholdLineOutcome({ line: 60, label: 'Josh Jacobs' }, 'Yes'),
    ).toBe('Yes · Josh Jacobs · 60+');
  });

  it('names an Outcome with an unlabelled context threshold line', () => {
    expect(formatThresholdLineOutcome({ line: 60 }, 'No')).toBe('No · 60+');
  });
});
