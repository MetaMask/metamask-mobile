import { renderHook, act } from '@testing-library/react-hooks';
import { useUpdateTokenPriority } from './useUpdateTokenPriority';
import { useCardSDK } from '../sdk';
import { CardSDK } from '../sdk/CardSDK';
import {
  AllowanceState,
  CardTokenAllowance,
  CardExternalWalletDetailsResponse,
} from '../types';
import Logger from '../../../../util/Logger';

// Mock dependencies
jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../core/redux/slices/card', () => ({
  setAuthenticatedPriorityToken: jest.fn(),
  setAuthenticatedPriorityTokenLastFetched: jest.fn(),
  clearCacheData: jest.fn(),
}));

const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;

describe('useUpdateTokenPriority', () => {
  let mockSDK: {
    updateWalletPriority: jest.Mock;
  };
  let mockOnSuccess: jest.Mock;
  let mockOnError: jest.Mock;

  const createMockToken = (
    overrides: Partial<CardTokenAllowance> = {},
  ): CardTokenAllowance => ({
    address: '0x1234567890123456789012345678901234567890',
    caipChainId: 'eip155:59144',
    decimals: 18,
    symbol: 'USDC',
    name: 'USD Coin',
    allowanceState: AllowanceState.Enabled,
    allowance: '1000',
    availableBalance: '500',
    walletAddress: '0xwallet1',
    delegationContract: '0xdelegation123',
    priority: 2,
    ...overrides,
  });

  const createMockWalletDetails = (): CardExternalWalletDetailsResponse => [
    {
      id: 1,
      walletAddress: '0xwallet1',
      caipChainId: 'eip155:59144',
      tokenDetails: {
        address: '0x1234567890123456789012345678901234567890',
        symbol: 'USDC',
        decimals: 18,
        name: 'USD Coin',
      },
      allowance: '1000',
      priority: 2,
      balance: '500',
      currency: 'USDC',
      network: 'linea',
    },
    {
      id: 2,
      walletAddress: '0xwallet2',
      caipChainId: 'eip155:59144',
      tokenDetails: {
        address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        symbol: 'USDT',
        decimals: 6,
        name: 'Tether USD',
      },
      allowance: '500',
      priority: 1,
      balance: '250',
      currency: 'USDT',
      network: 'linea',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockSDK = {
      updateWalletPriority: jest.fn().mockResolvedValue({}),
    };

    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK as unknown as CardSDK,
    });

    mockOnSuccess = jest.fn();
    mockOnError = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('updateTokenPriority', () => {
    it('returns true and calls onSuccess when priority updates', async () => {
      const { result } = renderHook(() =>
        useUpdateTokenPriority({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );
      const mockToken = createMockToken();
      const mockWalletDetails = createMockWalletDetails();

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(
          mockToken,
          mockWalletDetails,
        );
      });

      expect(updateResult).toBe(true);
      expect(mockSDK.updateWalletPriority).toHaveBeenCalledWith([
        { id: 2, priority: 2 },
        { id: 1, priority: 1 },
      ]);
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnError).not.toHaveBeenCalled();
    });

    it('sets selected token as priority 1 and shifts others down', async () => {
      const { result } = renderHook(() =>
        useUpdateTokenPriority({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );
      const mockToken = createMockToken({ priority: 2 });
      const mockWalletDetails = createMockWalletDetails();

      await act(async () => {
        await result.current.updateTokenPriority(mockToken, mockWalletDetails);
      });

      // Selected token (wallet-1) should get priority 1
      // wallet-2 (previously priority 1) should shift to priority 2
      expect(mockSDK.updateWalletPriority).toHaveBeenCalledWith([
        { id: 2, priority: 2 }, // Previously 1
        { id: 1, priority: 1 }, // Selected token
      ]);
    });

    it('returns false when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        ...jest.requireMock('../sdk'),
        sdk: null,
      });
      const { result } = renderHook(() =>
        useUpdateTokenPriority({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );
      const mockToken = createMockToken();
      const mockWalletDetails = createMockWalletDetails();

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(
          mockToken,
          mockWalletDetails,
        );
      });

      expect(updateResult).toBe(false);
      expect(mockSDK.updateWalletPriority).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('returns false when external wallet details are empty', async () => {
      const { result } = renderHook(() =>
        useUpdateTokenPriority({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );
      const mockToken = createMockToken();

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(mockToken, []);
      });

      expect(updateResult).toBe(false);
      expect(mockSDK.updateWalletPriority).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('returns false when matching wallet is not found', async () => {
      const { result } = renderHook(() =>
        useUpdateTokenPriority({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );
      const mockToken = createMockToken({
        address: '0xnonexistent',
        walletAddress: '0xnonexistent',
      });
      const mockWalletDetails = createMockWalletDetails();

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(
          mockToken,
          mockWalletDetails,
        );
      });

      expect(updateResult).toBe(false);
      expect(mockSDK.updateWalletPriority).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('returns false and calls onError when SDK throws error', async () => {
      const sdkError = new Error('SDK update failed');
      mockSDK.updateWalletPriority.mockRejectedValue(sdkError);
      const { result } = renderHook(() =>
        useUpdateTokenPriority({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );
      const mockToken = createMockToken();
      const mockWalletDetails = createMockWalletDetails();

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(
          mockToken,
          mockWalletDetails,
        );
      });

      expect(updateResult).toBe(false);
      expect(mockOnError).toHaveBeenCalledWith(sdkError);
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalled();
    });

    it('returns true when called without callbacks', async () => {
      const { result } = renderHook(() => useUpdateTokenPriority());
      const mockToken = createMockToken();
      const mockWalletDetails = createMockWalletDetails();

      let updateResult: boolean | undefined;
      await act(async () => {
        updateResult = await result.current.updateTokenPriority(
          mockToken,
          mockWalletDetails,
        );
      });

      expect(updateResult).toBe(true);
      expect(mockSDK.updateWalletPriority).toHaveBeenCalled();
    });

    it('maintains order of non-selected wallets', async () => {
      const { result } = renderHook(() =>
        useUpdateTokenPriority({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );
      const mockWalletDetails: CardExternalWalletDetailsResponse = [
        {
          id: 3,
          walletAddress: '0xwallet3',
          caipChainId: 'eip155:59144',
          tokenDetails: {
            address: '0xtoken3',
            symbol: 'DAI',
            decimals: 18,
            name: 'Dai',
          },
          allowance: '300',
          priority: 3,
          balance: '150',
          currency: 'DAI',
          network: 'linea',
        },
        {
          id: 1,
          walletAddress: '0xwallet1',
          caipChainId: 'eip155:59144',
          tokenDetails: {
            address: '0x1234567890123456789012345678901234567890',
            symbol: 'USDC',
            decimals: 18,
            name: 'USD Coin',
          },
          allowance: '1000',
          priority: 2,
          balance: '500',
          currency: 'USDC',
          network: 'linea',
        },
        {
          id: 2,
          walletAddress: '0xwallet2',
          caipChainId: 'eip155:59144',
          tokenDetails: {
            address: '0xtoken2',
            symbol: 'USDT',
            decimals: 6,
            name: 'Tether USD',
          },
          allowance: '500',
          priority: 1,
          balance: '250',
          currency: 'USDT',
          network: 'linea',
        },
      ];
      const mockToken = createMockToken({ priority: 3 });

      await act(async () => {
        await result.current.updateTokenPriority(mockToken, mockWalletDetails);
      });

      // Selected wallet-1 should be priority 1
      // Others should maintain their relative order: wallet-2 (was 1) -> 2, wallet-3 (was 3) -> 3
      expect(mockSDK.updateWalletPriority).toHaveBeenCalledWith([
        { id: 2, priority: 2 },
        { id: 1, priority: 1 },
        { id: 3, priority: 3 },
      ]);
    });

    it('calls onSuccess when token has stagingTokenAddress', async () => {
      const { result } = renderHook(() =>
        useUpdateTokenPriority({
          onSuccess: mockOnSuccess,
          onError: mockOnError,
        }),
      );
      const mockToken = createMockToken({
        stagingTokenAddress: '0xstaging123',
      });
      const mockWalletDetails = createMockWalletDetails();

      await act(async () => {
        await result.current.updateTokenPriority(mockToken, mockWalletDetails);
      });

      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
