import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardHomeData } from './useCardHomeData';
import Engine from '../../../../core/Engine';

const mockFetchCardHomeData = jest.fn();

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../../../../core/Engine', () => ({
  context: {
    CardController: {
      fetchCardHomeData: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// useCardHomeData calls useSelector twice: once for data, once for status.
// We set up the mock to return different values based on call order.
function setupSelectors(
  data: unknown,
  status: 'idle' | 'loading' | 'success' | 'error',
) {
  let callCount = 0;
  mockUseSelector.mockImplementation(() => {
    callCount++;
    // First call is selectCardHomeData, second is selectCardHomeDataStatus
    return callCount % 2 === 1 ? data : status;
  });
}

describe('useCardHomeData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.CardController.fetchCardHomeData as jest.Mock) =
      mockFetchCardHomeData;
    mockFetchCardHomeData.mockResolvedValue(undefined);
  });

  describe('useEffect safety-net fetch on mount', () => {
    it("triggers fetchCardHomeData when status is 'idle'", () => {
      setupSelectors(null, 'idle');
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
    });

    it("does NOT trigger fetchCardHomeData when status is 'loading'", () => {
      setupSelectors(null, 'loading');
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    });

    it("does NOT trigger fetchCardHomeData when status is 'success'", () => {
      setupSelectors({ primaryAsset: null }, 'success');
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    });

    it("does NOT trigger fetchCardHomeData when status is 'error'", () => {
      setupSelectors(null, 'error');
      renderHook(() => useCardHomeData());
      expect(mockFetchCardHomeData).not.toHaveBeenCalled();
    });
  });

  describe('isLoading', () => {
    it("is true when status is 'idle'", () => {
      setupSelectors(null, 'idle');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isLoading).toBe(true);
    });

    it("is true when status is 'loading'", () => {
      setupSelectors(null, 'loading');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isLoading).toBe(true);
    });

    it("is false when status is 'success'", () => {
      setupSelectors({ primaryAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isLoading).toBe(false);
    });

    it("is false when status is 'error'", () => {
      setupSelectors(null, 'error');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('isError', () => {
    it("is true when status is 'error'", () => {
      setupSelectors(null, 'error');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isError).toBe(true);
    });

    it("is false when status is 'success'", () => {
      setupSelectors({ primaryAsset: null }, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isError).toBe(false);
    });

    it("is false when status is 'idle'", () => {
      setupSelectors(null, 'idle');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.isError).toBe(false);
    });
  });

  describe('data', () => {
    it('reflects the value from selectCardHomeData', () => {
      const mockData = { primaryAsset: null, assets: [], card: null };
      setupSelectors(mockData, 'success');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.data).toStrictEqual(mockData);
    });

    it('is null when no data is loaded', () => {
      setupSelectors(null, 'idle');
      const { result } = renderHook(() => useCardHomeData());
      expect(result.current.data).toBeNull();
    });
  });

  describe('refetch', () => {
    it('calls Engine.context.CardController.fetchCardHomeData', () => {
      setupSelectors(null, 'success');
      const { result } = renderHook(() => useCardHomeData());

      result.current.refetch();

      expect(mockFetchCardHomeData).toHaveBeenCalledTimes(1);
    });
  });
});
