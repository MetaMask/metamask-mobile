import { renderHook } from '@testing-library/react-native';
import { useDepositUser } from './useDepositUser';
import { createMockSDKReturn } from '../testUtils/constants';
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
jest.mock('../../hooks/useAnalytics', () => ({
  trackEvent: jest.fn((...args) => mockTrackEvent(...args)),
}));

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
    mockUseDepositSdkMethod.mockImplementation((config) => {
      if (config.throws) {
        return [
          {
            data: overrides?.data ?? null,
            error: overrides?.error ?? null,
            isFetching: overrides?.isFetching ?? false,
          },
          mockFetchUserDetails,
        ];
      }
      return [
        {
          data: overrides?.data ?? null,
          error: overrides?.error ?? null,
          isFetching: overrides?.isFetching ?? false,
        },
        mockFetchUserDetails,
      ];
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogoutFromProvider.mockResolvedValue(undefined);

    mockUseDepositSDK.mockReturnValue(
      createMockSDKReturn({
        isAuthenticated: false,
        logoutFromProvider: mockLogoutFromProvider,
      }),
    );

    setupMockSdkMethod();
  });

  describe('basic functionality', () => {
    it('returns user details when authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
        }),
      );
      mockUseDepositSdkMethod.mockReturnValue([
        { data: mockUserDetails, error: null, isFetching: false },
        mockFetchUserDetails,
      ]);

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toEqual(mockUserDetails);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    it('returns null user details when not authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: false,
        }),
      );
      mockUseDepositSdkMethod.mockReturnValue([
        { data: mockUserDetails, error: null, isFetching: false },
        mockFetchUserDetails,
      ]);

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
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      setupMockSdkMethod();

      renderHook(() => useDepositUser());

      expect(mockFetchUserDetails).toHaveBeenCalled();
    });

    it('does not fetch user details when not authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: false,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );

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
          logoutFromProvider: mockLogoutFromProvider,
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
          logoutFromProvider: mockLogoutFromProvider,
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

      const { rerender } = renderHook(() => useDepositUser());
      rerender({});
      rerender({});

      expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchUserDetails', () => {
    it('returns user details when successful', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );

      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      setupMockSdkMethod();

      const { result } = renderHook(() => useDepositUser());

      const userDetails = await result.current.fetchUserDetails();

      expect(userDetails).toEqual(mockUserDetails);
      expect(mockFetchUserDetails).toHaveBeenCalled();
    });

    it('logs out but does not throw on 401 error', async () => {
      const error401 = Object.assign(new Error('Unauthorized'), {
        status: 401,
      }) as AxiosError;

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
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

  describe('analytics tracking', () => {
    beforeEach(() => {
      mockTrackEvent.mockClear();
    });

    it('tracks user details fetched event when shouldTrackFetch is true', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() =>
        useDepositUser({
          screenLocation: 'BuildQuote Screen',
          shouldTrackFetch: true,
        }),
      );

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_USER_DETAILS_FETCHED',
        {
          logged_in: true,
          region: 'US',
          location: 'BuildQuote Screen',
        },
      );
    });

    it('does not track event when shouldTrackFetch is false', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() =>
        useDepositUser({
          screenLocation: 'BuildQuote Screen',
          shouldTrackFetch: false,
        }),
      );

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does not track event when config is not provided', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() => useDepositUser());

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('uses selectedRegion when user details have no countryCode', async () => {
      const userDetailsWithoutCountry = {
        ...mockUserDetails,
        address: {
          ...mockUserDetails.address,
          countryCode: '',
        },
      };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          selectedRegion: { isoCode: 'CA', currency: 'CAD' },
        }),
      );
      mockFetchUserDetails.mockResolvedValue(userDetailsWithoutCountry);
      setupMockSdkMethod({ data: userDetailsWithoutCountry });

      const { result } = renderHook(() =>
        useDepositUser({
          screenLocation: 'EnterAddress Screen',
          shouldTrackFetch: true,
        }),
      );

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_USER_DETAILS_FETCHED',
        {
          logged_in: true,
          region: 'CA',
          location: 'EnterAddress Screen',
        },
      );
    });

    it('uses selectedRegion when user details have no address', async () => {
      const userDetailsWithoutAddress = {
        firstName: 'John',
        lastName: 'Doe',
        mobileNumber: '+1234567890',
        dob: '1990-01-01',
      };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          selectedRegion: { isoCode: 'GB', currency: 'GBP' },
        }),
      );
      mockFetchUserDetails.mockResolvedValue(userDetailsWithoutAddress);
      setupMockSdkMethod({ data: userDetailsWithoutAddress });

      const { result } = renderHook(() =>
        useDepositUser({
          screenLocation: 'BuildQuote Screen',
          shouldTrackFetch: true,
        }),
      );

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_USER_DETAILS_FETCHED',
        {
          logged_in: true,
          region: 'GB',
          location: 'BuildQuote Screen',
        },
      );
    });

    it('tracks event with empty region when both user countryCode and selectedRegion are missing', async () => {
      const userDetailsWithoutCountry = {
        ...mockUserDetails,
        address: {
          ...mockUserDetails.address,
          countryCode: '',
        },
      };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          selectedRegion: null,
        }),
      );
      mockFetchUserDetails.mockResolvedValue(userDetailsWithoutCountry);
      setupMockSdkMethod({ data: userDetailsWithoutCountry });

      const { result } = renderHook(() =>
        useDepositUser({
          screenLocation: 'EnterAddress Screen',
          shouldTrackFetch: true,
        }),
      );

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_USER_DETAILS_FETCHED',
        {
          logged_in: true,
          region: '',
          location: 'EnterAddress Screen',
        },
      );
    });

    it('tracks event with not authenticated status when user is logged out', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: false,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() =>
        useDepositUser({
          screenLocation: 'BuildQuote Screen',
          shouldTrackFetch: true,
        }),
      );

      await result.current.fetchUserDetails();

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_USER_DETAILS_FETCHED',
        {
          logged_in: false,
          region: 'US',
          location: 'BuildQuote Screen',
        },
      );
    });

    it('tracks event before calling fetchUserDetails', async () => {
      const callOrder: string[] = [];

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );

      mockTrackEvent.mockImplementation(() => {
        callOrder.push('trackEvent');
      });

      mockFetchUserDetails.mockImplementation(() => {
        callOrder.push('fetchUserDetails');
        return Promise.resolve(mockUserDetails);
      });

      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() =>
        useDepositUser({
          screenLocation: 'BuildQuote Screen',
          shouldTrackFetch: true,
        }),
      );

      await result.current.fetchUserDetails();

      expect(callOrder).toEqual(['trackEvent', 'fetchUserDetails']);
    });
  });
});
