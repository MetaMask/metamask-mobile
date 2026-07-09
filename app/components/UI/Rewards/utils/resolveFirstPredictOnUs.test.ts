import Engine from '../../../../core/Engine';
import { store } from '../../../../store';
import { Recurrence, type PredictMarket } from '../../Predict/types';
import { selectRewardsFirstPredictOnUsEnabled } from '../../../../selectors/featureFlagController/rewardsFirstPredictOnUs';
import { selectFirstPredictOnUsSplashShown } from '../../../../reducers/rewards/selectors';
import {
  resolveFirstPredictOnUsMarkets,
  resolveFirstPredictOnUsLaunch,
} from './resolveFirstPredictOnUs';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    PredictController: {
      getMarket: jest.fn(),
      refreshEligibility: jest.fn(),
    },
  },
}));

jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock(
  '../../../../selectors/featureFlagController/rewardsFirstPredictOnUs',
  () => ({
    selectRewardsFirstPredictOnUsEnabled: jest.fn(),
  }),
);

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectFirstPredictOnUsSplashShown: jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockGetMarket = Engine.context.PredictController
  .getMarket as jest.MockedFunction<
  typeof Engine.context.PredictController.getMarket
>;
const mockRefreshEligibility = Engine.context.PredictController
  .refreshEligibility as jest.MockedFunction<
  typeof Engine.context.PredictController.refreshEligibility
>;
const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockGetState = store.getState as jest.MockedFunction<
  typeof store.getState
>;
const mockFeatureEnabled =
  selectRewardsFirstPredictOnUsEnabled as jest.MockedFunction<
    typeof selectRewardsFirstPredictOnUsEnabled
  >;
const mockAlreadyShown =
  selectFirstPredictOnUsSplashShown as jest.MockedFunction<
    typeof selectFirstPredictOnUsSplashShown
  >;

const buildMarket = (
  overrides: Partial<PredictMarket> = {},
): PredictMarket => ({
  id: '30615',
  providerId: 'polymarket',
  slug: 'spain-vs-england',
  title: 'Spain vs England',
  description: 'Spain vs England',
  image: 'https://example.com/image.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['world-cup'],
  liquidity: 1000,
  volume: 9100,
  outcomes: [
    {
      id: '0xabc',
      providerId: 'polymarket',
      marketId: '30615',
      title: 'Moneyline',
      groupItemTitle: 'Moneyline',
      description: 'Moneyline',
      image: 'https://example.com/image.png',
      status: 'open',
      active: true,
      acceptingOrders: true,
      volume: 9100,
      liquidity: 1000,
      tokens: [
        { id: 'token-1', title: 'ESP', price: 0.5 },
        { id: 'token-2', title: 'ENG', price: 0.5 },
      ],
    },
    {
      id: '0xdef',
      providerId: 'polymarket',
      marketId: '30615',
      title: 'Spread',
      groupItemTitle: 'Spread',
      description: 'Spread',
      image: 'https://example.com/image.png',
      status: 'open',
      active: true,
      acceptingOrders: true,
      volume: 100,
      liquidity: 200,
      tokens: [{ id: 'token-3', title: 'ESP -1.5', price: 0.25 }],
    },
  ],
  ...overrides,
});

describe('resolveFirstPredictOnUsMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty result without calling the controller for no refs', async () => {
    const result = await resolveFirstPredictOnUsMarkets([]);

    expect(mockGetMarket).not.toHaveBeenCalled();
    expect(result).toEqual({ markets: [], failedCount: 0 });
  });

  it('returns the full market when conditionId is omitted', async () => {
    mockGetMarket.mockResolvedValueOnce(buildMarket());

    const result = await resolveFirstPredictOnUsMarkets([{ eventId: '30615' }]);

    expect(mockGetMarket).toHaveBeenCalledWith({ marketId: '30615' });
    expect(result.markets).toHaveLength(1);
    expect(result.markets[0].outcomes).toHaveLength(2);
    expect(result.failedCount).toBe(0);
  });

  it('filters each market to the configured conditionId', async () => {
    mockGetMarket.mockResolvedValueOnce(buildMarket());

    const result = await resolveFirstPredictOnUsMarkets([
      { eventId: '30615', conditionId: '0xabc' },
    ]);

    expect(result.markets).toHaveLength(1);
    expect(result.markets[0].outcomes).toEqual([
      expect.objectContaining({ id: '0xabc' }),
    ]);
    expect(result.failedCount).toBe(0);
  });

  it('falls back to the parent market image when a filtered outcome has no image', async () => {
    const marketImage = 'https://example.com/parent-market.png';
    mockGetMarket.mockResolvedValueOnce(
      buildMarket({
        image: marketImage,
        outcomes: [
          {
            id: '0xabc',
            providerId: 'polymarket',
            marketId: '30615',
            title: 'Moneyline',
            groupItemTitle: 'Moneyline',
            description: 'Moneyline',
            image: '',
            status: 'open',
            active: true,
            acceptingOrders: true,
            volume: 9100,
            liquidity: 1000,
            tokens: [
              { id: 'token-1', title: 'Yes', price: 0.5 },
              { id: 'token-2', title: 'No', price: 0.5 },
            ],
          },
        ],
      }),
    );

    const result = await resolveFirstPredictOnUsMarkets([
      { eventId: '30615', conditionId: '0xabc' },
    ]);

    expect(result.markets[0].outcomes[0].image).toBe(marketImage);
  });

  it('drops failed or unmatched market refs and counts them', async () => {
    mockGetMarket
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(buildMarket({ id: '30616' }));

    const result = await resolveFirstPredictOnUsMarkets([
      { eventId: '30615', conditionId: '0xabc' },
      { eventId: '30616', conditionId: 'missing-condition' },
    ]);

    expect(result.markets).toEqual([]);
    expect(result.failedCount).toBe(2);
  });

  it('requests every configured market ref from the backend payload', async () => {
    mockGetMarket.mockResolvedValue(buildMarket());

    await resolveFirstPredictOnUsMarkets([
      { eventId: '1', conditionId: '0xabc' },
      { eventId: '2', conditionId: '0xabc' },
      { eventId: '3', conditionId: '0xabc' },
      { eventId: '4', conditionId: '0xabc' },
    ]);

    expect(mockGetMarket).toHaveBeenCalledTimes(4);
    expect(mockGetMarket).toHaveBeenCalledWith({ marketId: '4' });
  });
});

describe('resolveFirstPredictOnUsLaunch', () => {
  const content = {
    name: 'First Predict On Us',
    image: null,
    localizedText: {},
    usdAmount: 5,
    markets: [{ eventId: '30615', conditionId: '0xabc' }],
    termsUrl: null,
  };

  const setEligibility = (eligibility: unknown) => {
    mockGetState.mockReturnValue({
      engine: { backgroundState: { PredictController: { eligibility } } },
    } as never);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFeatureEnabled.mockReturnValue(true);
    mockAlreadyShown.mockReturnValue(false);
    setEligibility({ eligible: true, country: 'US' });
    mockRefreshEligibility.mockResolvedValue(undefined as never);
    mockCall.mockResolvedValue(content as never);
    mockGetMarket.mockResolvedValue(buildMarket());
  });

  it('resolves content and markets when all gates pass', async () => {
    const result = await resolveFirstPredictOnUsLaunch();

    expect(mockRefreshEligibility).toHaveBeenCalled();
    expect(mockGetMarket).toHaveBeenCalledWith({ marketId: '30615' });
    expect(result?.content).toBe(content);
    expect(result?.markets).toHaveLength(1);
    expect(result?.markets[0].outcomes).toEqual([
      expect.objectContaining({ id: '0xabc' }),
    ]);
  });

  it('returns null and skips network when the splash was already shown', async () => {
    mockAlreadyShown.mockReturnValue(true);

    const result = await resolveFirstPredictOnUsLaunch();

    expect(result).toBeNull();
    expect(mockRefreshEligibility).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns null and skips network when the feature flag is disabled', async () => {
    mockFeatureEnabled.mockReturnValue(false);

    const result = await resolveFirstPredictOnUsLaunch();

    expect(result).toBeNull();
    expect(mockRefreshEligibility).not.toHaveBeenCalled();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns null when Predict is geo-ineligible', async () => {
    setEligibility({ eligible: false, country: 'GB' });

    const result = await resolveFirstPredictOnUsLaunch();

    expect(result).toBeNull();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns null when no country has resolved', async () => {
    setEligibility({ eligible: true, country: undefined });

    const result = await resolveFirstPredictOnUsLaunch();

    expect(result).toBeNull();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it('returns null when no CMS content is returned', async () => {
    mockCall.mockResolvedValue(null as never);

    const result = await resolveFirstPredictOnUsLaunch();

    expect(result).toBeNull();
    expect(mockGetMarket).not.toHaveBeenCalled();
  });

  it('returns null when the CMS content has no markets', async () => {
    mockCall.mockResolvedValue({ ...content, markets: [] } as never);

    const result = await resolveFirstPredictOnUsLaunch();

    expect(result).toBeNull();
    expect(mockGetMarket).not.toHaveBeenCalled();
  });

  it('returns null when no markets resolve', async () => {
    mockGetMarket.mockRejectedValue(new Error('network') as never);

    const result = await resolveFirstPredictOnUsLaunch();

    expect(result).toBeNull();
  });

  it('returns null when resolution rejects', async () => {
    mockCall.mockRejectedValue(new Error('network down') as never);

    const result = await resolveFirstPredictOnUsLaunch();

    expect(result).toBeNull();
  });

  it('returns null when resolution exceeds the timeout', async () => {
    mockGetMarket.mockImplementation(
      () => new Promise(() => undefined) as never,
    );

    const result = await resolveFirstPredictOnUsLaunch(10);

    expect(result).toBeNull();
  });
});
