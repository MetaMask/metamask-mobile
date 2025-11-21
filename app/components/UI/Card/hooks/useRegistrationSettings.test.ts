import { renderHook } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import useRegistrationSettings from './useRegistrationSettings';
import { useWrapWithCache } from './useWrapWithCache';
import { CardSDK } from '../sdk/CardSDK';

// Mock dependencies
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('./useWrapWithCache', () => ({
  useWrapWithCache: jest.fn(),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseWrapWithCache = useWrapWithCache as jest.MockedFunction<
  typeof useWrapWithCache
>;

describe('useRegistrationSettings', () => {
  const mockGetRegistrationSettings = jest.fn();

  const mockSDK = {
    getRegistrationSettings: mockGetRegistrationSettings,
  } as unknown as CardSDK;

  const mockRegistrationSettingsResponse = {
    requiredFields: ['firstName', 'lastName', 'email'],
    optionalFields: ['phoneNumber'],
    termsAndConditionsUrl: 'https://example.com/terms',
    privacyPolicyUrl: 'https://example.com/privacy',
  };

  const mockCacheReturn = {
    data: null,
    isLoading: false,
    error: null,
    fetchData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });

    mockUseWrapWithCache.mockReturnValue(mockCacheReturn);
    mockGetRegistrationSettings.mockResolvedValue(
      mockRegistrationSettingsResponse,
    );
  });

  describe('hook initialization', () => {
    it('should initialize with default location when no location provided', () => {
      renderHook(() => useRegistrationSettings());

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        'registration-settings',
        expect.any(Function),
        { cacheDuration: 5 * 60 * 1000 },
      );
    });

    it('should set cache duration to 5 minutes', () => {
      renderHook(() => useRegistrationSettings());

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        { cacheDuration: 5 * 60 * 1000 },
      );
    });
  });

  describe('fetchRegistrationSettings function', () => {
    it('should return registration settings data when SDK call succeeds', async () => {
      renderHook(() => useRegistrationSettings());

      // Get the fetch function from the mock call
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];
      const fetchResult = await fetchFunction();

      expect(fetchResult).toEqual(mockRegistrationSettingsResponse);
      expect(mockGetRegistrationSettings).toHaveBeenCalled();
    });

    it('should throw error when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useRegistrationSettings());

      // Get the fetch function from the mock call
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      await expect(fetchFunction()).rejects.toThrow('Card SDK not available');
    });

    it('should propagate SDK errors', async () => {
      const sdkError = new Error('SDK error');
      mockGetRegistrationSettings.mockRejectedValue(sdkError);

      renderHook(() => useRegistrationSettings());

      // Get the fetch function from the mock call
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      await expect(fetchFunction()).rejects.toThrow('SDK error');
    });
  });

  describe('return value', () => {
    it('should return the result from useWrapWithCache', () => {
      const mockReturn = {
        data: mockRegistrationSettingsResponse,
        isLoading: false,
        error: null,
        fetchData: jest.fn(),
      };
      mockUseWrapWithCache.mockReturnValue(mockReturn);

      const { result } = renderHook(() => useRegistrationSettings());

      expect(result.current).toEqual(mockReturn);
    });

    it('should return loading state from useWrapWithCache', () => {
      const mockReturn = {
        data: null,
        isLoading: true,
        error: null,
        fetchData: jest.fn(),
      };
      mockUseWrapWithCache.mockReturnValue(mockReturn);

      const { result } = renderHook(() => useRegistrationSettings());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
    });

    it('should return error state from useWrapWithCache', () => {
      const mockReturn = {
        data: null,
        isLoading: false,
        error: new Error('Registration settings error'),
        fetchData: jest.fn(),
      };
      mockUseWrapWithCache.mockReturnValue(mockReturn);

      const { result } = renderHook(() => useRegistrationSettings());

      expect(result.current.error).toEqual(
        new Error('Registration settings error'),
      );
      expect(result.current.data).toBeNull();
    });

    it('should provide fetchData function from useWrapWithCache', () => {
      const mockFetchData = jest.fn();
      const mockReturn = {
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchData,
      };
      mockUseWrapWithCache.mockReturnValue(mockReturn);

      const { result } = renderHook(() => useRegistrationSettings());

      expect(result.current.fetchData).toBe(mockFetchData);
      expect(typeof result.current.fetchData).toBe('function');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined SDK gracefully', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useRegistrationSettings());

      // Get the fetch function from the mock call
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      await expect(fetchFunction()).rejects.toThrow('Card SDK not available');
    });

    it('should handle null registration settings response', async () => {
      mockGetRegistrationSettings.mockResolvedValue(null);

      renderHook(() => useRegistrationSettings());

      // Get the fetch function from the mock call
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      const result = await fetchFunction();

      expect(result).toBeNull();
    });

    it('should handle empty registration settings response', async () => {
      const emptyResponse = {};
      mockGetRegistrationSettings.mockResolvedValue(emptyResponse);

      renderHook(() => useRegistrationSettings());

      // Get the fetch function from the mock call
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      const result = await fetchFunction();

      expect(result).toEqual(emptyResponse);
    });
  });

  describe('caching behavior', () => {
    it('should use correct cache configuration', () => {
      renderHook(() => useRegistrationSettings());

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function),
        { cacheDuration: 5 * 60 * 1000 },
      );
    });
  });
});
