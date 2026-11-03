import type {
  PredictDecimal,
  PredictEntityId,
  PredictMarket,
} from '../../../types';
import { selectTopChartMarkets } from './selectTopChartMarkets';

const createMarket = (
  id: string,
  yesAskPrice?: string,
  status: PredictMarket['status'] = 'active',
): PredictMarket => ({
  id: id as PredictEntityId,
  question: `Will ${id} win?`,
  status,
  outcomes: [
    {
      id: `${id}-yes` as PredictEntityId,
      side: 'yes',
      label: id,
      askPrice: yesAskPrice as PredictDecimal | undefined,
    },
    {
      id: `${id}-no` as PredictEntityId,
      side: 'no',
      label: `Not ${id}`,
      askPrice: '0.99' as PredictDecimal,
    },
  ],
});

const ids = (markets: readonly PredictMarket[]) =>
  markets.map((market) => market.id);

describe('selectTopChartMarkets', () => {
  it('orders Markets by yes ask, highest first', () => {
    expect(
      ids(
        selectTopChartMarkets([
          createMarket('taylor', '0.05'),
          createMarket('drake', '0.81'),
          createMarket('ella', '0.14'),
        ]),
      ),
    ).toEqual(['drake', 'ella', 'taylor']);
  });

  it('keeps Event order for equal asks', () => {
    expect(
      ids(
        selectTopChartMarkets([
          createMarket('first', '0.2'),
          createMarket('second', '0.4'),
          createMarket('third', '0.20'),
        ]),
      ),
    ).toEqual(['second', 'first', 'third']);
  });

  it('takes at most three Markets', () => {
    expect(
      ids(
        selectTopChartMarkets([
          createMarket('a', '0.1'),
          createMarket('b', '0.4'),
          createMarket('c', '0.3'),
          createMarket('d', '0.2'),
        ]),
      ),
    ).toEqual(['b', 'c', 'd']);
  });

  it('skips Markets that are not active or have no usable yes ask', () => {
    expect(
      ids(
        selectTopChartMarkets([
          createMarket('closed', '0.9', 'closed'),
          createMarket('missing'),
          createMarket('negative', '-0.1'),
          createMarket('zero', '0'),
          createMarket('open', '0.3'),
        ]),
      ),
    ).toEqual(['open', 'zero']);
  });

  it('returns fewer Markets when fewer are eligible', () => {
    expect(ids(selectTopChartMarkets([createMarket('only', '0.5')]))).toEqual([
      'only',
    ]);
    expect(selectTopChartMarkets([createMarket('none')])).toEqual([]);
  });
});
