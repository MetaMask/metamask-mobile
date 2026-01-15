import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import useLoadCardData from './useLoadCardData';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';
import useCardDetails from './useCardDetails';
import { useGetPriorityCardToken } from './useGetPriorityCardToken';
import useGetCardExternalWalletDetails from './useGetCardExternalWalletDetails';
import useGetDelegationSettings from './useGetDelegationSettings';
import useGetLatestAllowanceForPriorityToken from './useGetLatestAllowanceForPriorityToken';
import useGetUserKYCStatus from './useGetUserKYCStatus';
import {
  AllowanceState,
  CardTokenAllowance,
  CardStateWarning,
  CardDetailsResponse,
  CardStatus,
  CardType,
  DelegationSettingsResponse,
  CardErrorType,
} from '../types';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./isBaanxLoginEnabled');
jest.mock('./useCardDetails');
jest.mock('./useGetPriorityCardToken');
jest.mock('./useGetCardExternalWalletDetails');
jest.mock('./useGetDelegationSettings');
jest.mock('./useGetLatestAllowanceForPriorityToken');
jest.mock('./useGetUserKYCStatus');

const mockUseIsBaanxLoginEnabled =
  useIsBaanxLoginEnabled as jest.MockedFunction<typeof useIsBaanxLoginEnabled>;
const mockUseCardDetails = useCardDetails as jest.MockedFunction<
  typeof useCardDetails
>;
const mockUseGetPriorityCardToken =
  useGetPriorityCardToken as jest.MockedFunction<
    typeof useGetPriorityCardToken
  >;
const mockUseGetCardExternalWalletDetails =
  useGetCardExternalWalletDetails as jest.MockedFunction<
    typeof useGetCardExternalWalletDetails
  >;
const mockUseGetDelegationSettings =
  useGetDelegationSettings as jest.MockedFunction<
    typeof useGetDelegationSettings
  >;
const mockUseGetLatestAllowanceForPriorityToken =
  useGetLatestAllowanceForPriorityToken as jest.MockedFunction<
    typeof useGetLatestAllowanceForPriorityToken
  >;
const mockUseGetUserKYCStatus = useGetUserKYCStatus as jest.MockedFunction<
  typeof useGetUserKYCStatus
>;

describe('useLoadCardData', () => {
  const mockPriorityToken: CardTokenAllowance = {
    address: '0xToken1',
    symbol: 'TKN1',
    name: 'Token 1',
    decimals: 18,
    allowance: '1000000000000',
    allowanceState: AllowanceState.Enabled,
    caipChainId: 'eip155:59144' as const,
  };

  const mockAllTokens: CardTokenAllowance[] = [
    mockPriorityToken,
    {
      address: '0xToken2',
      symbol: 'TKN2',
      name: 'Token 2',
      decimals: 18,
      allowance: '500000000000',
      allowanceState: AllowanceState.Enabled,
      caipChainId: 'eip155:59144' as const,
    },
  ];

  const mockCardDetails: CardDetailsResponse = {
    id: 'card-123',
    holderName: 'John Doe',
    expiryDate: '12/28',
    panLast4: '1234',
    status: CardStatus.ACTIVE,
    type: CardType.VIRTUAL,
    orderedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockDelegationSettings: DelegationSettingsResponse = {
    networks: [
      {
        network: 'linea',
        environment: 'production',
        chainId: '59144',
        delegationContract: '0xDelegation',
        tokens: {},
      },
    ],
    count: 1,
    _links: {
      self: 'https://api.example.com/delegation-settings',
    },
  };

  const mockExternalWalletDetails = {
    walletDetails: [],
    priorityWalletDetail: mockPriorityToken,
    mappedWalletDetails: mockAllTokens,
  };

  const mockFetchPriorityToken = jest.fn();
  const mockFetchCardDetails = jest.fn();
  const mockFetchExternalWalletDetails = jest.fn();
  const mockFetchDelegationSettings = jest.fn();
  const mockPollCardStatusUntilProvisioned = jest.fn();
  const mockFetchKYCStatus = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mocks for all hooks
    mockUseSelector.mockReturnValue(false); // isAuthenticated = false by default

    mockUseIsBaanxLoginEnabled.mockReturnValue(true);

    mockUseGetDelegationSettings.mockReturnValue({
      data: mockDelegationSettings,
      isLoading: false,
      error: null,
      fetchData: mockFetchDelegationSettings,
    });

    mockUseGetCardExternalWalletDetails.mockReturnValue({
      data: mockExternalWalletDetails,
      isLoading: false,
      error: null,
      fetchData: mockFetchExternalWalletDetails,
    });

    mockUseGetPriorityCardToken.mockReturnValue({
      priorityToken: mockPriorityToken,
      allTokensWithAllowances: mockAllTokens,
      isLoading: false,
      error: false,
      warning: null,
      fetchPriorityToken: mockFetchPriorityToken,
    });

    mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
      latestAllowance: null,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUseCardDetails.mockReturnValue({
      cardDetails: mockCardDetails,
      isLoading: false,
      error: null,
      warning: null,
      fetchCardDetails: mockFetchCardDetails,
      pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
      isLoadingPollCardStatusUntilProvisioned: false,
    });

    mockUseGetUserKYCStatus.mockReturnValue({
      kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
      isLoading: false,
      error: null,
      fetchKYCStatus: mockFetchKYCStatus,
    });
  });

  describe('Unauthenticated Mode', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(false); // Not authenticated
    });

    it('returns priority token and all tokens from on-chain data', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.priorityToken).toEqual(mockPriorityToken);
      expect(result.current.allTokens).toEqual(mockAllTokens);
    });

    it('returns card details', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.cardDetails).toEqual(mockCardDetails);
    });

    it('returns null delegation settings and external wallet details', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.delegationSettings).toBeNull();
      expect(result.current.externalWalletDetailsData).toBeNull();
    });

    it('returns correct loading state when priority token is loading', () => {
      mockUseGetPriorityCardToken.mockReturnValue({
        priorityToken: null,
        allTokensWithAllowances: [],
        isLoading: true,
        error: false,
        warning: null,
        fetchPriorityToken: mockFetchPriorityToken,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns correct loading state when card details are loading', () => {
      mockUseCardDetails.mockReturnValue({
        cardDetails: null,
        isLoading: true,
        error: null,
        warning: null,
        fetchCardDetails: mockFetchCardDetails,
        pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
        isLoadingPollCardStatusUntilProvisioned: false,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns correct loading state when delegation settings are loading', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns false for loading state when all data is loaded', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isLoading).toBe(false);
    });

    it('returns error when priority token fetch fails', () => {
      mockUseGetPriorityCardToken.mockReturnValue({
        priorityToken: null,
        allTokensWithAllowances: [],
        isLoading: false,
        error: true,
        warning: null,
        fetchPriorityToken: mockFetchPriorityToken,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.error).toBe(true);
    });

    it('returns error when card details fetch fails', () => {
      mockUseCardDetails.mockReturnValue({
        cardDetails: null,
        isLoading: false,
        error: new Error(CardErrorType.UNKNOWN_ERROR),
        warning: null,
        fetchCardDetails: mockFetchCardDetails,
        pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
        isLoadingPollCardStatusUntilProvisioned: false,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.error).toEqual(
        new Error(CardErrorType.UNKNOWN_ERROR),
      );
    });

    it('returns error when delegation settings fetch fails', () => {
      mockUseGetDelegationSettings.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Delegation settings error'),
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.error).toEqual(
        new Error('Delegation settings error'),
      );
    });

    it('returns warning from priority token', () => {
      mockUseGetPriorityCardToken.mockReturnValue({
        priorityToken: mockPriorityToken,
        allTokensWithAllowances: mockAllTokens,
        isLoading: false,
        error: false,
        warning: CardStateWarning.NeedDelegation,
        fetchPriorityToken: mockFetchPriorityToken,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.warning).toBe(CardStateWarning.NeedDelegation);
    });

    it('returns warning from card details', () => {
      mockUseCardDetails.mockReturnValue({
        cardDetails: mockCardDetails,
        isLoading: false,
        error: null,
        warning: CardStateWarning.Frozen,
        fetchCardDetails: mockFetchCardDetails,
        pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
        isLoadingPollCardStatusUntilProvisioned: false,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.warning).toBe(CardStateWarning.Frozen);
    });

    it('returns authentication and cardholder status', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isBaanxLoginEnabled).toBe(true);
    });

    it('calls fetchPriorityToken when fetchAllData is invoked', async () => {
      const { result } = renderHook(() => useLoadCardData());

      await act(async () => {
        await result.current.fetchAllData();
      });

      expect(mockFetchPriorityToken).toHaveBeenCalledTimes(1);
    });

    it('does not call fetchExternalWalletDetails in unauthenticated mode', async () => {
      const { result } = renderHook(() => useLoadCardData());

      await act(async () => {
        await result.current.fetchAllData();
      });

      expect(mockFetchExternalWalletDetails).not.toHaveBeenCalled();
    });

    it('exposes pollCardStatusUntilProvisioned function', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.pollCardStatusUntilProvisioned).toBe(
        mockPollCardStatusUntilProvisioned,
      );
    });

    it('exposes isLoadingPollCardStatusUntilProvisioned state', () => {
      const mockCardDetailsForLoading: CardDetailsResponse = {
        id: 'card-456',
        holderName: 'Jane Smith',
        expiryDate: '12/29',
        panLast4: '5678',
        status: CardStatus.ACTIVE,
        type: CardType.VIRTUAL,
        orderedAt: '2024-02-01T00:00:00.000Z',
      };

      mockUseCardDetails.mockReturnValue({
        cardDetails: mockCardDetailsForLoading,
        isLoading: false,
        error: null,
        warning: null,
        fetchCardDetails: mockFetchCardDetails,
        pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
        isLoadingPollCardStatusUntilProvisioned: true,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isLoadingPollCardStatusUntilProvisioned).toBe(true);
    });
  });

  describe('Authenticated Mode', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(true); // Authenticated
    });

    it('returns priority token and all tokens from API data', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.priorityToken).toEqual({
        ...mockPriorityToken,
        totalAllowance: mockPriorityToken.allowance,
      });
      expect(result.current.allTokens).toEqual(mockAllTokens);
    });

    it('returns delegation settings', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.delegationSettings).toEqual(mockDelegationSettings);
    });

    it('returns external wallet details data', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.externalWalletDetailsData).toEqual(
        mockExternalWalletDetails,
      );
    });

    it('returns correct loading state when external wallet details are loading', () => {
      mockUseGetCardExternalWalletDetails.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        fetchData: mockFetchExternalWalletDetails,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns false for loading state when all data is loaded', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isLoading).toBe(false);
    });

    it('returns error when external wallet details fetch fails', () => {
      mockUseGetCardExternalWalletDetails.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('External wallet error'),
        fetchData: mockFetchExternalWalletDetails,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.error).toEqual(new Error('External wallet error'));
    });

    it('returns empty array when external wallet details have no tokens', () => {
      mockUseGetCardExternalWalletDetails.mockReturnValue({
        data: {
          walletDetails: [],
          priorityWalletDetail: null,
          mappedWalletDetails: [],
        },
        isLoading: false,
        error: null,
        fetchData: mockFetchExternalWalletDetails,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.allTokens).toEqual([]);
    });

    it('calls all fetch functions when fetchAllData is invoked', async () => {
      const { result } = renderHook(() => useLoadCardData());

      await act(async () => {
        await result.current.fetchAllData();
      });

      expect(mockFetchPriorityToken).toHaveBeenCalledTimes(1);
      expect(mockFetchCardDetails).toHaveBeenCalledTimes(1);
      expect(mockFetchExternalWalletDetails).toHaveBeenCalledTimes(1);
    });

    it('handles fetchAllData errors gracefully', async () => {
      mockFetchPriorityToken.mockRejectedValue(
        new Error('Priority token error'),
      );
      mockFetchCardDetails.mockRejectedValue(new Error('Card details error'));
      mockFetchExternalWalletDetails.mockRejectedValue(
        new Error('External wallet error'),
      );

      const { result } = renderHook(() => useLoadCardData());

      await act(async () => {
        await expect(result.current.fetchAllData()).rejects.toThrow();
      });
    });

    it('returns authentication and cardholder status', () => {
      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isBaanxLoginEnabled).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('handles null priority token gracefully', () => {
      mockUseGetPriorityCardToken.mockReturnValue({
        priorityToken: null,
        allTokensWithAllowances: [],
        isLoading: false,
        error: false,
        warning: null,
        fetchPriorityToken: mockFetchPriorityToken,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.priorityToken).toBeNull();
    });

    it('handles null card details gracefully', () => {
      mockUseCardDetails.mockReturnValue({
        cardDetails: null,
        isLoading: false,
        error: null,
        warning: null,
        fetchCardDetails: mockFetchCardDetails,
        pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
        isLoadingPollCardStatusUntilProvisioned: false,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.cardDetails).toBeNull();
    });

    it('handles null delegation settings gracefully in authenticated mode', () => {
      mockUseSelector.mockReturnValue(true); // Authenticated
      mockUseGetDelegationSettings.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchDelegationSettings,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.delegationSettings).toBeNull();
    });

    it('handles null external wallet details gracefully in authenticated mode', () => {
      mockUseSelector.mockReturnValue(true); // Authenticated
      mockUseGetCardExternalWalletDetails.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
        fetchData: mockFetchExternalWalletDetails,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.externalWalletDetailsData).toBeNull();
      expect(result.current.allTokens).toEqual([]);
    });

    it('handles empty all tokens array', () => {
      mockUseGetPriorityCardToken.mockReturnValue({
        priorityToken: mockPriorityToken,
        allTokensWithAllowances: [],
        isLoading: false,
        error: false,
        warning: null,
        fetchPriorityToken: mockFetchPriorityToken,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.allTokens).toEqual([]);
    });

    it('handles multiple errors and returns first error', () => {
      mockUseGetPriorityCardToken.mockReturnValue({
        priorityToken: null,
        allTokensWithAllowances: [],
        isLoading: false,
        error: true,
        warning: null,
        fetchPriorityToken: mockFetchPriorityToken,
      });

      mockUseCardDetails.mockReturnValue({
        cardDetails: null,
        isLoading: false,
        error: new Error(CardErrorType.UNKNOWN_ERROR),
        warning: null,
        fetchCardDetails: mockFetchCardDetails,
        pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
        isLoadingPollCardStatusUntilProvisioned: false,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.error).toBeTruthy();
    });

    it('handles multiple warnings and returns first warning', () => {
      mockUseGetPriorityCardToken.mockReturnValue({
        priorityToken: mockPriorityToken,
        allTokensWithAllowances: mockAllTokens,
        isLoading: false,
        error: false,
        warning: CardStateWarning.NeedDelegation,
        fetchPriorityToken: mockFetchPriorityToken,
      });

      mockUseCardDetails.mockReturnValue({
        cardDetails: mockCardDetails,
        isLoading: false,
        error: null,
        warning: CardStateWarning.Frozen,
        fetchCardDetails: mockFetchCardDetails,
        pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
        isLoadingPollCardStatusUntilProvisioned: false,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.warning).toBe(CardStateWarning.NeedDelegation);
    });

    it('handles Baanx login disabled state', () => {
      mockUseIsBaanxLoginEnabled.mockReturnValue(false);

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.isBaanxLoginEnabled).toBe(false);
    });
  });

  describe('Mode Switching', () => {
    it('switches from unauthenticated to authenticated mode', () => {
      mockUseSelector.mockReturnValue(false); // Start unauthenticated

      const { result, rerender } = renderHook(() => useLoadCardData());

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.delegationSettings).toBeNull();
      expect(result.current.externalWalletDetailsData).toBeNull();

      mockUseSelector.mockReturnValue(true); // Switch to authenticated

      rerender();

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.delegationSettings).toEqual(mockDelegationSettings);
      expect(result.current.externalWalletDetailsData).toEqual(
        mockExternalWalletDetails,
      );
    });

    it('switches from authenticated to unauthenticated mode', () => {
      mockUseSelector.mockReturnValue(true); // Start authenticated

      const { result, rerender } = renderHook(() => useLoadCardData());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.delegationSettings).toEqual(mockDelegationSettings);

      mockUseSelector.mockReturnValue(false); // Switch to unauthenticated

      rerender();

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.delegationSettings).toBeNull();
      expect(result.current.externalWalletDetailsData).toBeNull();
    });

    it('uses correct token list based on authentication mode', () => {
      const unauthenticatedTokens: CardTokenAllowance[] = [
        {
          address: '0xToken3',
          symbol: 'TKN3',
          name: 'Token 3',
          decimals: 18,
          allowance: '3000000000000',
          allowanceState: AllowanceState.Enabled,
          caipChainId: 'eip155:59144' as const,
        },
      ];

      mockUseSelector.mockReturnValue(false); // Unauthenticated
      mockUseGetPriorityCardToken.mockReturnValue({
        priorityToken: unauthenticatedTokens[0],
        allTokensWithAllowances: unauthenticatedTokens,
        isLoading: false,
        error: false,
        warning: null,
        fetchPriorityToken: mockFetchPriorityToken,
      });

      const { result, rerender } = renderHook(() => useLoadCardData());

      expect(result.current.allTokens).toEqual(unauthenticatedTokens);

      mockUseSelector.mockReturnValue(true); // Authenticated

      rerender();

      expect(result.current.allTokens).toEqual(mockAllTokens); // From external wallet details
    });
  });

  describe('Latest Allowance', () => {
    describe('Authenticated Mode', () => {
      beforeEach(() => {
        mockUseSelector.mockReturnValue(true); // Authenticated
      });

      it('adds totalAllowance to priority token when latest allowance is available', () => {
        const latestAllowance = '2000000000000';
        mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
          latestAllowance,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.priorityToken).toEqual({
          ...mockPriorityToken,
          totalAllowance: latestAllowance,
        });
      });

      it('uses existing allowance as totalAllowance when latest allowance is null', () => {
        mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
          latestAllowance: null,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.priorityToken).toEqual({
          ...mockPriorityToken,
          totalAllowance: mockPriorityToken.allowance,
        });
      });

      it('includes latest allowance loading state in overall loading state', () => {
        mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
          latestAllowance: null,
          isLoading: true,
          error: null,
          refetch: jest.fn(),
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.isLoading).toBe(true);
      });

      it('returns priority token without totalAllowance when priority token is null', () => {
        mockUseGetPriorityCardToken.mockReturnValue({
          priorityToken: null,
          allTokensWithAllowances: [],
          isLoading: false,
          error: false,
          warning: null,
          fetchPriorityToken: mockFetchPriorityToken,
        });
        mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
          latestAllowance: '2000000000000',
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.priorityToken).toBeNull();
      });

      it('updates priority token when latest allowance changes', () => {
        const initialAllowance = '1000000000000';
        const updatedAllowance = '3000000000000';

        mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
          latestAllowance: initialAllowance,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

        const { result, rerender } = renderHook(() => useLoadCardData());

        expect(result.current.priorityToken?.totalAllowance).toBe(
          initialAllowance,
        );

        mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
          latestAllowance: updatedAllowance,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

        rerender();

        expect(result.current.priorityToken?.totalAllowance).toBe(
          updatedAllowance,
        );
      });
    });

    describe('Unauthenticated Mode', () => {
      beforeEach(() => {
        mockUseSelector.mockReturnValue(false); // Unauthenticated
      });

      it('returns priority token without totalAllowance property', () => {
        const latestAllowance = '2000000000000';
        mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
          latestAllowance,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.priorityToken).toEqual(mockPriorityToken);
        expect(result.current.priorityToken).not.toHaveProperty(
          'totalAllowance',
        );
      });

      it('excludes latest allowance loading state from overall loading state', () => {
        mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
          latestAllowance: null,
          isLoading: true,
          error: null,
          refetch: jest.fn(),
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.isLoading).toBe(false);
      });

      it('ignores latest allowance when switching from authenticated to unauthenticated', () => {
        mockUseSelector.mockReturnValue(true); // Start authenticated
        const latestAllowance = '2000000000000';
        mockUseGetLatestAllowanceForPriorityToken.mockReturnValue({
          latestAllowance,
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        });

        const { result, rerender } = renderHook(() => useLoadCardData());

        expect(result.current.priorityToken?.totalAllowance).toBe(
          latestAllowance,
        );

        mockUseSelector.mockReturnValue(false); // Switch to unauthenticated

        rerender();

        expect(result.current.priorityToken).toEqual(mockPriorityToken);
        expect(result.current.priorityToken).not.toHaveProperty(
          'totalAllowance',
        );
      });
    });
  });

  describe('Fetch Functions', () => {
    beforeEach(() => {
      // Reset fetch mocks to ensure clean state for each test
      mockFetchPriorityToken.mockReset().mockResolvedValue(undefined);
      mockFetchCardDetails.mockReset().mockResolvedValue(undefined);
      mockFetchExternalWalletDetails.mockReset().mockResolvedValue(undefined);
    });

    it('exposes fetchPriorityToken function', async () => {
      const { result } = renderHook(() => useLoadCardData());

      await act(async () => {
        await result.current.fetchPriorityToken();
      });

      expect(mockFetchPriorityToken).toHaveBeenCalledTimes(1);
    });

    it('exposes fetchCardDetails function', async () => {
      const { result } = renderHook(() => useLoadCardData());

      await act(async () => {
        await result.current.fetchCardDetails();
      });

      expect(mockFetchCardDetails).toHaveBeenCalledTimes(1);
    });

    it('fetchAllData executes all fetches in parallel for unauthenticated mode', async () => {
      mockUseSelector.mockReturnValue(false); // Unauthenticated

      const { result } = renderHook(() => useLoadCardData());

      await act(async () => {
        await result.current.fetchAllData();
      });

      expect(mockFetchPriorityToken).toHaveBeenCalledTimes(1);
      expect(mockFetchCardDetails).not.toHaveBeenCalled();
      expect(mockFetchExternalWalletDetails).not.toHaveBeenCalled();
    });

    it('fetchAllData executes all fetches in parallel for authenticated mode', async () => {
      mockUseSelector.mockReturnValue(true); // Authenticated

      const { result } = renderHook(() => useLoadCardData());

      await act(async () => {
        await result.current.fetchAllData();
      });

      expect(mockFetchPriorityToken).toHaveBeenCalledTimes(1);
      expect(mockFetchCardDetails).toHaveBeenCalledTimes(1);
      expect(mockFetchExternalWalletDetails).toHaveBeenCalledTimes(1);
      expect(mockFetchKYCStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('KYC Status', () => {
    describe('Authenticated Mode', () => {
      beforeEach(() => {
        mockUseSelector.mockReturnValue(true); // Authenticated
      });

      it('returns KYC status when user is verified', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.kycStatus).toEqual({
          verificationState: 'VERIFIED',
          userId: 'user-123',
        });
      });

      it('returns KYC status when user verification is pending', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.kycStatus).toEqual({
          verificationState: 'PENDING',
          userId: 'user-123',
        });
      });

      it('returns KYC status when user verification is rejected', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: { verificationState: 'REJECTED', userId: 'user-123' },
          isLoading: false,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.kycStatus).toEqual({
          verificationState: 'REJECTED',
          userId: 'user-123',
        });
      });

      it('returns null KYC status when fetch fails', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: null,
          isLoading: false,
          error: new Error('KYC fetch failed'),
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.kycStatus).toBeNull();
      });

      it('includes KYC status loading state in overall loading state', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: null,
          isLoading: true,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.isLoading).toBe(true);
      });

      it('returns KYC error in combined error state', () => {
        const kycError = new Error('KYC verification failed');
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: null,
          isLoading: false,
          error: kycError,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.error).toEqual(kycError);
      });

      it('returns null KYC status with null verification state', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: { verificationState: null, userId: 'user-123' },
          isLoading: false,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.kycStatus).toEqual({
          verificationState: null,
          userId: 'user-123',
        });
      });

      it('fetches KYC status when fetchAllData is called', async () => {
        mockFetchKYCStatus.mockReset().mockResolvedValue(undefined);

        const { result } = renderHook(() => useLoadCardData());

        await act(async () => {
          await result.current.fetchAllData();
        });

        expect(mockFetchKYCStatus).toHaveBeenCalledTimes(1);
      });

      it('handles KYC status update when status changes', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: { verificationState: 'PENDING', userId: 'user-123' },
          isLoading: false,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result, rerender } = renderHook(() => useLoadCardData());

        expect(result.current.kycStatus?.verificationState).toBe('PENDING');

        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        rerender();

        expect(result.current.kycStatus?.verificationState).toBe('VERIFIED');
      });
    });

    describe('Unauthenticated Mode', () => {
      beforeEach(() => {
        mockUseSelector.mockReturnValue(false); // Unauthenticated
      });

      it('returns null KYC status', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.kycStatus).toBeNull();
      });

      it('excludes KYC loading state from overall loading state', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: null,
          isLoading: true,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.isLoading).toBe(false);
      });

      it('excludes KYC error from combined error state', () => {
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: null,
          isLoading: false,
          error: new Error('KYC error'),
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result } = renderHook(() => useLoadCardData());

        expect(result.current.error).toBeFalsy();
      });

      it('does not fetch KYC status when fetchAllData is called', async () => {
        mockFetchKYCStatus.mockReset().mockResolvedValue(undefined);

        const { result } = renderHook(() => useLoadCardData());

        await act(async () => {
          await result.current.fetchAllData();
        });

        expect(mockFetchKYCStatus).not.toHaveBeenCalled();
      });
    });

    describe('Mode Switching', () => {
      it('returns KYC status when switching from unauthenticated to authenticated', () => {
        mockUseSelector.mockReturnValue(false); // Start unauthenticated

        const { result, rerender } = renderHook(() => useLoadCardData());

        expect(result.current.kycStatus).toBeNull();

        mockUseSelector.mockReturnValue(true); // Switch to authenticated

        rerender();

        expect(result.current.kycStatus).toEqual({
          verificationState: 'VERIFIED',
          userId: 'user-123',
        });
      });

      it('returns null KYC status when switching from authenticated to unauthenticated', () => {
        mockUseSelector.mockReturnValue(true); // Start authenticated
        mockUseGetUserKYCStatus.mockReturnValue({
          kycStatus: { verificationState: 'VERIFIED', userId: 'user-123' },
          isLoading: false,
          error: null,
          fetchKYCStatus: mockFetchKYCStatus,
        });

        const { result, rerender } = renderHook(() => useLoadCardData());

        expect(result.current.kycStatus).toEqual({
          verificationState: 'VERIFIED',
          userId: 'user-123',
        });

        mockUseSelector.mockReturnValue(false); // Switch to unauthenticated

        rerender();

        expect(result.current.kycStatus).toBeNull();
      });
    });
  });

  describe('Warning Priority', () => {
    it('returns NoCard warning when both NoCard and NeedDelegation warnings exist', () => {
      mockUseGetPriorityCardToken.mockReturnValue({
        priorityToken: mockPriorityToken,
        allTokensWithAllowances: mockAllTokens,
        isLoading: false,
        error: false,
        warning: CardStateWarning.NeedDelegation,
        fetchPriorityToken: mockFetchPriorityToken,
      });

      mockUseCardDetails.mockReturnValue({
        cardDetails: mockCardDetails,
        isLoading: false,
        error: null,
        warning: CardStateWarning.NoCard,
        fetchCardDetails: mockFetchCardDetails,
        pollCardStatusUntilProvisioned: mockPollCardStatusUntilProvisioned,
        isLoadingPollCardStatusUntilProvisioned: false,
      });

      const { result } = renderHook(() => useLoadCardData());

      expect(result.current.warning).toBe(CardStateWarning.NoCard);
    });
  });
});
