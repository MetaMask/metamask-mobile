import { renderHook, act } from '@testing-library/react-hooks';
import { useCardSDK } from '../sdk';
import useRegistrationSettings from './useRegistrationSettings';
import { CardSDK } from '../sdk/CardSDK';

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockRefetch = jest.fn();
let mockQueryFn: (() => Promise<unknown>) | undefined;
let mockQueryReturn: {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
  refetch: jest.Mock;
} = {
  data: undefined,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockImplementation(({ queryFn }) => {
    mockQueryFn = queryFn;
    return mockQueryReturn;
  }),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

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

  beforeEach(() => {
    jest.clearAllMocks();

    mockQueryReturn = {
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };

    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });

    mockGetRegistrationSettings.mockResolvedValue(
      mockRegistrationSettingsResponse,
    );

    mockRefetch.mockResolvedValue({ data: null });
  });

  describe('hook initialization', () => {
    it('initializes with useQuery using correct query key', () => {
      const { useQuery: mockUseQuery } = jest.requireMock(
        '@tanstack/react-query',
      );

      renderHook(() => useRegistrationSettings());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['card', 'dashboard', 'registrationSettings'],
          staleTime: 5 * 60 * 1000,
        }),
      );
    });

    it('disables query when SDK is not available', () => {
      const { useQuery: mockUseQuery } = jest.requireMock(
        '@tanstack/react-query',
      );

      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useRegistrationSettings());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });

    it('enables query when SDK is available', () => {
      const { useQuery: mockUseQuery } = jest.requireMock(
        '@tanstack/react-query',
      );

      renderHook(() => useRegistrationSettings());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        }),
      );
    });
  });

  describe('queryFn behavior', () => {
    it('returns registration settings data when SDK call succeeds', async () => {
      renderHook(() => useRegistrationSettings());

      expect(mockQueryFn).toBeDefined();
      const fetchResult = await mockQueryFn?.();

      expect(fetchResult).toEqual(mockRegistrationSettingsResponse);
      expect(mockGetRegistrationSettings).toHaveBeenCalled();
    });

    it('throws error when SDK is not available', () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useRegistrationSettings());

      expect(mockQueryFn).toBeDefined();
      expect(() => mockQueryFn?.()).toThrow('SDK not initialized');
    });

    it('propagates SDK errors', async () => {
      const sdkError = new Error('SDK error');
      mockGetRegistrationSettings.mockRejectedValue(sdkError);

      renderHook(() => useRegistrationSettings());

      expect(mockQueryFn).toBeDefined();
      await expect(mockQueryFn?.()).rejects.toThrow('SDK error');
    });
  });

  describe('return value', () => {
    it('returns data from useQuery', () => {
      mockQueryReturn = {
        data: mockRegistrationSettingsResponse,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      };

      const { result } = renderHook(() => useRegistrationSettings());

      expect(result.current.data).toEqual(mockRegistrationSettingsResponse);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.fetchData).toBe('function');
    });

    it('returns loading state from useQuery', () => {
      mockQueryReturn = {
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      };

      const { result } = renderHook(() => useRegistrationSettings());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeNull();
    });

    it('returns error state from useQuery', () => {
      mockQueryReturn = {
        data: undefined,
        isLoading: false,
        error: new Error('Registration settings error'),
        refetch: mockRefetch,
      };

      const { result } = renderHook(() => useRegistrationSettings());

      expect(result.current.error).toEqual(
        new Error('Registration settings error'),
      );
      expect(result.current.data).toBeNull();
    });

    it('provides fetchData function that calls refetch', async () => {
      mockRefetch.mockResolvedValue({
        data: mockRegistrationSettingsResponse,
      });

      const { result } = renderHook(() => useRegistrationSettings());

      let fetchResult: unknown;
      await act(async () => {
        fetchResult = await result.current.fetchData();
      });

      expect(mockRefetch).toHaveBeenCalled();
      expect(fetchResult).toEqual(mockRegistrationSettingsResponse);
    });

    it('returns null from fetchData when refetch returns no data', async () => {
      mockRefetch.mockResolvedValue({ data: undefined });

      const { result } = renderHook(() => useRegistrationSettings());

      let fetchResult: unknown;
      await act(async () => {
        fetchResult = await result.current.fetchData();
      });

      expect(fetchResult).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles undefined SDK gracefully', () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useRegistrationSettings());

      expect(mockQueryFn).toBeDefined();
      expect(() => mockQueryFn?.()).toThrow('SDK not initialized');
    });

    it('handles null registration settings response', async () => {
      mockGetRegistrationSettings.mockResolvedValue(null);

      renderHook(() => useRegistrationSettings());

      expect(mockQueryFn).toBeDefined();
      const result = await mockQueryFn?.();

      expect(result).toBeNull();
    });

    it('handles empty registration settings response', async () => {
      const emptyResponse = {};
      mockGetRegistrationSettings.mockResolvedValue(emptyResponse);

      renderHook(() => useRegistrationSettings());

      expect(mockQueryFn).toBeDefined();
      const result = await mockQueryFn?.();

      expect(result).toEqual(emptyResponse);
    });
  });

  describe('caching behavior', () => {
    it('uses correct staleTime configuration', () => {
      const { useQuery: mockUseQuery } = jest.requireMock(
        '@tanstack/react-query',
      );

      renderHook(() => useRegistrationSettings());

      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: 5 * 60 * 1000,
        }),
      );
    });
  });
});
