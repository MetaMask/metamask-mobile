import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardDelegation } from './useCardDelegation';
import { useCardSDK } from '../sdk';
import { CardSDK } from '../sdk/CardSDK';
import { CardTokenAllowance, AllowanceState } from '../types';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import {
  IUseMetricsHook,
  MetaMetricsEvents,
  useMetrics,
} from '../../../hooks/useMetrics';
import { toTokenMinimalUnit } from '../../../../util/number';
import { ARBITRARY_ALLOWANCE } from '../constants';
import {
  TransactionType,
  WalletDevice,
} from '@metamask/transaction-controller';
import TransactionTypes from '../../../../core/TransactionTypes';

// Mock dependencies
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../sdk', () => ({
  useCardSDK: jest.fn(),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    CARD_DELEGATION_PROCESS_STARTED: 'CARD_DELEGATION_PROCESS_STARTED',
    CARD_DELEGATION_PROCESS_COMPLETED: 'CARD_DELEGATION_PROCESS_COMPLETED',
    CARD_DELEGATION_PROCESS_FAILED: 'CARD_DELEGATION_PROCESS_FAILED',
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../../../../util/number', () => ({
  toTokenMinimalUnit: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    KeyringController: {
      signPersonalMessage: jest.fn(),
    },
    TransactionController: {
      addTransaction: jest.fn(),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(),
    },
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
const mockToTokenMinimalUnit = toTokenMinimalUnit as jest.MockedFunction<
  typeof toTokenMinimalUnit
>;

// Helper functions
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
  ...overrides,
});

const createMockDelegationParams = () => ({
  amount: '100',
  currency: 'USDC',
  network: 'linea' as const,
});

describe('useCardDelegation', () => {
  const mockAddress = '0xUserAddress123';
  const mockSignature = '0xSignature123';
  const mockDelegationJWTToken = 'jwt-token-123';
  const mockNonce = 'nonce-123';
  const mockTxHash = '0xTxHash123';
  const mockNetworkClientId = 'network-client-123';

  let mockSDK: {
    generateDelegationToken: jest.Mock;
    encodeApproveTransaction: jest.Mock;
    completeEVMDelegation: jest.Mock;
  };
  let mockTrackEvent: jest.Mock;
  let mockCreateEventBuilder: jest.Mock;
  let mockBuild: jest.Mock;
  let mockAddProperties: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock setTimeout to execute callback immediately (synchronously)
    // This bypasses the 10-second delay in the hook for faster tests
    jest
      .spyOn(global, 'setTimeout')
      .mockImplementation((cb: TimerHandler, _ms?: number): NodeJS.Timeout => {
        if (typeof cb === 'function') {
          cb();
        }
        return 0 as unknown as NodeJS.Timeout;
      });

    // Setup SDK mock
    mockSDK = {
      generateDelegationToken: jest.fn(),
      encodeApproveTransaction: jest.fn(),
      completeEVMDelegation: jest.fn(),
    };

    mockUseCardSDK.mockReturnValue({
      sdk: mockSDK as unknown as CardSDK,
      isLoading: false,
      user: null,
      setUser: jest.fn(),
      logoutFromProvider: jest.fn(),
    });

    // Setup metrics mock
    mockBuild = jest.fn().mockReturnValue({ event: 'mock-event' });
    mockAddProperties = jest.fn().mockReturnValue({ build: mockBuild });
    mockCreateEventBuilder = jest.fn().mockReturnValue({
      addProperties: mockAddProperties,
    });
    mockTrackEvent = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseMetrics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
      isEnabled: jest.fn().mockReturnValue(true),
      enable: jest.fn(),
      addTraitsToUser: jest.fn(),
      createDataDeletionTask: jest.fn(),
      checkDataDeleteStatus: jest.fn(),
      getMetaMetricsId: jest.fn(),
      isDataRecorded: jest.fn().mockReturnValue(true),
      getDeleteRegulationId: jest.fn(),
      getDeleteRegulationCreationDate: jest.fn(),
    } as IUseMetricsHook);

    // Setup selector mock - returns a function that returns account
    mockUseSelector.mockReturnValue(
      jest.fn().mockReturnValue({
        address: mockAddress,
      }),
    );

    // Setup Engine mocks
    Engine.context.KeyringController.signPersonalMessage = jest
      .fn()
      .mockResolvedValue(mockSignature);
    Engine.context.TransactionController.addTransaction = jest
      .fn()
      .mockResolvedValue({
        result: Promise.resolve(mockTxHash),
      });
    Engine.context.NetworkController.findNetworkClientIdByChainId = jest
      .fn()
      .mockReturnValue(mockNetworkClientId);

    // Setup utility mocks
    mockToTokenMinimalUnit.mockReturnValue('100000000000000000000');

    // Setup SDK method mocks
    mockSDK.generateDelegationToken.mockResolvedValue({
      token: mockDelegationJWTToken,
      nonce: mockNonce,
    });
    mockSDK.encodeApproveTransaction.mockReturnValue('0xencodedData');
    mockSDK.completeEVMDelegation.mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial state', () => {
    it('initializes with correct default values', () => {
      const { result } = renderHook(() => useCardDelegation());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.submitDelegation).toBe('function');
    });

    it('accepts token parameter', () => {
      const mockToken = createMockToken();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('works with null token', () => {
      const { result } = renderHook(() => useCardDelegation(null));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('submitDelegation', () => {
    it('completes delegation flow for limited allowance', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockSDK.generateDelegationToken).toHaveBeenCalledWith(
        params.network,
        mockAddress,
      );
      expect(
        Engine.context.KeyringController.signPersonalMessage,
      ).toHaveBeenCalled();
      expect(mockSDK.encodeApproveTransaction).toHaveBeenCalled();
      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalled();
      expect(mockSDK.completeEVMDelegation).toHaveBeenCalled();
    });

    it('completes delegation flow for full allowance', async () => {
      const mockToken = createMockToken();
      const params = {
        ...createMockDelegationParams(),
        amount: ARBITRARY_ALLOWANCE.toString(),
      };

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'mock-event' }),
      );
    });

    it('sets loading state during delegation process', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      let resolveGenerateDelegation: (value: {
        token: string;
        nonce: string;
      }) => void;
      const generateDelegationPromise = new Promise<{
        token: string;
        nonce: string;
      }>((resolve) => {
        resolveGenerateDelegation = resolve;
      });

      mockSDK.generateDelegationToken.mockReturnValue(
        generateDelegationPromise,
      );

      const { result } = renderHook(() => useCardDelegation(mockToken));

      act(() => {
        result.current.submitDelegation(params);
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();

      await act(async () => {
        resolveGenerateDelegation({
          token: mockDelegationJWTToken,
          nonce: mockNonce,
        });
        // Wait for promises to resolve
        await new Promise((resolve) => setImmediate(resolve));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('uses stagingTokenAddress when present', async () => {
      const mockToken = createMockToken({
        stagingTokenAddress: '0xStagingToken123',
      });
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '0xStagingToken123',
        }),
        expect.any(Object),
      );
    });

    it('uses regular address when stagingTokenAddress is not present', async () => {
      const mockToken = createMockToken({
        address: '0xRegularToken123',
      });
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '0xRegularToken123',
        }),
        expect.any(Object),
      );
    });

    it('converts amount to minimal units correctly', async () => {
      const mockToken = createMockToken({ decimals: 6 });
      const params = createMockDelegationParams();

      mockToTokenMinimalUnit.mockReturnValue('100000000');

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockToTokenMinimalUnit).toHaveBeenCalledWith(params.amount, 6);
      expect(mockSDK.encodeApproveTransaction).toHaveBeenCalledWith(
        mockToken.delegationContract,
        '100000000',
      );
    });

    it('uses default decimals of 18 when token decimals not provided', async () => {
      const mockToken = createMockToken({ decimals: undefined });
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockToTokenMinimalUnit).toHaveBeenCalledWith(params.amount, 18);
    });

    it('calls completeEVMDelegation with correct parameters', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockSDK.completeEVMDelegation).toHaveBeenCalledWith({
        address: mockAddress,
        network: params.network,
        currency: params.currency.toLowerCase(),
        amount: params.amount,
        txHash: mockTxHash,
        sigHash: mockSignature,
        sigMessage: expect.any(String),
        token: mockDelegationJWTToken,
      });
    });
  });

  describe('error handling', () => {
    it('throws error when SDK is not available', async () => {
      mockUseCardSDK.mockReturnValue({
        sdk: null,
        isLoading: false,
        user: null,
        setUser: jest.fn(),
        logoutFromProvider: jest.fn(),
      });

      const params = createMockDelegationParams();
      const { result } = renderHook(() => useCardDelegation());

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'Card SDK not available',
        );
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('throws error when token configuration is missing', async () => {
      const mockToken = createMockToken({ delegationContract: undefined });
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'Missing token configuration',
        );
      });

      expect(result.current.error).toBe('Missing token configuration');
    });

    it('throws error when token address is missing', async () => {
      const mockToken = createMockToken({
        address: undefined,
        stagingTokenAddress: undefined,
      });
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'Missing token address',
        );
      });

      expect(result.current.error).toBe('Missing token address');
    });

    it('throws error when no account is found', async () => {
      mockUseSelector.mockReturnValue(jest.fn().mockReturnValue(null));

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'No account found',
        );
      });

      expect(result.current.error).toBe('No account found');
    });

    it('handles error during token generation', async () => {
      const error = new Error('Token generation failed');
      mockSDK.generateDelegationToken.mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'Token generation failed',
        );
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Token generation failed');
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'useCardDelegation: Delegation failed',
      );
    });

    it('handles error during signature signing', async () => {
      const error = new Error('Signature failed');
      Engine.context.KeyringController.signPersonalMessage = jest
        .fn()
        .mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'Signature failed',
        );
      });

      expect(result.current.error).toBe('Signature failed');
    });

    it('handles error during transaction submission', async () => {
      const error = new Error('Transaction failed');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'Transaction failed',
        );
      });

      expect(result.current.error).toBe('Transaction failed');
    });

    it('handles error during delegation completion', async () => {
      const error = new Error('Delegation completion failed');
      mockSDK.completeEVMDelegation.mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      let thrownError;
      await act(async () => {
        try {
          await result.current.submitDelegation(params);
        } catch (err) {
          thrownError = err;
        }
      });

      expect(thrownError).toEqual(error);
      expect(result.current.error).toBe('Delegation completion failed');
    });

    it('handles non-Error objects thrown during delegation', async () => {
      mockSDK.generateDelegationToken.mockRejectedValue('String error');

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        try {
          await result.current.submitDelegation(params);
        } catch (error) {
          // Expect the error to be re-thrown as-is (a string in this case)
          expect(error).toBe('String error');
        }
      });

      expect(result.current.error).toBe('Delegation failed');
    });
  });

  describe('metrics tracking', () => {
    it('tracks delegation process started event', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_DELEGATION_PROCESS_STARTED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        token_symbol: params.currency,
        token_chain_id: params.network,
        delegation_type: 'limited',
        delegation_amount: 100,
      });
    });

    it('tracks delegation process completed event', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_DELEGATION_PROCESS_COMPLETED,
      );
    });

    it('tracks delegation process failed event on error', async () => {
      const error = new Error('Delegation failed');
      mockSDK.generateDelegationToken.mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow();
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_DELEGATION_PROCESS_FAILED,
      );
    });

    it('tracks full delegation type for arbitrary allowance', async () => {
      const mockToken = createMockToken();
      const params = {
        ...createMockDelegationParams(),
        amount: (ARBITRARY_ALLOWANCE + 1).toString(),
      };

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          delegation_type: 'full',
        }),
      );
    });

    it('tracks zero delegation amount for NaN values', async () => {
      const mockToken = createMockToken();
      const params = {
        ...createMockDelegationParams(),
        amount: 'invalid-number',
      };

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          delegation_amount: 0,
        }),
      );
    });
  });

  describe('generateSignatureMessage', () => {
    it('generates SIWE message with correct format', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      const mockSignPersonalMessage = Engine.context.KeyringController
        .signPersonalMessage as jest.MockedFunction<
        typeof Engine.context.KeyringController.signPersonalMessage
      >;
      const signCallArgs = mockSignPersonalMessage.mock.calls[0][0];
      const signedMessageHex = signCallArgs.data;
      const signedMessage = Buffer.from(
        signedMessageHex.slice(2),
        'hex',
      ).toString('utf8');

      expect(signedMessage).toContain(`${mockAddress}`);
      expect(signedMessage).toContain('Chain ID: 59144');
      expect(signedMessage).toContain(`Nonce: ${mockNonce}`);
      expect(signedMessage).toContain('MetaMask Mobile wants you to sign in');
    });

    it('extracts chain ID from token caipChainId', async () => {
      const mockToken = createMockToken({ caipChainId: 'eip155:1' });
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      const mockSignPersonalMessage = Engine.context.KeyringController
        .signPersonalMessage as jest.MockedFunction<
        typeof Engine.context.KeyringController.signPersonalMessage
      >;
      const signCallArgs = mockSignPersonalMessage.mock.calls[0][0];
      const signedMessageHex = signCallArgs.data;
      const signedMessage = Buffer.from(
        signedMessageHex.slice(2),
        'hex',
      ).toString('utf8');

      expect(signedMessage).toContain('Chain ID: 1');
    });

    it('uses default chain ID when caipChainId is not provided', async () => {
      const mockToken = createMockToken({ caipChainId: undefined });
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      const mockSignPersonalMessage = Engine.context.KeyringController
        .signPersonalMessage as jest.MockedFunction<
        typeof Engine.context.KeyringController.signPersonalMessage
      >;
      const signCallArgs = mockSignPersonalMessage.mock.calls[0][0];
      const signedMessageHex = signCallArgs.data;
      const signedMessage = Buffer.from(
        signedMessageHex.slice(2),
        'hex',
      ).toString('utf8');

      expect(signedMessage).toContain('Chain ID: 59144');
    });
  });

  describe('transaction parameters', () => {
    it('creates transaction with correct parameters', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledWith(
        {
          from: mockAddress,
          to: mockToken.address,
          data: '0xencodedData',
        },
        {
          networkClientId: mockNetworkClientId,
          origin: TransactionTypes.MMM,
          type: TransactionType.tokenMethodApprove,
          deviceConfirmedOn: WalletDevice.MM_MOBILE,
          requireApproval: true,
        },
      );
    });

    it('finds network client by chain ID', async () => {
      const mockToken = createMockToken({ caipChainId: 'eip155:137' });
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(
        Engine.context.NetworkController.findNetworkClientIdByChainId,
      ).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles undefined token parameter', async () => {
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(undefined));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow();
      });
    });

    it('handles solana network selection', async () => {
      const mockToken = createMockToken();
      const params = {
        ...createMockDelegationParams(),
        network: 'solana' as const,
      };

      mockUseSelector.mockReturnValue(
        jest.fn().mockReturnValue({
          address: mockAddress,
        }),
      );

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockUseSelector).toHaveBeenCalled();
    });

    it('handles very large allowance amounts', async () => {
      const mockToken = createMockToken();
      const params = {
        ...createMockDelegationParams(),
        amount: '999999999999999999999999999',
      };

      mockToTokenMinimalUnit.mockReturnValue(
        '999999999999999999999999999000000000000000000',
      );

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockSDK.encodeApproveTransaction).toHaveBeenCalledWith(
        mockToken.delegationContract,
        '999999999999999999999999999000000000000000000',
      );
    });

    it('handles token with zero decimals', async () => {
      const mockToken = createMockToken({ decimals: 0 });
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockToTokenMinimalUnit).toHaveBeenCalledWith(params.amount, 0);
    });

    it('converts currency to lowercase for SDK call', async () => {
      const mockToken = createMockToken();
      const params = {
        ...createMockDelegationParams(),
        currency: 'USDC',
      };

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockSDK.completeEVMDelegation).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'usdc',
        }),
      );
    });
  });
});
