import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardDelegation, UserCancelledError } from './useCardDelegation';
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
import { safeToChecksumAddress } from '../../../../util/address';
import { ARBITRARY_ALLOWANCE } from '../constants';
import {
  TransactionType,
  WalletDevice,
  TransactionStatus,
} from '@metamask/transaction-controller';
import TransactionTypes from '../../../../core/TransactionTypes';
import { handleSnapRequest } from '../../../../core/Snaps/utils';
import { SolMethod, SolScope } from '@metamask/keyring-api';

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
    CARD_DELEGATION_PROCESS_USER_CANCELED:
      'CARD_DELEGATION_PROCESS_USER_CANCELED',
  },
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../util/number', () => ({
  toTokenMinimalUnit: jest.fn(),
}));

jest.mock('../../../../util/address', () => ({
  safeToChecksumAddress: jest.fn(),
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
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
    call: jest.fn(),
  },
}));

jest.mock('../../../../core/Snaps/utils', () => ({
  handleSnapRequest: jest.fn(),
}));

const mockKeyringClientSubmitRequest = jest.fn();

jest.mock('@metamask/keyring-snap-client', () => ({
  KeyringClient: jest.fn().mockImplementation(() => ({
    submitRequest: mockKeyringClientSubmitRequest,
  })),
}));

jest.mock('../../../../core/SnapKeyring/SolanaWalletSnap', () => ({
  SolanaWalletSnapSender: jest.fn().mockImplementation(() => ({})),
  SOLANA_WALLET_SNAP_ID: 'npm:@metamask/solana-wallet-snap',
}));

const mockHandleSnapRequest = handleSnapRequest as jest.MockedFunction<
  typeof handleSnapRequest
>;

// Mock crypto.randomUUID for Solana tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn().mockReturnValue('mock-uuid-123'),
  },
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseCardSDK = useCardSDK as jest.MockedFunction<typeof useCardSDK>;
const mockUseMetrics = useMetrics as jest.MockedFunction<typeof useMetrics>;
const mockToTokenMinimalUnit = toTokenMinimalUnit as jest.MockedFunction<
  typeof toTokenMinimalUnit
>;
const mockSafeToChecksumAddress = safeToChecksumAddress as jest.MockedFunction<
  typeof safeToChecksumAddress
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
    buildSolanaApproveTransaction: jest.Mock;
    completeSolanaDelegation: jest.Mock;
  };
  let mockTrackEvent: jest.Mock;
  let mockCreateEventBuilder: jest.Mock;
  let mockBuild: jest.Mock;
  let mockAddProperties: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup SDK mock
    mockSDK = {
      generateDelegationToken: jest.fn(),
      encodeApproveTransaction: jest.fn(),
      completeEVMDelegation: jest.fn(),
      buildSolanaApproveTransaction: jest.fn(),
      completeSolanaDelegation: jest.fn(),
    };

    mockUseCardSDK.mockReturnValue({
      ...jest.requireMock('../sdk'),
      sdk: mockSDK as unknown as CardSDK,
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
        transactionMeta: {
          id: 'transaction-meta-id-123',
        },
      });
    Engine.context.NetworkController.findNetworkClientIdByChainId = jest
      .fn()
      .mockReturnValue(mockNetworkClientId);

    // Setup controllerMessenger mock to simulate transaction confirmation
    Engine.controllerMessenger.subscribeOnceIf = jest
      .fn()
      .mockImplementation((_eventName, callback, _filter) => {
        // Immediately call the callback with a confirmed transaction
        setImmediate(() => {
          callback({
            id: 'transaction-meta-id-123',
            status: TransactionStatus.confirmed,
          });
        });
      });

    // Setup utility mocks
    mockToTokenMinimalUnit.mockReturnValue('100000000000000000000');
    mockSafeToChecksumAddress.mockImplementation(
      (address?: string) => (address as `0x${string}`) || undefined,
    );

    // Setup SDK method mocks
    mockSDK.generateDelegationToken.mockResolvedValue({
      token: mockDelegationJWTToken,
      nonce: mockNonce,
    });
    mockSDK.encodeApproveTransaction.mockReturnValue('0xencodedData');
    mockSDK.completeEVMDelegation.mockResolvedValue({});
    mockSDK.buildSolanaApproveTransaction.mockResolvedValue(
      'base64EncodedTransaction',
    );
    mockSDK.completeSolanaDelegation.mockResolvedValue({});

    // Setup Solana Snap mocks
    mockHandleSnapRequest.mockResolvedValue({
      transactionId: 'solana-tx-hash',
    });
    mockKeyringClientSubmitRequest.mockResolvedValue({
      result: { signature: 'solana-signature-123' },
    });
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
        ...jest.requireMock('../sdk'),
        sdk: null,
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

    it('handles delegation completion failure after transaction confirmation', async () => {
      const completionError = new Error('API delegation completion failed');
      mockSDK.completeEVMDelegation.mockRejectedValue(completionError);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      Engine.controllerMessenger.subscribeOnceIf = jest
        .fn()
        .mockImplementation((_eventName, callback) => {
          // Immediately call the callback with a confirmed transaction
          setImmediate(() => {
            callback({
              id: 'transaction-meta-id-123',
              status: TransactionStatus.confirmed,
            });
          });
        });

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'API delegation completion failed',
        );
      });

      expect(result.current.error).toBe('API delegation completion failed');
      expect(Logger.error).toHaveBeenCalledWith(
        completionError,
        'Failed to complete EVM delegation',
      );
      // Transaction was confirmed but completion failed
      expect(mockSDK.completeEVMDelegation).toHaveBeenCalled();
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

  describe('user cancellation', () => {
    it('throws UserCancelledError when user denies transaction', async () => {
      const error = new Error('User denied transaction signature');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          UserCancelledError,
        );
      });

      expect(result.current.error).toBe('User denied transaction signature');
    });

    it('throws UserCancelledError when user rejects transaction', async () => {
      const error = new Error('User rejected the request');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          UserCancelledError,
        );
      });
    });

    it('throws UserCancelledError when user cancels transaction', async () => {
      const error = new Error('User cancelled transaction');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          UserCancelledError,
        );
      });
    });

    it('throws UserCancelledError when user cancels with alternate spelling', async () => {
      const error = new Error('User canceled the transaction');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          UserCancelledError,
        );
      });
    });

    it('throws regular error for non-cancellation errors', async () => {
      const error = new Error('Network connection failed');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'Network connection failed',
        );
      });

      expect(result.current.error).toBe('Network connection failed');
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

    it('does not track failed event when user cancels transaction', async () => {
      const error = new Error('User denied transaction signature');
      Engine.context.TransactionController.addTransaction = jest
        .fn()
        .mockRejectedValue(error);

      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          UserCancelledError,
        );
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_DELEGATION_PROCESS_USER_CANCELED,
      );
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_DELEGATION_PROCESS_FAILED,
      );
      expect(Logger.error).not.toHaveBeenCalled();
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
      expect(signedMessage).toContain(
        `Nonce: ${Buffer.from(mockNonce, 'utf8').toString('hex')}`,
      );
      expect(signedMessage).toContain('metamask.app.link wants you to sign in');
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

    it('subscribes to transaction confirmation event', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(Engine.controllerMessenger.subscribeOnceIf).toHaveBeenCalledWith(
        'TransactionController:transactionConfirmed',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('waits for transaction confirmation before completing delegation', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();
      let resolveConfirmation: () => void;
      const confirmationPromise = new Promise<void>((resolve) => {
        resolveConfirmation = resolve;
      });

      Engine.controllerMessenger.subscribeOnceIf = jest
        .fn()
        .mockImplementation((_eventName, callback) => {
          confirmationPromise.then(() => {
            callback({
              id: 'transaction-meta-id-123',
              status: TransactionStatus.confirmed,
            });
          });
        });

      const { result } = renderHook(() => useCardDelegation(mockToken));

      // Start delegation (don't await yet)
      let delegationPromise: Promise<void> = Promise.resolve();
      act(() => {
        delegationPromise = result.current.submitDelegation(params);
      });

      // Wait a bit to ensure subscription is set up
      await new Promise((resolve) => setTimeout(resolve, 100));

      // completeEVMDelegation should not be called yet
      expect(mockSDK.completeEVMDelegation).not.toHaveBeenCalled();

      // Simulate transaction confirmation
      await act(async () => {
        resolveConfirmation();
        // Wait for confirmation to process
        await new Promise((resolve) => setImmediate(resolve));
      });

      // Wait for delegation to complete
      await act(async () => {
        await delegationPromise;
      });

      // Now it should be called
      expect(mockSDK.completeEVMDelegation).toHaveBeenCalled();
    });

    it('handles transaction failure in confirmation listener', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      Engine.controllerMessenger.subscribeOnceIf = jest
        .fn()
        .mockImplementation((_eventName, callback) => {
          // Immediately call the callback with a failed transaction
          setImmediate(() => {
            callback({
              id: 'transaction-meta-id-123',
              status: TransactionStatus.failed,
              error: {
                message: 'Transaction execution failed',
              },
            });
          });
        });

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'Transaction execution failed',
        );
      });

      expect(result.current.error).toBe('Transaction execution failed');
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Transaction failed',
      );
      expect(mockSDK.completeEVMDelegation).not.toHaveBeenCalled();
    });

    it('handles transaction failure with generic message when error details not provided', async () => {
      const mockToken = createMockToken();
      const params = createMockDelegationParams();

      Engine.controllerMessenger.subscribeOnceIf = jest
        .fn()
        .mockImplementation((_eventName, callback) => {
          // Immediately call the callback with a failed transaction without error details
          setImmediate(() => {
            callback({
              id: 'transaction-meta-id-123',
              status: TransactionStatus.failed,
              error: undefined,
            });
          });
        });

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await expect(result.current.submitDelegation(params)).rejects.toThrow(
          'Transaction failed',
        );
      });

      expect(result.current.error).toBe('Transaction failed');
      expect(mockSDK.completeEVMDelegation).not.toHaveBeenCalled();
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

    it('uses raw address for solana network without checksum', async () => {
      const mockToken = createMockToken();
      const mockSolanaAddress = 'SolanaAddress123ABC';
      const mockSolanaAccountId = 'solana-account-uuid';
      const params = {
        ...createMockDelegationParams(),
        network: 'solana' as const,
      };

      mockUseSelector.mockReturnValue(
        jest.fn().mockReturnValue({
          address: mockSolanaAddress,
          id: mockSolanaAccountId,
        }),
      );

      // Setup Solana-specific mocks for this test
      mockKeyringClientSubmitRequest.mockResolvedValue({
        result: { signature: 'solana-signature' },
      });
      mockHandleSnapRequest.mockResolvedValue({
        transactionId: 'solana-tx-hash',
      });
      mockSDK.buildSolanaApproveTransaction.mockResolvedValue(
        'base64EncodedTransaction',
      );
      mockSDK.completeSolanaDelegation.mockResolvedValue({});

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockSafeToChecksumAddress).not.toHaveBeenCalled();
      expect(mockSDK.generateDelegationToken).toHaveBeenCalledWith(
        'solana',
        mockSolanaAddress,
      );
    });

    it('uses checksummed address for linea network', async () => {
      const mockToken = createMockToken();
      const mockRawAddress = '0xABCDEF123456';
      const mockChecksummedAddress = '0xabcdef123456' as `0x${string}`;
      const params = createMockDelegationParams();

      mockUseSelector.mockReturnValue(
        jest.fn().mockReturnValue({
          address: mockRawAddress,
        }),
      );

      mockSafeToChecksumAddress.mockReturnValue(mockChecksummedAddress);

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockSafeToChecksumAddress).toHaveBeenCalledWith(mockRawAddress);
      expect(mockSDK.generateDelegationToken).toHaveBeenCalledWith(
        'linea',
        mockChecksummedAddress,
      );
    });

    it('uses checksummed address for non-solana networks', async () => {
      const mockToken = createMockToken();
      const mockRawAddress = '0x1234567890ABCDEF';
      const mockChecksummedAddress = '0x1234567890abcdef' as `0x${string}`;
      const params = {
        ...createMockDelegationParams(),
        network: 'linea' as const,
      };

      mockUseSelector.mockReturnValue(
        jest.fn().mockReturnValue({
          address: mockRawAddress,
        }),
      );

      mockSafeToChecksumAddress.mockReturnValue(mockChecksummedAddress);

      const { result } = renderHook(() => useCardDelegation(mockToken));

      await act(async () => {
        await result.current.submitDelegation(params);
      });

      expect(mockSafeToChecksumAddress).toHaveBeenCalledWith(mockRawAddress);
      expect(
        Engine.context.KeyringController.signPersonalMessage,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          from: mockChecksummedAddress,
        }),
      );
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

  describe('Solana integration', () => {
    const mockSolanaAddress = 'SolanaAddress123ABC';
    const mockSolanaAccountId = 'solana-account-uuid-123';
    const mockSolanaSignature = 'solana-signature-123';
    const mockSolanaTxHash = 'solana-tx-hash';

    const createSolanaToken = (
      overrides: Partial<CardTokenAllowance> = {},
    ): CardTokenAllowance => ({
      address: 'SolanaTokenMintAddress123',
      caipChainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
      allowanceState: AllowanceState.Enabled,
      allowance: '1000',
      availableBalance: '500',
      walletAddress: mockSolanaAddress,
      delegationContract: 'SolanaDelegateAddress123',
      ...overrides,
    });

    const createSolanaDelegationParams = () => ({
      amount: '100',
      currency: 'USDC',
      network: 'solana' as const,
    });

    beforeEach(() => {
      // Setup selector mock for Solana account
      mockUseSelector.mockReturnValue(
        jest.fn().mockReturnValue({
          address: mockSolanaAddress,
          id: mockSolanaAccountId,
        }),
      );

      // Reset Solana-specific mocks
      mockHandleSnapRequest.mockResolvedValue({
        transactionId: mockSolanaTxHash,
      });
      mockKeyringClientSubmitRequest.mockResolvedValue({
        result: { signature: mockSolanaSignature },
      });
    });

    describe('generateSolanaSignatureMessage', () => {
      it('generates Solana SIWE message with correct format', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockKeyringClientSubmitRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            request: expect.objectContaining({
              method: 'signMessage',
              params: expect.objectContaining({
                scope: SolScope.Mainnet,
                account: expect.objectContaining({
                  address: mockSolanaAddress,
                }),
              }),
            }),
          }),
        );

        // Verify the message contains expected SIWE format for Solana
        const signCall = mockKeyringClientSubmitRequest.mock.calls[0][0];
        const base64Message = signCall.request.params.message;
        const decodedMessage = Buffer.from(base64Message, 'base64').toString(
          'utf8',
        );

        expect(decodedMessage).toContain('Solana account');
        expect(decodedMessage).toContain(mockSolanaAddress);
        expect(decodedMessage).toContain('Chain ID: 1');
        expect(decodedMessage).toContain(
          Buffer.from(mockNonce, 'utf8').toString('hex'),
        );
      });

      it('uses Chain ID 1 for Solana SIWE message regardless of token caipChainId', async () => {
        const mockToken = createSolanaToken({
          caipChainId: 'solana:devnet123',
        });
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        const signCall = mockKeyringClientSubmitRequest.mock.calls[0][0];
        const base64Message = signCall.request.params.message;
        const decodedMessage = Buffer.from(base64Message, 'base64').toString(
          'utf8',
        );

        expect(decodedMessage).toContain('Chain ID: 1');
      });
    });

    describe('signSolanaMessage', () => {
      it('signs message via Solana keyring client', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockKeyringClientSubmitRequest).toHaveBeenCalledWith({
          id: expect.any(String),
          scope: SolScope.Mainnet,
          account: mockSolanaAccountId,
          origin: 'metamask',
          request: {
            method: 'signMessage',
            params: {
              scope: SolScope.Mainnet,
              account: {
                address: mockSolanaAddress,
              },
              message: expect.any(String),
            },
          },
        });
      });

      it('throws error when account ID is missing', async () => {
        mockUseSelector.mockReturnValue(
          jest.fn().mockReturnValue({
            address: mockSolanaAddress,
            id: undefined,
          }),
        );

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'Account ID is required',
          );
        });

        expect(result.current.error).toBe('Account ID is required');
      });

      it('throws error when keyring client returns no signature', async () => {
        mockKeyringClientSubmitRequest.mockResolvedValue({
          result: {},
        });

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'No signature found',
          );
        });

        expect(result.current.error).toBe('No signature found');
      });

      it('logs error when signing fails', async () => {
        const signError = new Error('Keyring signing failed');
        mockKeyringClientSubmitRequest.mockRejectedValue(signError);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'Keyring signing failed',
          );
        });

        expect(Logger.log).toHaveBeenCalledWith(
          'Error signing Solana message:',
          signError,
        );
      });
    });

    describe('executeSolanaApprovalTransaction', () => {
      it('completes Solana delegation flow', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(mockSDK.generateDelegationToken).toHaveBeenCalledWith(
          'solana',
          mockSolanaAddress,
        );
        expect(mockSDK.buildSolanaApproveTransaction).toHaveBeenCalled();
        expect(mockHandleSnapRequest).toHaveBeenCalled();
        expect(mockSDK.completeSolanaDelegation).toHaveBeenCalled();
      });

      it('builds Solana approve transaction with correct parameters', async () => {
        const mockToken = createSolanaToken({ decimals: 6 });
        const params = createSolanaDelegationParams();

        mockToTokenMinimalUnit.mockReturnValue('100000000');

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.buildSolanaApproveTransaction).toHaveBeenCalledWith({
          tokenMintAddress: mockToken.address,
          delegateAddress: '3UsCVSxLJmWXBKFyVSsCJTG133dd1sMuxo1Uee5wqqUn',
          ownerAddress: mockSolanaAddress,
          amount: '100000000',
        });
      });

      it('uses stagingTokenAddress for Solana when present', async () => {
        const mockToken = createSolanaToken({
          stagingTokenAddress: 'StagingSolanaTokenMint123',
        });
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.buildSolanaApproveTransaction).toHaveBeenCalledWith(
          expect.objectContaining({
            tokenMintAddress: 'StagingSolanaTokenMint123',
          }),
        );
      });

      it('uses default decimals of 6 for Solana when not provided', async () => {
        const mockToken = createSolanaToken({ decimals: undefined });
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockToTokenMinimalUnit).toHaveBeenCalledWith(params.amount, 6);
      });

      it('submits transaction through Solana Snap with correct parameters', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockHandleSnapRequest).toHaveBeenCalledWith(
          Engine.controllerMessenger,
          {
            origin: 'metamask',
            snapId: 'npm:@metamask/solana-wallet-snap',
            handler: 'onClientRequest',
            request: {
              id: expect.any(String),
              jsonrpc: '2.0',
              method: SolMethod.SignAndSendTransaction,
              params: {
                transaction: 'base64EncodedTransaction',
                scope: SolScope.Mainnet,
                accountId: mockSolanaAccountId,
              },
            },
          },
        );
      });

      it('calls completeSolanaDelegation with correct parameters', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.completeSolanaDelegation).toHaveBeenCalledWith({
          address: mockSolanaAddress,
          network: 'solana',
          currency: 'usdc',
          amount: params.amount,
          txHash: mockSolanaTxHash,
          sigHash: mockSolanaSignature,
          sigMessage: expect.any(String),
          token: mockDelegationJWTToken,
        });
      });
    });

    describe('Solana snap response formats', () => {
      it('extracts transactionId from snap response object', async () => {
        mockHandleSnapRequest.mockResolvedValue({
          transactionId: 'tx-from-transactionId',
        });

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.completeSolanaDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            txHash: 'tx-from-transactionId',
          }),
        );
      });

      it('extracts signature from snap response object', async () => {
        mockHandleSnapRequest.mockResolvedValue({
          signature: 'tx-from-signature',
        });

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.completeSolanaDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            txHash: 'tx-from-signature',
          }),
        );
      });

      it('extracts signature from nested result object', async () => {
        mockHandleSnapRequest.mockResolvedValue({
          result: { signature: 'tx-from-result-signature' },
        });

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.completeSolanaDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            txHash: 'tx-from-result-signature',
          }),
        );
      });

      it('extracts transactionId from nested result object', async () => {
        mockHandleSnapRequest.mockResolvedValue({
          result: { transactionId: 'tx-from-result-transactionId' },
        });

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.completeSolanaDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            txHash: 'tx-from-result-transactionId',
          }),
        );
      });

      it('handles direct string response from snap', async () => {
        mockHandleSnapRequest.mockResolvedValue('direct-string-tx-hash');

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.completeSolanaDelegation).toHaveBeenCalledWith(
          expect.objectContaining({
            txHash: 'direct-string-tx-hash',
          }),
        );
      });

      it('throws error when no transaction signature returned', async () => {
        mockHandleSnapRequest.mockResolvedValue({});

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'No transaction signature returned from Solana Snap',
          );
        });

        expect(result.current.error).toBe(
          'No transaction signature returned from Solana Snap',
        );
      });

      it('throws error when snap returns null', async () => {
        mockHandleSnapRequest.mockResolvedValue(null);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'No transaction signature returned from Solana Snap',
          );
        });
      });
    });

    describe('Solana error handling', () => {
      it('throws error when token configuration is missing for Solana', async () => {
        const mockToken = createSolanaToken({ delegationContract: undefined });
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'Missing token configuration',
          );
        });

        expect(result.current.error).toBe('Missing token configuration');
      });

      it('throws error when Solana token address is missing', async () => {
        const mockToken = createSolanaToken({
          address: undefined,
          stagingTokenAddress: undefined,
        });
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'Missing token address',
          );
        });

        expect(result.current.error).toBe('Missing token address');
      });

      it('logs error when Solana transaction fails', async () => {
        const snapError = new Error('Solana transaction failed');
        mockHandleSnapRequest.mockRejectedValue(snapError);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'Solana transaction failed',
          );
        });

        expect(Logger.error).toHaveBeenCalledWith(
          snapError,
          'Failed to execute Solana approval transaction',
        );
      });

      it('throws error when Solana delegation completion fails', async () => {
        const completionError = new Error(
          'Solana delegation completion failed',
        );
        mockSDK.completeSolanaDelegation.mockRejectedValue(completionError);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'Solana delegation completion failed',
          );
        });

        expect(result.current.error).toBe(
          'Solana delegation completion failed',
        );
      });
    });

    describe('Solana user cancellation', () => {
      it('throws UserCancelledError when user denies Solana transaction', async () => {
        const error = new Error('User denied transaction');
        mockHandleSnapRequest.mockRejectedValue(error);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            UserCancelledError,
          );
        });

        expect(result.current.error).toBe('User denied transaction');
      });

      it('throws UserCancelledError when user rejects Solana transaction', async () => {
        const error = new Error('User rejected the request');
        mockHandleSnapRequest.mockRejectedValue(error);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            UserCancelledError,
          );
        });
      });

      it('throws UserCancelledError when user cancels Solana transaction', async () => {
        const error = new Error('User cancelled transaction');
        mockHandleSnapRequest.mockRejectedValue(error);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            UserCancelledError,
          );
        });
      });

      it('throws UserCancelledError with alternate spelling for Solana', async () => {
        const error = new Error('User canceled the transaction');
        mockHandleSnapRequest.mockRejectedValue(error);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            UserCancelledError,
          );
        });
      });

      it('tracks user cancelled event for Solana transactions', async () => {
        const error = new Error('User denied transaction');
        mockHandleSnapRequest.mockRejectedValue(error);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            UserCancelledError,
          );
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_DELEGATION_PROCESS_USER_CANCELED,
        );
        expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_DELEGATION_PROCESS_FAILED,
        );
      });

      it('throws regular error for non-cancellation Solana errors', async () => {
        const error = new Error('Network connection failed');
        mockHandleSnapRequest.mockRejectedValue(error);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(result.current.submitDelegation(params)).rejects.toThrow(
            'Network connection failed',
          );
        });

        expect(result.current.error).toBe('Network connection failed');
      });
    });

    describe('Solana metrics tracking', () => {
      it('tracks delegation started event for Solana', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_DELEGATION_PROCESS_STARTED,
        );
        expect(mockAddProperties).toHaveBeenCalledWith({
          token_symbol: params.currency,
          token_chain_id: 'solana',
          delegation_type: 'limited',
          delegation_amount: 100,
        });
      });

      it('tracks delegation completed event for Solana', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_DELEGATION_PROCESS_COMPLETED,
        );
      });

      it('tracks delegation failed event for Solana errors', async () => {
        const error = new Error('Solana transaction failed');
        mockHandleSnapRequest.mockRejectedValue(error);

        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await expect(
            result.current.submitDelegation(params),
          ).rejects.toThrow();
        });

        expect(mockCreateEventBuilder).toHaveBeenCalledWith(
          MetaMetricsEvents.CARD_DELEGATION_PROCESS_FAILED,
        );
      });
    });

    describe('Solana does not use EVM components', () => {
      it('does not call EVM TransactionController for Solana', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(
          Engine.context.TransactionController.addTransaction,
        ).not.toHaveBeenCalled();
      });

      it('does not call EVM KeyringController for signing for Solana', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(
          Engine.context.KeyringController.signPersonalMessage,
        ).not.toHaveBeenCalled();
      });

      it('does not call encodeApproveTransaction for Solana', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.encodeApproveTransaction).not.toHaveBeenCalled();
      });

      it('does not call completeEVMDelegation for Solana', async () => {
        const mockToken = createSolanaToken();
        const params = createSolanaDelegationParams();

        const { result } = renderHook(() => useCardDelegation(mockToken));

        await act(async () => {
          await result.current.submitDelegation(params);
        });

        expect(mockSDK.completeEVMDelegation).not.toHaveBeenCalled();
      });
    });
  });
});
