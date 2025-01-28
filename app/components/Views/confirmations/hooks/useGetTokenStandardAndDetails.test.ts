import { renderHook } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { memoizedGetTokenStandardAndDetails } from '../utils/token';
import { useGetTokenStandardAndDetails } from './useGetTokenStandardAndDetails';

const mockAddress = '0x123';
const mockChainId = '1';

jest.mock('../../../../core/Engine', () => ({
  context: {
    AssetsContractController: {
      getTokenStandardAndDetails: jest.fn(),
    },
  },
}));

describe('useGetTokenStandardAndDetails', () => {

  afterEach(() => {
    jest.clearAllMocks();

    /** Reset memoized function using getTokenStandardAndDetails for each test */
    memoizedGetTokenStandardAndDetails?.cache?.clear?.();
  });

  it('returns initial state when address or chainId is not provided', () => {
    const { result } = renderHook(() => useGetTokenStandardAndDetails(undefined, undefined));

    expect(result.current).toEqual({
      details: { decimalsNumber: undefined },
      isPending: false,
    });
  });

  it('fetches token standard and details successfully and with decimalsNumber prop', async () => {
    const mockDetails = {
      decimals: 18,
      symbol: 'TEST',
      standard: 'ERC20',
    };

    (Engine.context.AssetsContractController.getTokenStandardAndDetails as jest.Mock).mockResolvedValueOnce(
      mockDetails,
    );

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetTokenStandardAndDetails(mockAddress, mockChainId),
    );

    expect(result.current.isPending).toBe(true);

    await waitForNextUpdate();

    expect(result.current).toEqual({
      details: { ...mockDetails, decimalsNumber: 18 },
      isPending: false,
    });

    expect(Engine.context.AssetsContractController.getTokenStandardAndDetails).toHaveBeenCalledWith(
      mockAddress,
      undefined,
      undefined,
      mockChainId,
    );
  });

  it('should handle loading state and errors during fetch', async () => {
    const mockError = new Error('Failed to fetch token details');

    (Engine.context.AssetsContractController.getTokenStandardAndDetails as jest.Mock).mockRejectedValueOnce(
      mockError,
    );

    const { result, waitForNextUpdate } = renderHook(() =>
      useGetTokenStandardAndDetails(mockAddress, mockChainId),
    );

    expect(result.current.isPending).toBe(true);

    await waitForNextUpdate();

    expect(result.current).toEqual({
      details: { decimalsNumber: undefined },
      isPending: false,
    });
  });
});
