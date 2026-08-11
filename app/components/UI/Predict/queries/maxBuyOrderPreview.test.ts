import Engine from '../../../../core/Engine';
import {
  predictMaxBuyOrderPreviewKeys,
  predictMaxBuyOrderPreviewOptions,
} from './maxBuyOrderPreview';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      previewMaxBuyOrder: jest.fn(),
    },
  },
}));

const params = {
  marketId: 'market-1',
  outcomeId: 'outcome-1',
  outcomeTokenId: 'token-1',
  availableBalance: 100,
};

describe('maxBuyOrderPreview queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keys the query by the market, outcome, token, and available balance', () => {
    expect(predictMaxBuyOrderPreviewKeys.detail(params)).toEqual([
      'predict',
      'maxBuyOrderPreview',
      'market-1',
      'outcome-1',
      'token-1',
      100,
    ]);
  });

  it('requests an authoritative preview without retaining another query key', async () => {
    const options = predictMaxBuyOrderPreviewOptions(params);

    await (options.queryFn as NonNullable<typeof options.queryFn>)({} as never);

    expect(
      Engine.context.PredictController.previewMaxBuyOrder,
    ).toHaveBeenCalledWith(params);
    expect(options.retry).toBe(false);
    expect(options).not.toHaveProperty('keepPreviousData');
  });
});
