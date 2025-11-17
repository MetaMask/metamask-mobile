import { renderHook, act } from '@testing-library/react-hooks';
import {
  useEvmTokenConversion,
  areValidAllowedPaymentTokens,
} from './useEvmTokenConversion';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { generateTransferData } from '../../../../util/transactions';
import { EVM_TOKEN_CONVERSION_TRANSACTION_TYPE } from '../constants/musd';
import { MMM_ORIGIN } from '../../../Views/confirmations/constants/confirmations';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

// Mock all external dependencies
jest.mock('../../../../core/Engine');
jest.mock('../../../../util/Logger');
jest.mock('../../../../util/transactions');
jest.mock('@react-navigation/native');
jest.mock('react-redux');

const mockNavigation = {
  navigate: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  goBack: jest.fn(),
  isFocused: jest.fn(),
  canGoBack: jest.fn(),
  getState: jest.fn(),
  getParent: jest.fn(),
  setParams: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  getId: jest.fn(),
  dangerouslyGetParent: jest.fn(),
  dangerouslyGetState: jest.fn(),
};

const mockNetworkController = {
  findNetworkClientIdByChainId: jest.fn(),
};

const mockTransactionController = {
  addTransaction: jest.fn(),
};

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('useEvmTokenConversion', () => {
  const mockSelectedAccount = {
    address: '0x123456789abcdef' as Hex,
    id: 'account-1',
    metadata: {},
    options: {},
    methods: [],
    type: 'eip155:eoa',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue(mockNavigation);

    Object.defineProperty(Engine, 'context', {
      value: {
        NetworkController: mockNetworkController,
        TransactionController: mockTransactionController,
      },
      writable: true,
      configurable: true,
    });

    (generateTransferData as jest.Mock).mockReturnValue('0xmockedTransferData');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('initiateConversion', () => {
    const mockConfig = {
      outputToken: {
        address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA' as Hex,
        chainId: '0x1' as Hex,
        symbol: 'MUSD',
        name: 'MUSD',
        decimals: 6,
      },
      preferredPaymentToken: {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
        chainId: '0x1' as Hex,
      },
    };

    it('navigates with correct params', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useEvmTokenConversion());

      await result.current.initiateConversion(mockConfig);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: {
          loader: ConfirmationLoader.CustomAmount,
          preferredPaymentToken: mockConfig.preferredPaymentToken,
          outputToken: mockConfig.outputToken,
          allowedPaymentTokens: undefined,
        },
      });
    });

    it('creates transaction with correct data structure', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useEvmTokenConversion());

      await result.current.initiateConversion(mockConfig);

      expect(mockTransactionController.addTransaction).toHaveBeenCalledWith(
        {
          to: mockConfig.outputToken.address,
          from: mockSelectedAccount.address,
          data: '0xmockedTransferData',
          value: '0x0',
          chainId: mockConfig.outputToken.chainId,
        },
        {
          networkClientId: 'mainnet',
          origin: MMM_ORIGIN,
          type: EVM_TOKEN_CONVERSION_TRANSACTION_TYPE,
          nestedTransactions: [
            {
              to: mockConfig.outputToken.address,
              data: '0xmockedTransferData',
              value: '0x0',
            },
          ],
        },
      );
    });

    it('includes nestedTransactions array structure for Relay', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useEvmTokenConversion());

      await result.current.initiateConversion(mockConfig);

      const addTransactionCall =
        mockTransactionController.addTransaction.mock.calls[0];
      const options = addTransactionCall[1];

      expect(options.nestedTransactions).toBeDefined();
      expect(Array.isArray(options.nestedTransactions)).toBe(true);
      expect(options.nestedTransactions).toHaveLength(1);
      expect(options.nestedTransactions[0]).toEqual({
        to: mockConfig.outputToken.address,
        data: '0xmockedTransferData',
        value: '0x0',
      });
    });

    it('throws error when selectedAddress is missing', async () => {
      const mockSelectorFn = jest.fn(() => null);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(null);

      const { result } = renderHook(() => useEvmTokenConversion());

      await act(async () => {
        await expect(
          result.current.initiateConversion(mockConfig),
        ).rejects.toThrow('No account selected');
      });

      expect(Logger.error).toHaveBeenCalled();
    });

    it('throws error when networkClientId not found', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        undefined,
      );

      const { result } = renderHook(() => useEvmTokenConversion());

      await act(async () => {
        await expect(
          result.current.initiateConversion(mockConfig),
        ).rejects.toThrow('Network client not found for chain ID');
      });

      expect(Logger.error).toHaveBeenCalled();
    });

    it('throws error when outputToken is missing', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      const { result } = renderHook(() => useEvmTokenConversion());

      const invalidConfig = {
        ...mockConfig,
        outputToken: undefined,
      };

      await act(async () => {
        await expect(
          // @ts-expect-error - Intentionally testing invalid config with missing outputToken
          result.current.initiateConversion(invalidConfig),
        ).rejects.toThrow(
          'Output token and preferred payment token are required',
        );
      });
    });

    it('throws error when preferredPaymentToken is missing', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      const { result } = renderHook(() => useEvmTokenConversion());

      const invalidConfig = {
        ...mockConfig,
        preferredPaymentToken: undefined,
      };

      await act(async () => {
        await expect(
          // @ts-expect-error - Intentionally testing invalid config with missing preferredPaymentToken
          result.current.initiateConversion(invalidConfig),
        ).rejects.toThrow(
          'Output token and preferred payment token are required',
        );
      });
    });

    it('sets error state when transaction creation fails', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockRejectedValue(
        new Error('Transaction failed'),
      );

      const { result } = renderHook(() => useEvmTokenConversion());

      await act(async () => {
        await expect(
          result.current.initiateConversion(mockConfig),
        ).rejects.toThrow('Transaction failed');
      });

      expect(result.current.error).toBe('Transaction failed');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('uses custom navigationStack when provided', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useEvmTokenConversion());

      const configWithCustomStack = {
        ...mockConfig,
        navigationStack: 'CustomStack',
      };

      await result.current.initiateConversion(configWithCustomStack);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        'CustomStack',
        expect.anything(),
      );
    });

    it('includes allowedPaymentTokens in navigation params when provided', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useEvmTokenConversion());

      const allowedTokens: Record<Hex, Hex[]> = {
        '0x1': ['0xabc' as Hex],
      };

      const configWithAllowedTokens = {
        ...mockConfig,
        allowedPaymentTokens: allowedTokens,
      };

      await result.current.initiateConversion(configWithAllowedTokens);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: expect.objectContaining({
          allowedPaymentTokens: allowedTokens,
        }),
      });
    });

    it('returns transaction ID on success', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useEvmTokenConversion());

      const transactionId = await result.current.initiateConversion(mockConfig);

      expect(transactionId).toBe('tx-123');
    });
  });

  describe('error state', () => {
    it('initializes with null error', () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      const { result } = renderHook(() => useEvmTokenConversion());

      expect(result.current.error).toBeNull();
    });

    it('clears error on successful conversion attempt', async () => {
      const mockSelectorFn = jest.fn(() => mockSelectedAccount);
      mockUseSelector.mockReturnValue(mockSelectorFn);
      mockSelectorFn.mockReturnValue(mockSelectedAccount);

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );

      const { result } = renderHook(() => useEvmTokenConversion());

      const mockConfig = {
        outputToken: {
          address: '0xacA92E438df0B2401fF60dA7E4337B687a2435DA' as Hex,
          chainId: '0x1' as Hex,
          symbol: 'MUSD',
          name: 'MUSD',
          decimals: 6,
        },
        preferredPaymentToken: {
          address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
          chainId: '0x1' as Hex,
        },
      };

      mockTransactionController.addTransaction.mockRejectedValueOnce(
        new Error('Transaction failed'),
      );

      await act(async () => {
        await expect(
          result.current.initiateConversion(mockConfig),
        ).rejects.toThrow('Transaction failed');
      });

      expect(result.current.error).toBe('Transaction failed');

      mockTransactionController.addTransaction.mockResolvedValueOnce({
        transactionMeta: { id: 'tx-123' },
      });

      await act(async () => {
        await result.current.initiateConversion(mockConfig);
      });

      expect(result.current.error).toBeNull();
    });
  });
});

describe('areValidAllowedPaymentTokens', () => {
  it('returns true for valid Record<Hex, Hex[]>', () => {
    const validInput: Record<Hex, Hex[]> = {
      '0x1': ['0xabc' as Hex, '0xdef' as Hex],
      '0x2': ['0x123' as Hex],
    };

    const result = areValidAllowedPaymentTokens(validInput);

    expect(result).toBe(true);
  });

  it('returns false for null', () => {
    const result = areValidAllowedPaymentTokens(null);

    expect(result).toBe(false);
  });

  it('returns false for undefined', () => {
    const result = areValidAllowedPaymentTokens(undefined);

    expect(result).toBe(false);
  });

  it('returns false for arrays', () => {
    const result = areValidAllowedPaymentTokens(['0x1', '0x2']);

    expect(result).toBe(false);
  });

  it('returns false when keys are not hex strings', () => {
    const invalidInput = {
      notHex: ['0xabc' as Hex],
    };

    const result = areValidAllowedPaymentTokens(invalidInput);

    expect(result).toBe(false);
  });

  it('returns false when values are not arrays', () => {
    const invalidInput = {
      '0x1': '0xabc',
    };

    const result = areValidAllowedPaymentTokens(invalidInput);

    expect(result).toBe(false);
  });

  it('returns false when array elements are not hex strings', () => {
    const invalidInput = {
      '0x1': ['notHex'],
    };

    const result = areValidAllowedPaymentTokens(invalidInput);

    expect(result).toBe(false);
  });

  it('returns true for empty object', () => {
    const result = areValidAllowedPaymentTokens({});

    expect(result).toBe(true);
  });

  it('returns true for object with empty arrays', () => {
    const validInput: Record<Hex, Hex[]> = {
      '0x1': [],
    };

    const result = areValidAllowedPaymentTokens(validInput);

    expect(result).toBe(true);
  });
});
