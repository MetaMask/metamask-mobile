import { renderHook } from '@testing-library/react-native';
import { useDepositUser } from './useDepositUser';
import { createMockSDKReturn, MOCK_US_REGION } from '../testUtils/constants';
import { DepositSdkMethodQuery } from '../hooks/useDepositSdkMethod';
import { NativeRampsSdk } from '@consensys/native-ramps-sdk';
import type { AxiosError } from 'axios';

const mockUseDepositSdkMethod = jest.fn();
jest.mock('./useDepositSdkMethod', () => ({
  useDepositSdkMethod: (config: DepositSdkMethodQuery<keyof NativeRampsSdk>) =>
    mockUseDepositSdkMethod(config),
}));

const mockLogoutFromProvider = jest.fn();
const mockUseDepositSDK = jest.fn();
jest.mock('../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => () => mockTrackEvent);

describe('useDepositUser', () => {
  const mockFetchUserDetails = jest.fn();
  const mockUserDetails = {
    firstName: 'John',
    lastName: 'Doe',
    mobileNumber: '+1234567890',
    dob: '1990-01-01',
    address: {
      addressLine1: '123 Main St',
      addressLine2: 'Apt 1',
      city: 'New York',
      state: 'NY',
      postCode: '10001',
      countryCode: 'US',
    },
  };

  const setupMockSdkMethod = (overrides?: {
    data?: unknown;
    error?: string | null;
    isFetching?: boolean;
  }) => {
    mockUseDepositSdkMethod.mockImplementation(() => [
      {
        data: overrides?.data ?? null,
        error: overrides?.error ?? null,
        isFetching: overrides?.isFetching ?? false,
      },
      mockFetchUserDetails,
    ]);
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogoutFromProvider.mockResolvedValue(undefined);

    mockUseDepositSDK.mockReturnValue(
      createMockSDKReturn({
        isAuthenticated: false,
        logoutFromProvider: mockLogoutFromProvider,
        selectedRegion: MOCK_US_REGION,
      }),
    );

    setupMockSdkMethod();
  });

  describe('basic functionality', () => {
    it('returns user details when authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toEqual(mockUserDetails);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    it('returns null user details when not authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: false,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toBeNull();
    });

    it('calls useDepositSdkMethod with correct parameters', () => {
      renderHook(() => useDepositUser());

      expect(mockUseDepositSdkMethod).toHaveBeenCalledWith({
        method: 'getUserDetails',
        onMount: false,
        throws: true,
      });
    });

    it('returns fetchUserDetails function', () => {
      const { result } = renderHook(() => useDepositUser());

      expect(result.current.fetchUserDetails).toBeDefined();
      expect(typeof result.current.fetchUserDetails).toBe('function');
    });
  });
  describe('authentication-based fetching', () => {
    it('fetches user details when authenticated and no user details exist', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      setupMockSdkMethod();

      renderHook(() => useDepositUser({ fetchOnMount: true }));

      expect(mockFetchUserDetails).toHaveBeenCalled();
    });

    it('does not fetch user details when not authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: false,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      setupMockSdkMethod({ data: mockUserDetails });

      renderHook(() => useDepositUser());

      expect(mockFetchUserDetails).not.toHaveBeenCalled();
    });

    it('does not fetch user details when already exists', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      setupMockSdkMethod({ data: mockUserDetails });

      renderHook(() => useDepositUser());

      expect(mockFetchUserDetails).not.toHaveBeenCalled();
    });

    it('does not fetch user details when already fetching', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      setupMockSdkMethod({ isFetching: true });

      renderHook(() => useDepositUser());

      expect(mockFetchUserDetails).not.toHaveBeenCalled();
    });

    it('does not fetch user details when there is an error', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      setupMockSdkMethod({ error: 'Some error' });

      renderHook(() => useDepositUser());

      expect(mockFetchUserDetails).not.toHaveBeenCalled();
    });
  });

  describe('loading and error states', () => {
    it('returns loading state when fetching', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      setupMockSdkMethod({ isFetching: true });

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toBeNull();
      expect(result.current.isFetching).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('returns error state when API fails', () => {
      const mockError = 'Failed to fetch user details';

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      setupMockSdkMethod({ error: mockError });

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toBeNull();
      expect(result.current.error).toBe(mockError);
      expect(result.current.isFetching).toBe(false);
    });

    it('handles multiple hook renders correctly', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      setupMockSdkMethod();

      const { rerender } = renderHook(() =>
        useDepositUser({ fetchOnMount: true }),
      );
      rerender({});
      rerender({});

      expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('config options', () => {
    it('fetches user details on mount when fetchOnMount is enabled', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      setupMockSdkMethod();

      renderHook(() => useDepositUser({ fetchOnMount: true }));

      expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);
    });

    it('does not fetch on mount when fetchOnMount is disabled', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      setupMockSdkMethod();

      renderHook(() => useDepositUser({ fetchOnMount: false }));

      expect(mockFetchUserDetails).not.toHaveBeenCalled();
    });

    it('does not fetch on mount when not authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: false,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      setupMockSdkMethod();

      renderHook(() => useDepositUser({ fetchOnMount: true }));

      expect(mockFetchUserDetails).not.toHaveBeenCalled();
    });
  });

  describe('analytics tracking', () => {
    it('tracks RAMPS_USER_DETAILS_FETCHED when shouldTrackFetch is enabled', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() =>
        useDepositUser({
          shouldTrackFetch: true,
          screenLocation: 'TestScreen',
        }),
      );

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_USER_DETAILS_FETCHED',
        {
          logged_in: true,
          region: 'US',
          location: 'TestScreen',
        },
      );
    });

    it('does not track analytics when shouldTrackFetch is disabled', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      setupMockSdkMethod();

      const { result } = renderHook(() =>
        useDepositUser({
          shouldTrackFetch: false,
        }),
      );

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('uses selectedRegion isoCode when userDetails has no country', async () => {
      const userDetailsWithoutAddress = {
        firstName: 'John',
        lastName: 'Doe',
      };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      mockFetchUserDetails.mockResolvedValue(userDetailsWithoutAddress);
      setupMockSdkMethod({ data: userDetailsWithoutAddress });

      const { result } = renderHook(() =>
        useDepositUser({
          shouldTrackFetch: true,
          screenLocation: 'TestScreen',
        }),
      );

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_USER_DETAILS_FETCHED',
        {
          logged_in: true,
          region: 'US',
          location: 'TestScreen',
        },
      );
    });
  });

  describe('error handling', () => {
    it('logs out when receiving 401 error', async () => {
      const error401 = Object.assign(new Error('Unauthorized'), {
        status: 401,
      }) as AxiosError;

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      mockFetchUserDetails.mockRejectedValue(error401);
      setupMockSdkMethod();

      const { result } = renderHook(() => useDepositUser());

      await result.current.fetchUserDetails();

      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
    });

    it('throws error without logging out for non-401 errors', async () => {
      const networkError = Object.assign(new Error('Network error'), {
        status: 500,
      }) as AxiosError;

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          selectedRegion: MOCK_US_REGION,
        }),
      );
      mockFetchUserDetails.mockRejectedValue(networkError);
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() => useDepositUser());

      await expect(result.current.fetchUserDetails()).rejects.toThrow(
        'Network error',
      );

      expect(mockLogoutFromProvider).not.toHaveBeenCalled();
    });
  });
});
