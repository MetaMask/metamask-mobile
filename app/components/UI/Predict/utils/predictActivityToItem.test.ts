import { predictActivityToItem } from './predictActivityToItem';
import { type PredictActivity, PredictActivityType } from '../types';

const buy: PredictActivity = {
  id: 'a1',
  providerId: 'polymarket',
  title: 'Will it rain tomorrow?',
  outcome: 'Yes',
  icon: 'https://example.com/icon.png',
  entry: {
    type: 'buy',
    timestamp: 1_700_000_000,
    marketId: 'm1',
    outcomeId: 'o1',
    outcomeTokenId: 1,
    amount: 5,
    price: 0.978,
  },
};

describe('predictActivityToItem', () => {
  it('maps a buy activity to a BUY item with market/outcome/amount and entry', () => {
    expect(predictActivityToItem(buy)).toEqual({
      id: 'a1',
      type: PredictActivityType.BUY,
      marketTitle: 'Will it rain tomorrow?',
      detail: '',
      amountUsd: 5,
      icon: 'https://example.com/icon.png',
      outcome: 'Yes',
      providerId: 'polymarket',
      entry: buy.entry,
    });
  });

  it('maps sell → SELL and claimWinnings → CLAIM', () => {
    expect(
      predictActivityToItem({
        ...buy,
        entry: { ...buy.entry, type: 'sell' },
      }).type,
    ).toBe(PredictActivityType.SELL);

    expect(
      predictActivityToItem({
        ...buy,
        entry: { type: 'claimWinnings', timestamp: 1, amount: 9 },
      }).type,
    ).toBe(PredictActivityType.CLAIM);
  });

  it('defaults missing market title to an empty string', () => {
    expect(
      predictActivityToItem({ ...buy, title: undefined }).marketTitle,
    ).toBe('');
  });
});
