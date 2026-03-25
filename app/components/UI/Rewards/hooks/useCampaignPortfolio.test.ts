import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector, useDispatch } from 'react-redux';
import { useCampaignPortfolio } from './useCampaignPortfolio';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignPortfolioById } from '../../../../reducers/rewards/selectors';
import { setCampaignPortfolio } from '../../../../reducers/rewards';
import type { CampaignPortfolioDto } from '../../../../core/Engine/controllers/rewards-controller/types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
  useDispatch: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: { call: jest.fn() },
}));

jest.mock('../../../../selectors/rewards', () => ({
  selectRewardsSubscriptionId: jest.fn(),
}));

jest.mock('../../../../reducers/rewards/selectors', () => ({
  selectCampaignPortfolioById: jest.fn(),
}));

jest.mock('../../../../reducers/rewards', () => ({
  setCampaignPortfolio: jest.fn(),
}));

const mockCall = Engine.controllerMessenger.call as jest.MockedFunction<
  typeof Engine.controllerMessenger.call
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseDispatch = useDispatch as jest.MockedFunction<typeof useDispatch>;
const mockSetCampaignPortfolio =
  setCampaignPortfolio as unknown as jest.MockedFunction<
    (payload: { campaignId: string; portfolio: CampaignPortfolioDto }) => {
      type: string;
      payload: { campaignId: string; portfolio: CampaignPortfolioDto };
    }
  >;
const mockSelectCampaignPortfolioById =
  selectCampaignPortfolioById as jest.MockedFunction<
    typeof selectCampaignPortfolioById
  >;

const SUB_ID = 'sub-123';
const CAMPAIGN_ID = 'camp-456';
const PORTFOLIO: CampaignPortfolioDto = {
  positions: [
    {
      tokenSymbol: 'AAPLon',
      tokenName: 'Apple Inc.',
      tokenAddresses: [
        'eip155:1/erc20:0x123' as const,
        'eip155:137/erc20:0x456' as const,
      ],
      units: '45.2',
      costBasis: '9040.00',
      avgCostPerUnit: '200.00',
      currentPrice: '215.50',
      currentValue: '9740.60',
      unrealizedPnl: '700.60',
      unrealizedPnlPercent: '0.0775',
    },
  ],
  summary: {
    totalCurrentValue: '9740.60',
    totalCostBasis: '9040.00',
    totalUsdDeposited: '10000.00',
    netDeposit: '9040.00',
    portfolioPnl: '-259.40',
    portfolioPnlPercent: '-0.0259',
  },
  computedAt: '2026-01-15T10:30:00.000Z',
};

const mockDispatch = jest.fn();
const mockPortfolioSelector = jest.fn();

function setupSelectors(
  subscriptionId: string | null,
  portfolio: CampaignPortfolioDto | null = null,
) {
  mockPortfolioSelector.mockReturnValue(portfolio);
  mockSelectCampaignPortfolioById.mockReturnValue(mockPortfolioSelector);

  let currentPortfolio = portfolio;

  mockDispatch.mockImplementation((action) => {
    if (
      action?.type === 'rewards/setCampaignPortfolio' &&
      action.payload?.portfolio
    ) {
      currentPortfolio = action.payload.portfolio;
      mockPortfolioSelector.mockReturnValue(currentPortfolio);
    }
  });

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectRewardsSubscriptionId) return subscriptionId;
    if (selector === mockPortfolioSelector) return currentPortfolio;
    return undefined;
  });
}

describe('useCampaignPortfolio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue(mockDispatch);
    mockSetCampaignPortfolio.mockImplementation((payload) => ({
      type: 'rewards/setCampaignPortfolio',
      payload,
    }));
  });

  it('skips fetch when subscriptionId is null', async () => {
    setupSelectors(null);
    const { result } = renderHook(() => useCampaignPortfolio(CAMPAIGN_ID));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.portfolio).toBeNull();
  });

  it('skips fetch when campaignId is undefined', async () => {
    setupSelectors(SUB_ID);
    const { result } = renderHook(() => useCampaignPortfolio(undefined));
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockCall).not.toHaveBeenCalled();
    expect(result.current.portfolio).toBeNull();
  });

  it('fetches and dispatches portfolio on mount', async () => {
    setupSelectors(SUB_ID);
    mockCall.mockResolvedValueOnce(PORTFOLIO as never);

    const { result, waitForNextUpdate } = renderHook(() =>
      useCampaignPortfolio(CAMPAIGN_ID),
    );
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(mockCall).toHaveBeenCalledWith(
      'RewardsController:getOndoCampaignPortfolio',
      CAMPAIGN_ID,
      SUB_ID,
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      mockSetCampaignPortfolio({
        campaignId: CAMPAIGN_ID,
        portfolio: PORTFOLIO,
      }),
    );
    expect(result.current.portfolio).toEqual(PORTFOLIO);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasError).toBe(false);
  });

  it('sets hasError on failure', async () => {
    setupSelectors(SUB_ID);
    mockCall.mockRejectedValueOnce(new Error('fail') as never);

    const { result, waitForNextUpdate } = renderHook(() =>
      useCampaignPortfolio(CAMPAIGN_ID),
    );
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result.current.hasError).toBe(true);
    expect(result.current.portfolio).toBeNull();
  });

  it('allows manual refetch', async () => {
    const INITIAL_PORTFOLIO: CampaignPortfolioDto = {
      ...PORTFOLIO,
      summary: { ...PORTFOLIO.summary, totalCurrentValue: '8000.00' },
    };
    setupSelectors(SUB_ID);
    mockCall
      .mockResolvedValueOnce(INITIAL_PORTFOLIO as never)
      .mockResolvedValueOnce(PORTFOLIO as never);

    const { result, waitForNextUpdate } = renderHook(() =>
      useCampaignPortfolio(CAMPAIGN_ID),
    );
    await act(async () => {
      await waitForNextUpdate();
    });
    expect(result.current.portfolio).toEqual(INITIAL_PORTFOLIO);

    await act(async () => {
      result.current.refetch();
      await waitForNextUpdate();
    });
    expect(result.current.portfolio).toEqual(PORTFOLIO);
  });
});
