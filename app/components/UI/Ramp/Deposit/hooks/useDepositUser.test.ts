import { renderHook } from '@testing-library/react-native';
import { useDepositUser } from './useDepositUser';
import { DepositSDK, useDepositSDK } from '../sdk';

jest.mock('../sdk', () => ({
  useDepositSDK: jest.fn(),
}));

const mockUseDepositSDK = useDepositSDK as jest.MockedFunction<
  typeof useDepositSDK
>;

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

  const mockFetchUserDetails = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDepositSDK.mockReturnValue({
      isAuthenticated: false,
      userDetails: null,
      userDetailsError: null,
      isFetchingUserDetails: false,
      fetchUserDetails: mockFetchUserDetails,
    } as unknown as DepositSDK);
  });

  describe('basic functionality', () => {
    it('returns user details from SDK context when authenticated', () => {
      mockUseDepositSDK.mockReturnValue({
        isAuthenticated: true,
        userDetails: mockUserDetails,
        userDetailsError: null,
        isFetchingUserDetails: false,
        fetchUserDetails: mockFetchUserDetails,
      } as unknown as DepositSDK);

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toEqual(mockUserDetails);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    it('returns null user details when not authenticated', () => {
      mockUseDepositSDK.mockReturnValue({
        isAuthenticated: false,
        userDetails: mockUserDetails,
        userDetailsError: null,
        isFetchingUserDetails: false,
        fetchUserDetails: mockFetchUserDetails,
      } as unknown as DepositSDK);

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toBeNull();
    });

    it('returns fetchUserDetails function', () => {
      const { result } = renderHook(() => useDepositUser());

      expect(result.current.fetchUserDetails).toBeDefined();
      expect(typeof result.current.fetchUserDetails).toBe('function');
    });

    it('returns error from SDK context', () => {
      const mockError = 'Failed to fetch user details';
      mockUseDepositSDK.mockReturnValue({
        isAuthenticated: true,
        userDetails: null,
        userDetailsError: mockError,
        isFetchingUserDetails: false,
        fetchUserDetails: mockFetchUserDetails,
      } as unknown as DepositSDK);

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.error).toBe(mockError);
    });

    it('returns isFetching state from SDK context', () => {
      mockUseDepositSDK.mockReturnValue({
        isAuthenticated: true,
        userDetails: null,
        userDetailsError: null,
        isFetchingUserDetails: true,
        fetchUserDetails: mockFetchUserDetails,
      } as unknown as DepositSDK);

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.isFetching).toBe(true);
    });
  });

  describe('fetchUserDetails', () => {
    it('calls SDK fetchUserDetails with provided params', async () => {
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);

      const { result } = renderHook(() => useDepositUser());

      await result.current.fetchUserDetails({
        screenLocation: 'BuildQuote Screen',
        shouldTrackFetch: true,
      });

      expect(mockFetchUserDetails).toHaveBeenCalledWith({
        screenLocation: 'BuildQuote Screen',
        shouldTrackFetch: true,
      });
    });

    it('returns user details from SDK fetchUserDetails', async () => {
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);

      const { result } = renderHook(() => useDepositUser());

      const userDetails = await result.current.fetchUserDetails({
        screenLocation: 'BuildQuote Screen',
        shouldTrackFetch: true,
      });

      expect(userDetails).toEqual(mockUserDetails);
    });

    it('propagates errors from SDK fetchUserDetails', async () => {
      const error = new Error('Network error');
      mockFetchUserDetails.mockRejectedValue(error);

      const { result } = renderHook(() => useDepositUser());

      await expect(
        result.current.fetchUserDetails({
          screenLocation: 'BuildQuote Screen',
          shouldTrackFetch: true,
        }),
      ).rejects.toThrow('Network error');
    });
  });

  describe('config parameter', () => {
    it('accepts config parameter for backward compatibility', () => {
      const { result } = renderHook(() =>
        useDepositUser({
          screenLocation: 'BuildQuote Screen',
          shouldTrackFetch: true,
        }),
      );

      expect(result.current.fetchUserDetails).toBeDefined();
    });

    it('works without config parameter', () => {
      const { result } = renderHook(() => useDepositUser());

      expect(result.current.fetchUserDetails).toBeDefined();
    });
  });
});
