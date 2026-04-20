import { renderHook, act } from '@testing-library/react-hooks';
import { ChainId } from '@metamask/stake-sdk';
import useTronStakeApy from './useTronStakeApy';
import { tronStakingApiService } from '../../Stake/sdk/stakeSdkProvider';

jest.mock('../../Stake/sdk/stakeSdkProvider', () => ({
  tronStakingApiService: {
    getWitnesses: jest.fn(),
  },
}));

const mockGetWitnesses =
  tronStakingApiService.getWitnesses as jest.MockedFunction<
    typeof tronStakingApiService.getWitnesses
  >;

const CONSENSYS_MAINNET_ADDRESS = 'TVMwGfdDz58VvM7yTzGMWWSHsmofSxa9jH';
const CONSENSYS_NILE_ADDRESS = 'TBSX9dpxbNrsLgTADXtkC2ASmxW4Q2mTgY';

const createMockWitnessData = (overrides = {}) => ({
  address: CONSENSYS_MAINNET_ADDRESS,
  annualizedRate: '4.56',
  name: 'Consensys',
  url: 'https://consensys.io',
  producer: true,
  latestBlockNumber: 12345678,
  latestSlotNumber: 87654321,
  missedTotal: 0,
  producedTotal: 1000,
  producedTrx: 5000,
  votes: 100000000,
  votesPercentage: 0.5,
  changeVotes: 1000,
  lastCycleVotes: 99000000,
  realTimeVotes: 100500000,
  brokerage: 20,
  voterBrokerage: 80,
  producePercentage: 100,
  version: 1,
  witnessType: 1,
  index: 0,
  totalOutOfTimeTrans: 0,
  lastWeekOutOfTimeTrans: 0,
  changedBrokerage: false,
  lowestBrokerage: 20,
  ranking: 1,
  ...overrides,
});

const createMockWitnessesResponse = (
  witnesses = [createMockWitnessData()],
) => ({
  total: witnesses.length,
  data: witnesses,
});

describe('useTronStakeApy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization and fetching', () => {
    it('fetches Consensys witness data on mount by default', async () => {
      mockGetWitnesses.mockResolvedValue(createMockWitnessesResponse());

      const { waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(mockGetWitnesses).toHaveBeenCalledTimes(1);
    });

    it('does not fetch on mount when fetchOnMount is false', () => {
      mockGetWitnesses.mockResolvedValue(createMockWitnessesResponse());

      renderHook(() => useTronStakeApy({ fetchOnMount: false }));

      expect(mockGetWitnesses).not.toHaveBeenCalled();
    });

    it('uses TRON_MAINNET chainId by default', async () => {
      mockGetWitnesses.mockResolvedValue(createMockWitnessesResponse());

      const { waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(mockGetWitnesses).toHaveBeenCalledWith(ChainId.TRON_MAINNET);
    });

    it('uses specified chainId when provided', async () => {
      const nileWitness = createMockWitnessData({
        address: CONSENSYS_NILE_ADDRESS,
      });
      mockGetWitnesses.mockResolvedValue(
        createMockWitnessesResponse([nileWitness]),
      );

      const { waitForNextUpdate } = renderHook(() =>
        useTronStakeApy({ chainId: ChainId.TRON_NILE }),
      );

      await waitForNextUpdate();

      expect(mockGetWitnesses).toHaveBeenCalledWith(ChainId.TRON_NILE);
    });
  });

  describe('APY data extraction', () => {
    it('sets apyDecimal from witness annualizedRate', async () => {
      const witness = createMockWitnessData({ annualizedRate: '5.25' });
      mockGetWitnesses.mockResolvedValue(
        createMockWitnessesResponse([witness]),
      );

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.apyDecimal).toBe('5.25');
    });

    it('sets apyPercent with truncated rate and percent symbol', async () => {
      const witness = createMockWitnessData({ annualizedRate: '4.56789' });
      mockGetWitnesses.mockResolvedValue(
        createMockWitnessesResponse([witness]),
      );

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.apyPercent).toBe('4.56%');
    });

    it('returns null APY values when Consensys witness not found', async () => {
      const otherWitness = createMockWitnessData({
        address: 'TDifferentAddress12345',
      });
      mockGetWitnesses.mockResolvedValue(
        createMockWitnessesResponse([otherWitness]),
      );

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.apyDecimal).toBeNull();
      expect(result.current.apyPercent).toBeNull();
    });

    it('returns null APY values when witnesses data is empty', async () => {
      mockGetWitnesses.mockResolvedValue(createMockWitnessesResponse([]));

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.apyDecimal).toBeNull();
      expect(result.current.apyPercent).toBeNull();
    });
  });

  describe('error handling', () => {
    it('sets errorMessage from Error.message when API throws Error', async () => {
      const errorMessage = 'Network request failed';
      mockGetWitnesses.mockRejectedValue(new Error(errorMessage));

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.errorMessage).toBe(errorMessage);
    });

    it('sets errorMessage to default when non-Error is thrown', async () => {
      mockGetWitnesses.mockRejectedValue('string error');

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.errorMessage).toBe('Unknown error occurred');
    });

    it('clears APY values when error occurs', async () => {
      mockGetWitnesses.mockRejectedValue(new Error('API Error'));

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.apyDecimal).toBeNull();
      expect(result.current.apyPercent).toBeNull();
    });
  });

  describe('loading state', () => {
    it('sets isLoading true during fetch', async () => {
      let resolvePromise: (
        value: ReturnType<typeof createMockWitnessesResponse>,
      ) => void = () => undefined;
      const pendingPromise = new Promise<
        ReturnType<typeof createMockWitnessesResponse>
      >((resolve) => {
        resolvePromise = resolve;
      });
      mockGetWitnesses.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useTronStakeApy());

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise(createMockWitnessesResponse());
      });
    });

    it('sets isLoading false after successful fetch', async () => {
      mockGetWitnesses.mockResolvedValue(createMockWitnessesResponse());

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.isLoading).toBe(false);
    });

    it('sets isLoading false after failed fetch', async () => {
      mockGetWitnesses.mockRejectedValue(new Error('API Error'));

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refetch', () => {
    it('clears APY values before refetching', async () => {
      mockGetWitnesses.mockResolvedValue(createMockWitnessesResponse());

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.apyDecimal).toBe('4.56');

      let resolveSecondCall: (
        value: ReturnType<typeof createMockWitnessesResponse>,
      ) => void = () => undefined;
      const pendingPromise = new Promise<
        ReturnType<typeof createMockWitnessesResponse>
      >((resolve) => {
        resolveSecondCall = resolve;
      });
      mockGetWitnesses.mockReturnValue(pendingPromise);

      act(() => {
        result.current.refetch();
      });

      expect(result.current.apyDecimal).toBeNull();
      expect(result.current.apyPercent).toBeNull();

      await act(async () => {
        resolveSecondCall(createMockWitnessesResponse());
      });
    });

    it('clears errorMessage before refetching', async () => {
      mockGetWitnesses.mockRejectedValue(new Error('Initial error'));

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(result.current.errorMessage).toBe('Initial error');

      mockGetWitnesses.mockResolvedValue(createMockWitnessesResponse());

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.errorMessage).toBeNull();
    });

    it('triggers new API call', async () => {
      mockGetWitnesses.mockResolvedValue(createMockWitnessesResponse());

      const { result, waitForNextUpdate } = renderHook(() => useTronStakeApy());

      await waitForNextUpdate();

      expect(mockGetWitnesses).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetWitnesses).toHaveBeenCalledTimes(2);
    });
  });
});
