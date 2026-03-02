import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useGetUserKYCStatus from './useGetUserKYCStatus';
import { useCardSDK } from '../sdk';
import { CardSDK } from '../sdk/CardSDK';
import { CardError, CardErrorType } from '../types';
import cardReducer, {
  setIsAuthenticatedCard,
} from '../../../../core/redux/slices/card';

jest.mock('../sdk');

let mockQueryFn: (() => Promise<unknown>) | undefined;
const mockRefetch = jest.fn();
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
  useQuery: jest.fn().mockImplementation((config) => {
    mockQueryFn = config.queryFn;
    return mockQueryReturn;
  }),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

const createTestStore = () =>
  configureStore({
    reducer: {
      card: cardReducer,
    },
  });

describe('useGetUserKYCStatus', () => {
  const mockGetUserDetails = jest.fn();
  const mockSdk = {
    getUserDetails: mockGetUserDetails,
  } as unknown as CardSDK;

  const mockCardSDKContext = {
    sdk: mockSdk,
    isLoading: false,
    user: null,
    setUser: jest.fn(),
    logoutFromProvider: jest.fn(),
    fetchUserData: jest.fn(),
    isReturningSession: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCardSDK.mockReturnValue(mockCardSDKContext);

    mockQueryReturn = {
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    };
    mockRefetch.mockResolvedValue({ data: null });
    mockQueryFn = undefined;
  });

  it('does not enable query when user is not authenticated', () => {
    const { useQuery: mockUseQuery } = jest.requireMock(
      '@tanstack/react-query',
    );

    const store = createTestStore();
    renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('query is always disabled (fetching is done via fetchKYCStatus)', () => {
    const { useQuery: mockUseQuery } = jest.requireMock(
      '@tanstack/react-query',
    );

    const store = createTestStore();
    store.dispatch(setIsAuthenticatedCard(true));

    renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
  });

  it('returns KYC status data from query', () => {
    const kycData = {
      verificationState: 'VERIFIED',
      userId: 'user-123',
      userDetails: {
        id: 'user-123',
        verificationState: 'VERIFIED',
      },
    };
    mockQueryReturn.data = kycData;

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(result.current.kycStatus).toEqual(kycData);
    expect(result.current.error).toBeNull();
  });

  it('returns PENDING state when user verification is pending', () => {
    mockQueryReturn.data = {
      verificationState: 'PENDING',
      userId: 'user-123',
      userDetails: { id: 'user-123', verificationState: 'PENDING' },
    };

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(result.current.kycStatus?.verificationState).toBe('PENDING');
  });

  it('returns REJECTED state when user verification is rejected', () => {
    mockQueryReturn.data = {
      verificationState: 'REJECTED',
      userId: 'user-123',
      userDetails: { id: 'user-123', verificationState: 'REJECTED' },
    };

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(result.current.kycStatus?.verificationState).toBe('REJECTED');
  });

  it('returns error when query fails', () => {
    mockQueryReturn.error = new CardError(
      CardErrorType.SERVER_ERROR,
      'Failed to fetch',
    );

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.kycStatus).toBeNull();
  });

  it('calls refetch when fetchKYCStatus is invoked', async () => {
    const kycData = {
      verificationState: 'VERIFIED',
      userId: 'user-123',
      userDetails: { id: 'user-123', verificationState: 'VERIFIED' },
    };
    mockRefetch.mockResolvedValue({ data: kycData });

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    await act(async () => {
      const fetchResult = await result.current.fetchKYCStatus();
      expect(fetchResult).toEqual(kycData);
    });

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('refetches KYC status when fetchKYCStatus is called multiple times', async () => {
    mockRefetch.mockResolvedValue({ data: null });

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    await act(async () => {
      await result.current.fetchKYCStatus();
    });

    await act(async () => {
      await result.current.fetchKYCStatus();
    });

    expect(mockRefetch).toHaveBeenCalledTimes(2);
  });

  it('disables query when SDK is not available even if authenticated', () => {
    const { useQuery: mockUseQuery } = jest.requireMock(
      '@tanstack/react-query',
    );

    mockUseCardSDK.mockReturnValue({
      ...mockCardSDKContext,
      sdk: null,
    });

    const store = createTestStore();
    store.dispatch(setIsAuthenticatedCard(true));

    const { result } = renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      }),
    );
    expect(result.current.kycStatus).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('queryFn returns correct shape from SDK response', async () => {
    mockGetUserDetails.mockResolvedValue({
      id: 'user-123',
      verificationState: 'VERIFIED',
    });

    const store = createTestStore();
    renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(mockQueryFn).toBeDefined();
    const queryResult = await mockQueryFn?.();
    expect(queryResult).toEqual({
      verificationState: 'VERIFIED',
      userId: 'user-123',
      userDetails: {
        id: 'user-123',
        verificationState: 'VERIFIED',
      },
    });
  });

  it('queryFn sets verificationState to null when missing from API response', async () => {
    mockGetUserDetails.mockResolvedValue({
      id: 'user-123',
    });

    const store = createTestStore();
    renderHook(() => useGetUserKYCStatus(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(mockQueryFn).toBeDefined();
    const queryResult = await mockQueryFn?.();
    expect(queryResult).toEqual({
      verificationState: null,
      userId: 'user-123',
      userDetails: {
        id: 'user-123',
      },
    });
  });
});
