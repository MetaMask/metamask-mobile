import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import useGetUserKYCStatus from './useGetUserKYCStatus';
import { useCardSDK } from '../sdk';
import { CardSDK } from '../sdk/CardSDK';
import { CardError, CardErrorType } from '../types';
import cardReducer from '../../../../core/redux/slices/card';

jest.mock('../sdk');

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

// Helper to create a test store
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
  });

  it('does not fetch when user is not authenticated', () => {
    const store = createTestStore();
    renderHook(() => useGetUserKYCStatus(false), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(mockGetUserDetails).not.toHaveBeenCalled();
  });

  it('fetches KYC status when authenticated', async () => {
    mockGetUserDetails.mockResolvedValue({
      id: 'user-123',
      verificationState: 'VERIFIED',
    });

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(true), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    // Given: fetch on mount is disabled, nothing is fetched automatically
    expect(mockGetUserDetails).not.toHaveBeenCalled();

    // When: fetching explicitly
    await act(async () => {
      await result.current.fetchKYCStatus();
    });

    // Then: SDK is called and state is updated from cache
    await waitFor(() => {
      expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.kycStatus).toEqual({
      verificationState: 'VERIFIED',
      userId: 'user-123',
    });
    expect(result.current.error).toBeNull();
  });

  it('returns PENDING state when user verification is pending', async () => {
    mockGetUserDetails.mockResolvedValue({
      id: 'user-123',
      verificationState: 'PENDING',
    });

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(true), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    await act(async () => {
      await result.current.fetchKYCStatus();
    });

    await waitFor(() => {
      expect(result.current.kycStatus?.verificationState).toBe('PENDING');
    });
  });

  it('returns REJECTED state when user verification is rejected', async () => {
    mockGetUserDetails.mockResolvedValue({
      id: 'user-123',
      verificationState: 'REJECTED',
    });

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(true), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    await act(async () => {
      await result.current.fetchKYCStatus();
    });

    await waitFor(() => {
      expect(result.current.kycStatus?.verificationState).toBe('REJECTED');
    });
  });

  it('sets error and clears KYC status when API call fails', async () => {
    const mockError = new CardError(
      CardErrorType.SERVER_ERROR,
      'Failed to fetch',
    );
    mockGetUserDetails.mockRejectedValue(mockError);

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(true), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    await act(async () => {
      await result.current.fetchKYCStatus();
    });

    await waitFor(() => {
      expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(result.current.kycStatus).toBeNull();
    });
  });

  it('refetches KYC status when fetchKYCStatus is called manually', async () => {
    mockGetUserDetails.mockResolvedValue({
      id: 'user-123',
      verificationState: 'VERIFIED',
    });

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(true), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(mockGetUserDetails).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.fetchKYCStatus();
    });

    await waitFor(() => {
      expect(mockGetUserDetails).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      await result.current.fetchKYCStatus();
    });

    await waitFor(() => {
      expect(mockGetUserDetails).toHaveBeenCalledTimes(2);
    });
  });

  it('returns null status when SDK is not available', () => {
    mockUseCardSDK.mockReturnValue({
      ...mockCardSDKContext,
      sdk: null,
    });

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(true), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(result.current.kycStatus).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets verificationState to null when missing from API response', async () => {
    mockGetUserDetails.mockResolvedValue({
      id: 'user-123',
      // verificationState is undefined
    });

    const store = createTestStore();
    const { result } = renderHook(() => useGetUserKYCStatus(true), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    await act(async () => {
      await result.current.fetchKYCStatus();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.kycStatus).toEqual({
      verificationState: null,
      userId: 'user-123',
    });
  });
});
