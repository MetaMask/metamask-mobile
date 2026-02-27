import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import useCardDetails from './useCardDetails';
import {
  CardDetailsResponse,
  CardError,
  CardErrorType,
  CardStatus,
  CardType,
} from '../types';
import { CardSDK } from '../sdk/CardSDK';
import { dashboardKeys } from '../queries';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

const mockRefetch = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  }),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('useCardDetails', () => {
  const mockGetCardDetails = jest.fn();

  const mockSDK = {
    getCardDetails: mockGetCardDetails,
  } as unknown as CardSDK;

  const mockCardDetailsResponse: CardDetailsResponse = {
    id: 'card-123',
    holderName: 'John Doe',
    isFreezable: true,
    panLast4: '1234',
    status: CardStatus.ACTIVE,
    type: CardType.VIRTUAL,
    orderedAt: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSelector.mockReturnValue(true);

    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK,
    });

    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);
  });

  describe('Initial State', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useCardDetails());

      expect(result.current.cardDetails).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.warning).toBeNull();
    });
  });

  describe('Fetching Card Details', () => {
    it('returns card details data from useQuery', () => {
      const cardDetailsResult = {
        cardDetails: mockCardDetailsResponse,
        warning: null,
      };
      (useQuery as jest.Mock).mockReturnValue({
        data: cardDetailsResult,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useCardDetails());

      expect(result.current.cardDetails).toEqual(mockCardDetailsResponse);
      expect(result.current.warning).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('returns loading state from useQuery', () => {
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useCardDetails());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.cardDetails).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('exposes fetchCardDetails function', () => {
      const { result } = renderHook(() => useCardDetails());

      expect(typeof result.current.fetchCardDetails).toBe('function');
    });

    it('passes correct query key and options to useQuery', () => {
      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.queryKey).toEqual(dashboardKeys.cardDetails());
      expect(queryConfig.staleTime).toBe(60000);
      expect(queryConfig.enabled).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('returns error state from useQuery', () => {
      const mockError = new Error('Test error');
      (useQuery as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: mockError,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useCardDetails());

      expect(result.current.error).toBe(mockError);
      expect(result.current.cardDetails).toBeNull();
    });

    it('handles NO_CARD error in queryFn', async () => {
      const noCardError = new CardError(CardErrorType.NO_CARD, 'No card found');
      mockGetCardDetails.mockRejectedValue(noCardError);

      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result).toEqual({
        cardDetails: null,
        warning: 'no_card',
      });
    });

    it('throws error for other CardError types', async () => {
      const cardError = new CardError(
        CardErrorType.SERVER_ERROR,
        'Server error occurred',
      );
      mockGetCardDetails.mockRejectedValue(cardError);

      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];

      await expect(queryConfig.queryFn()).rejects.toThrow(cardError);
    });

    it('throws error for generic errors', async () => {
      const genericError = new Error('Network error');
      mockGetCardDetails.mockRejectedValue(genericError);

      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];

      await expect(queryConfig.queryFn()).rejects.toThrow(genericError);
    });
  });

  describe('Fetch Function Behavior', () => {
    it('disables query when user is not authenticated', () => {
      mockUseSelector.mockReturnValue(false);

      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.enabled).toBe(false);
    });

    it('disables query when SDK is not available', () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });

      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      expect(queryConfig.enabled).toBe(false);
    });

    it('fetches card details when authenticated and SDK is ready', async () => {
      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(mockGetCardDetails).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        cardDetails: mockCardDetailsResponse,
        warning: null,
      });
    });
  });

  describe('Warning States', () => {
    it('sets frozen warning when card status is FROZEN', async () => {
      const frozenCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.FROZEN,
      };
      mockGetCardDetails.mockResolvedValue(frozenCardResponse);

      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result).toEqual({
        cardDetails: frozenCardResponse,
        warning: 'frozen',
      });
    });

    it('sets blocked warning when card status is BLOCKED', async () => {
      const blockedCardResponse = {
        ...mockCardDetailsResponse,
        status: CardStatus.BLOCKED,
      };
      mockGetCardDetails.mockResolvedValue(blockedCardResponse);

      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result).toEqual({
        cardDetails: blockedCardResponse,
        warning: 'blocked',
      });
    });

    it('sets no card warning when NO_CARD error is thrown', async () => {
      const noCardError = new CardError(CardErrorType.NO_CARD, 'No card found');
      mockGetCardDetails.mockRejectedValue(noCardError);

      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result).toEqual({
        cardDetails: null,
        warning: 'no_card',
      });
    });

    it('does not set warning when card status is ACTIVE', async () => {
      mockGetCardDetails.mockResolvedValue(mockCardDetailsResponse);

      renderHook(() => useCardDetails());

      const queryConfig = (useQuery as jest.Mock).mock.calls[0][0];
      const result = await queryConfig.queryFn();

      expect(result).toEqual({
        cardDetails: mockCardDetailsResponse,
        warning: null,
      });
    });

    it('returns warning from useQuery data', () => {
      const cardDetailsResult = {
        cardDetails: {
          ...mockCardDetailsResponse,
          status: CardStatus.FROZEN,
        },
        warning: 'frozen' as const,
      };
      (useQuery as jest.Mock).mockReturnValue({
        data: cardDetailsResult,
        isLoading: false,
        error: null,
        refetch: mockRefetch,
      });

      const { result } = renderHook(() => useCardDetails());

      expect(result.current.warning).toBe('frozen');
      expect(result.current.error).toBeNull();
    });
  });
});
