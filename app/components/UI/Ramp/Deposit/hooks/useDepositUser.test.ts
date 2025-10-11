import { renderHook } from '@testing-library/react-native';
import { useDepositUser } from './useDepositUser';
import { createMockSDKReturn } from '../testUtils/constants';
import { DepositSdkMethodQuery } from '../hooks/useDepositSdkMethod';
import { NativeRampsSdk } from '@consensys/native-ramps-sdk';

const mockUseDepositSdkMethod = jest.fn();
jest.mock('./useDepositSdkMethod', () => ({
  useDepositSdkMethod: (config: DepositSdkMethodQuery<keyof NativeRampsSdk>) =>
    mockUseDepositSdkMethod(config),
}));

const mockUseDepositSDK = jest.fn();
jest.mock('../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
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

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseDepositSDK.mockReturnValue(
      createMockSDKReturn({
        isAuthenticated: false,
      }),
    );

    mockUseDepositSdkMethod.mockReturnValue([
      { data: null, error: null, isFetching: false },
      mockFetchUserDetails,
    ]);
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
      });
    });

    it('returns fetchUserDetails function', () => {
      const { result } = renderHook(() => useDepositUser());

      expect(result.current.fetchUserDetails).toBe(mockFetchUserDetails);
    });
  });

  describe('authentication-based fetching', () => {
    it('fetches user details when authenticated and no user details exist', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
        }),
      );
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: false },
        mockFetchUserDetails,
      ]);

      renderHook(() => useDepositUser());

      expect(mockFetchUserDetails).toHaveBeenCalled();
    });

    it('does not fetch user details when not authenticated', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: false,
        }),
      );

      renderHook(() => useDepositUser());

      expect(mockFetchUserDetails).not.toHaveBeenCalled();
    });

    it('does not fetch user details when already exists', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
        }),
      );
      mockUseDepositSdkMethod.mockReturnValue([
        { data: mockUserDetails, error: null, isFetching: false },
        mockFetchUserDetails,
      ]);

      renderHook(() => useDepositUser());

      expect(mockFetchUserDetails).not.toHaveBeenCalled();
    });
  });

  describe('loading and error states', () => {
    it('returns loading state when fetching', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
        }),
      );
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: true },
        mockFetchUserDetails,
      ]);

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
        }),
      );
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: mockError, isFetching: false },
        mockFetchUserDetails,
      ]);

      const { result } = renderHook(() => useDepositUser());

      expect(result.current.userDetails).toBeNull();
      expect(result.current.error).toBe(mockError);
      expect(result.current.isFetching).toBe(false);
    });

    it('handles multiple hook renders correctly', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
        }),
      );
      mockUseDepositSdkMethod.mockReturnValue([
        { data: null, error: null, isFetching: false },
        mockFetchUserDetails,
      ]);

      const { rerender } = renderHook(() => useDepositUser());
      rerender({});
      rerender({});

      expect(mockFetchUserDetails).toHaveBeenCalledTimes(1);
    });
  });
});
