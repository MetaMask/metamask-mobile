import { renderHook } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import useRegistrationSettings from './useRegistrationSettings';
import { useWrapWithCache } from './useWrapWithCache';
import { CardLocation } from '../types';
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
    error: false,
    fetchData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks
    mockUseCardSDK.mockReturnValue({
      sdk: mockSDK,
      isLoading: false,
      logoutFromProvider: jest.fn(),
      userCardLocation: 'international',
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
        'registration-settings-international',
        expect.any(Function),
        { cacheDuration: 5 * 60 * 1000 },
      );
    });

    it('should initialize with provided location', () => {
      renderHook(() => useRegistrationSettings('us'));

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        'registration-settings-us',
        expect.any(Function),
        { cacheDuration: 5 * 60 * 1000 },
      );
    });

    it('should use correct cache key for international location', () => {
      renderHook(() => useRegistrationSettings('international'));

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        'registration-settings-international',
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
    it('should call SDK getRegistrationSettings with correct location', async () => {
      const location: CardLocation = 'us';
      renderHook(() => useRegistrationSettings(location));

      // Get the fetch function passed to useWrapWithCache
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      await fetchFunction();

      expect(mockGetRegistrationSettings).toHaveBeenCalledWith(location);
    });

    it('should call SDK getRegistrationSettings with international location by default', async () => {
      renderHook(() => useRegistrationSettings());

      // Get the fetch function passed to useWrapWithCache
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      await fetchFunction();

      expect(mockGetRegistrationSettings).toHaveBeenCalledWith('international');
    });

    it('should return registration settings data when SDK call succeeds', async () => {
      renderHook(() => useRegistrationSettings());

      // Get the fetch function passed to useWrapWithCache
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      const result = await fetchFunction();

      expect(result).toEqual(mockRegistrationSettingsResponse);
    });

    it('should throw error when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        logoutFromProvider: jest.fn(),
        userCardLocation: 'international',
      });

      renderHook(() => useRegistrationSettings());

      // Get the fetch function passed to useWrapWithCache
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      await expect(fetchFunction()).rejects.toThrow('Card SDK not available');
    });

    it('should propagate SDK errors', async () => {
      const sdkError = new Error('SDK error');
      mockGetRegistrationSettings.mockRejectedValue(sdkError);

      renderHook(() => useRegistrationSettings());

      // Get the fetch function passed to useWrapWithCache
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      await expect(fetchFunction()).rejects.toThrow('SDK error');
    });
  });

  describe('return value', () => {
    it('should return the result from useWrapWithCache', () => {
      const mockReturn = {
        data: mockRegistrationSettingsResponse,
        isLoading: false,
        error: false,
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
        error: false,
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
        error: true,
        fetchData: jest.fn(),
      };
      mockUseWrapWithCache.mockReturnValue(mockReturn);

      const { result } = renderHook(() => useRegistrationSettings());

      expect(result.current.error).toBe(true);
      expect(result.current.data).toBeNull();
    });

    it('should provide fetchData function from useWrapWithCache', () => {
      const mockFetchData = jest.fn();
      const mockReturn = {
        data: null,
        isLoading: false,
        error: false,
        fetchData: mockFetchData,
      };
      mockUseWrapWithCache.mockReturnValue(mockReturn);

      const { result } = renderHook(() => useRegistrationSettings());

      expect(result.current.fetchData).toBe(mockFetchData);
      expect(typeof result.current.fetchData).toBe('function');
    });
  });

  describe('location parameter variations', () => {
    it('should handle us location correctly', () => {
      renderHook(() => useRegistrationSettings('us'));

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        'registration-settings-us',
        expect.any(Function),
        { cacheDuration: 5 * 60 * 1000 },
      );
    });

    it('should handle international location correctly', () => {
      renderHook(() => useRegistrationSettings('international'));

      expect(mockUseWrapWithCache).toHaveBeenCalledWith(
        'registration-settings-international',
        expect.any(Function),
        { cacheDuration: 5 * 60 * 1000 },
      );
    });

    it('should create different cache keys for different locations', () => {
      const { unmount: unmount1 } = renderHook(() =>
        useRegistrationSettings('us'),
      );
      unmount1();

      const { unmount: unmount2 } = renderHook(() =>
        useRegistrationSettings('international'),
      );
      unmount2();

      expect(mockUseWrapWithCache).toHaveBeenNthCalledWith(
        1,
        'registration-settings-us',
        expect.any(Function),
        { cacheDuration: 5 * 60 * 1000 },
      );

      expect(mockUseWrapWithCache).toHaveBeenNthCalledWith(
        2,
        'registration-settings-international',
        expect.any(Function),
        { cacheDuration: 5 * 60 * 1000 },
      );
    });
  });

  describe('edge cases', () => {
    it('should handle undefined SDK gracefully', async () => {
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        logoutFromProvider: jest.fn(),
        userCardLocation: 'international',
      });

      renderHook(() => useRegistrationSettings());

      // Get the fetch function passed to useWrapWithCache
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      await expect(fetchFunction()).rejects.toThrow('Card SDK not available');
    });

    it('should handle null registration settings response', async () => {
      mockGetRegistrationSettings.mockResolvedValue(null);

      renderHook(() => useRegistrationSettings());

      // Get the fetch function passed to useWrapWithCache
      const fetchFunction = mockUseWrapWithCache.mock.calls[0][1];

      const result = await fetchFunction();

      expect(result).toBeNull();
    });

    it('should handle empty registration settings response', async () => {
      const emptyResponse = {};
      mockGetRegistrationSettings.mockResolvedValue(emptyResponse);

      renderHook(() => useRegistrationSettings());

      // Get the fetch function passed to useWrapWithCache
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

    it('should create unique cache keys for different hook instances', () => {
      const { unmount: unmount1 } = renderHook(() =>
        useRegistrationSettings('us'),
      );
      const { unmount: unmount2 } = renderHook(() =>
        useRegistrationSettings('international'),
      );

      unmount1();
      unmount2();

      expect(mockUseWrapWithCache).toHaveBeenCalledTimes(2);

      const firstCall = mockUseWrapWithCache.mock.calls[0];
      const secondCall = mockUseWrapWithCache.mock.calls[1];

      expect(firstCall[0]).not.toEqual(secondCall[0]); // Different cache keys
    });
  });
});
