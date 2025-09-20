import { renderHook } from '@testing-library/react-hooks';
import { useRegions } from './useRegions';
import { useDepositSdkMethod } from './useDepositSdkMethod';

// Mock the useDepositSdkMethod hook
jest.mock('./useDepositSdkMethod');
const mockUseDepositSdkMethod = useDepositSdkMethod as jest.MockedFunction<
  typeof useDepositSdkMethod
>;

describe('useRegions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return SDK regions when available', () => {
    const mockSdkRegions = [
      {
        isoCode: 'US',
        flag: '🇺🇸',
        name: 'United States',
        phone: {
          prefix: '+1',
          placeholder: '123-456-7890',
          template: 'XXX-XXX-XXXX',
        },
        currency: 'USD',
        supported: true,
        recommended: true,
      },
    ];

    mockUseDepositSdkMethod.mockReturnValue([
      {
        data: mockSdkRegions,
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);

    const { result } = renderHook(() => useRegions());

    expect(result.current.regions).toEqual(mockSdkRegions);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should return empty array when SDK data is not available', () => {
    mockUseDepositSdkMethod.mockReturnValue([
      {
        data: null,
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);

    const { result } = renderHook(() => useRegions());

    expect(result.current.regions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should return empty array when SDK returns empty array', () => {
    mockUseDepositSdkMethod.mockReturnValue([
      {
        data: [],
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);

    const { result } = renderHook(() => useRegions());

    expect(result.current.regions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should show loading state when SDK is fetching', () => {
    mockUseDepositSdkMethod.mockReturnValue([
      {
        data: null,
        error: null,
        isFetching: true,
      },
      jest.fn(),
    ]);

    const { result } = renderHook(() => useRegions());

    expect(result.current.regions).toEqual([]);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should return error and empty array when SDK fails', () => {
    const errorMessage = 'SDK fetch failed';
    mockUseDepositSdkMethod.mockReturnValue([
      {
        data: null,
        error: errorMessage,
        isFetching: false,
      },
      jest.fn(),
    ]);

    const { result } = renderHook(() => useRegions());

    expect(result.current.regions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should handle non-array SDK response gracefully', () => {
    mockUseDepositSdkMethod.mockReturnValue([
      {
        data: 'invalid-response' as unknown,
        error: null,
        isFetching: false,
      },
      jest.fn(),
    ]);

    const { result } = renderHook(() => useRegions());

    expect(result.current.regions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });
});
