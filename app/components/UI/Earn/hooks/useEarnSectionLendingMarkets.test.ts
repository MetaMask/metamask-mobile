import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import type { LendingMarket } from '@metamask/stake-sdk';
import Engine from '../../../../core/Engine';
import useEarnSectionLendingMarkets from './useEarnSectionLendingMarkets';

jest.mock('react-redux');
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      EarnController: {
        refreshLendingMarkets: jest.fn(),
      },
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockRefreshLendingMarkets = Engine.context.EarnController
  .refreshLendingMarkets as jest.MockedFunction<
  typeof Engine.context.EarnController.refreshLendingMarkets
>;
const market = {
  id: 'aave-usdc',
  chainId: 1,
} as unknown as LendingMarket;

describe('useEarnSectionLendingMarkets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue([market]);
    mockRefreshLendingMarkets.mockResolvedValue(undefined);
  });

  it('returns markets from the Earn selector', () => {
    const { result } = renderHook(() =>
      useEarnSectionLendingMarkets({ enabled: true }),
    );

    expect(result.current.markets).toEqual([market]);
    expect(result.current.isLoading).toBe(false);
  });

  it('rejects manual refresh and exposes the request error', async () => {
    const requestError = new Error('Lending unavailable');
    mockRefreshLendingMarkets.mockRejectedValue(requestError);
    const { result } = renderHook(() =>
      useEarnSectionLendingMarkets({ enabled: true }),
    );
    let caughtError: unknown;

    await act(async () => {
      try {
        await result.current.refresh();
      } catch (error: unknown) {
        caughtError = error;
      }
    });

    expect(caughtError).toBe(requestError);
    expect(result.current.error).toBe(requestError);
  });
});
