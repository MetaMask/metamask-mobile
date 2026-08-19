import { act, renderHook } from '@testing-library/react-native';
import {
  usePredictMarketData,
  type UsePredictMarketDataOptions,
  type UsePredictMarketDataResult,
} from '../../../../UI/Predict/hooks/usePredictMarketData';
import { useSportsMarketsFeed } from './useSportsMarketsFeed';

jest.mock('../../../../UI/Predict/hooks/usePredictMarketData');

const mockUsePredictMarketData = jest.mocked(usePredictMarketData);

const createResult = (refetch: jest.Mock): UsePredictMarketDataResult => ({
  marketData: [],
  isFetching: false,
  isFetchingMore: false,
  error: null,
  hasMore: false,
  refetch: refetch as unknown as () => Promise<void>,
  fetchMore: jest.fn().mockResolvedValue(undefined),
});

describe('useSportsMarketsFeed', () => {
  const refetchBySport: Record<string, jest.Mock> = {};

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(refetchBySport).forEach((k) => delete refetchBySport[k]);

    mockUsePredictMarketData.mockImplementation(
      (opts?: UsePredictMarketDataOptions) => {
        const customQueryParams = opts?.customQueryParams;
        const key =
          customQueryParams === 'tag_id=100350'
            ? 'soccer'
            : customQueryParams === 'tag_id=28'
              ? 'basketball'
              : 'tennis';
        if (!refetchBySport[key]) {
          refetchBySport[key] = jest.fn().mockResolvedValue(undefined);
        }
        return createResult(refetchBySport[key]);
      },
    );
  });

  it('exposes three sport pills and defaults to soccer', () => {
    const { result } = renderHook(() => useSportsMarketsFeed());

    expect(result.current.pills).toHaveLength(3);
    expect(result.current.pills.map((p) => p.key)).toEqual([
      'soccer',
      'basketball',
      'tennis',
    ]);
    expect(result.current.activeKey).toBe('soccer');
  });

  it('select loads an additional sport and refetch calls all loaded feeds', async () => {
    const { result } = renderHook(() => useSportsMarketsFeed());

    await act(async () => {
      await result.current.refetch();
    });
    expect(refetchBySport.soccer).toHaveBeenCalledTimes(1);
    expect(refetchBySport.basketball).not.toHaveBeenCalled();

    act(() => {
      result.current.select('basketball');
    });
    expect(result.current.activeKey).toBe('basketball');

    await act(async () => {
      await result.current.refetch();
    });
    expect(refetchBySport.soccer).toHaveBeenCalledTimes(2);
    expect(refetchBySport.basketball).toHaveBeenCalledTimes(1);
  });
});
