import { renderHook } from '@testing-library/react-native';
import { useDepositUser } from './useDepositUser';
import { useDepositSDK } from '../sdk';
import type { AxiosError } from 'axios';
import { createMockSDKReturn } from '../testUtils/constants';

jest.mock('../sdk', () => ({
  useDepositSDK: jest.fn(),
}));

const mockUseDepositSDK = useDepositSDK as jest.MockedFunction<
  typeof useDepositSDK
>;

const mockTrackEvent = jest.fn();
jest.mock('../../hooks/useAnalytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

const mockLogoutFromProvider = jest.fn();

const mockUseDepositSdkMethodInitialState = {
  data: null,
  error: null as string | null,
  isFetching: false,
};

let mockFetchUserDetails = jest.fn();
let mockSdkMethodState = { ...mockUseDepositSdkMethodInitialState };

const setupMockSdkMethod = (
  overrides: {
    data?: unknown;
    error?: string | null;
    isFetching?: boolean;
  } = {},
) => {
  mockFetchUserDetails = jest.fn().mockResolvedValue(
    overrides.data ?? {
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
    },
  );
  mockSdkMethodState = {
    ...mockUseDepositSdkMethodInitialState,
    data: overrides.data ?? null,
    error: overrides.error ?? null,
    isFetching: overrides.isFetching ?? false,
  };
};

const mockUseDepositSdkMethod = jest.fn((config) => {
  if (config?.method === 'getUserDetails') {
    return [mockSdkMethodState, mockFetchUserDetails];
  }
  return [mockUseDepositSdkMethodInitialState, jest.fn()];
});

jest.mock('./useDepositSdkMethod', () => ({
  useDepositSdkMethod: (config: unknown) => mockUseDepositSdkMethod(config),
}));

describe('useDepositUser', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackEvent.mockClear();
    setupMockSdkMethod();

    mockUseDepositSDK.mockReturnValue(
      createMockSDKReturn({
        isAuthenticated: false,
        logoutFromProvider: mockLogoutFromProvider,
      }),
    );
  });

  describe('basic functionality', () => {
    it('returns user details when authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
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
        }),
      );
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toBeNull();
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

      renderHook(() => useDepositUser({ fetchOnMount: true }));

      expect(mockFetchUserDetails).toHaveBeenCalled();
    });

    it('does not fetch user details when not authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: false,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      setupMockSdkMethod();

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
      const networkError = 'Network error';
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );
      setupMockSdkMethod({ error: networkError });

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toBeNull();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(networkError);
    });

    it('handles multiple hook renders correctly', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('fetchUserDetails', () => {
    it('returns user details when successful', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

      mockFetchUserDetails.mockResolvedValue(mockUserDetails);

      const { result } = renderHook(() => useDepositUser());

      const userDetails = await result.current.fetchUserDetails();

      expect(userDetails).toEqual(mockUserDetails);
    });

    it('logs out but does not throw on 401 error', async () => {
      const error401 = Object.assign(new Error('Unauthorized'), {
        status: 401,
      }) as AxiosError;

      mockFetchUserDetails.mockRejectedValue(error401);

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

      const { result } = renderHook(() => useDepositUser());

      await result.current.fetchUserDetails();

      expect(mockLogoutFromProvider).toHaveBeenCalledWith(false);
    });

    it('throws error for non-401 errors', async () => {
      const networkError = new Error('Network error');
      setupMockSdkMethod({ data: mockUserDetails });

      const { result } = renderHook(() => useDepositUser());

      mockFetchUserDetails.mockRejectedValue(networkError);

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
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          userDetails: mockUserDetails,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

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
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          userDetails: mockUserDetails,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

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
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          userDetails: mockUserDetails,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

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

      mockFetchUserDetails.mockResolvedValue(userDetailsWithoutCountry);
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          selectedRegion: { isoCode: 'CA', currency: 'CAD' },
          userDetails: userDetailsWithoutCountry,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

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

      mockFetchUserDetails.mockResolvedValue(userDetailsWithoutAddress);
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          selectedRegion: { isoCode: 'GB', currency: 'GBP' },
          userDetails: userDetailsWithoutAddress,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

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

      mockFetchUserDetails.mockResolvedValue(userDetailsWithoutCountry);
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
          selectedRegion: null,
          userDetails: userDetailsWithoutCountry,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

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
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: false,
          logoutFromProvider: mockLogoutFromProvider,
          userDetails: mockUserDetails,
          fetchUserDetails: mockFetchUserDetails,
        }),
      );

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

      mockTrackEvent.mockImplementation(() => {
        callOrder.push('trackEvent');
      });

      const customMockFetchUserDetails = jest.fn().mockImplementation(() => {
        callOrder.push('fetchUserDetails');
        return Promise.resolve(mockUserDetails);
      });

      mockUseDepositSdkMethod.mockImplementation((config) => {
        if (config?.method === 'getUserDetails') {
          return [
            {
              data: null,
              error: null,
              isFetching: false,
            },
            customMockFetchUserDetails,
          ];
        }
        return [mockUseDepositSdkMethodInitialState, jest.fn()];
      });

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          logoutFromProvider: mockLogoutFromProvider,
        }),
      );

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
