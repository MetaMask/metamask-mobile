import { renderHook, act } from '@testing-library/react-hooks';
import { useMusdConversion, MusdConversionConfig } from './useMusdConversion';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { generateTransferData } from '../../../../util/transactions';
import { MMM_ORIGIN } from '../../../Views/confirmations/constants/confirmations';
import Routes from '../../../../constants/navigation/Routes';
import { ConfirmationLoader } from '../../../Views/confirmations/components/confirm/confirm-component';
import { Hex } from '@metamask/utils';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { selectMusdConversionEducationSeen } from '../../../../reducers/user';

// Mock all external dependencies
jest.mock('../../../../core/Engine');
jest.mock('../../../../util/Logger');
jest.mock('../../../../util/transactions');
jest.mock('@react-navigation/native');
jest.mock('react-redux');
jest.mock(
  '../../../Views/confirmations/components/confirm/confirm-component',
  () => ({
    ConfirmationLoader: {
      CustomAmount: 'customAmount',
    },
  }),
);

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

describe('useMusdConversion', () => {
  const mockSelectedAccount = {
    address: '0x123456789abcdef' as Hex,
    id: 'account-1',
    metadata: {},
    options: {},
    methods: [],
    type: 'eip155:eoa',
  };

  const setupUseSelectorMock = ({
    selectedAccount = mockSelectedAccount,
    hasSeenConversionEducationScreen = true,
  }: {
    selectedAccount?: typeof mockSelectedAccount | null;
    hasSeenConversionEducationScreen?: boolean;
  } = {}) => {
    const mockAccountSelector = jest.fn(() => selectedAccount);
    mockUseSelector.mockReset();
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectMusdConversionEducationSeen) {
        return hasSeenConversionEducationScreen;
      }

      return mockAccountSelector;
    });

    return { mockAccountSelector };
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
      outputChainId: '0x1' as Hex,
      preferredPaymentToken: {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as Hex,
        chainId: '0x1' as Hex,
      },
    };

    it('navigates with correct params', async () => {
      setupUseSelectorMock();

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useMusdConversion());

      await result.current.initiateConversion(mockConfig);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: {
          loader: ConfirmationLoader.CustomAmount,
          preferredPaymentToken: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
          },
          outputChainId: '0x1',
        },
      });
    });

    it('creates transaction with correct data structure', async () => {
      setupUseSelectorMock();

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useMusdConversion());

      await result.current.initiateConversion(mockConfig);

      expect(mockTransactionController.addTransaction).toHaveBeenCalledWith(
        {
          to: '0xaca92e438df0b2401ff60da7e4337b687a2435da',
          from: '0x123456789abcdef',
          data: '0xmockedTransferData',
          value: '0x0',
          chainId: '0x1',
        },
        {
          networkClientId: 'mainnet',
          origin: MMM_ORIGIN,
          skipInitialGasEstimate: true,
          type: TransactionType.musdConversion,
        },
      );
    });

    it('throws error when selectedAddress is missing', async () => {
      setupUseSelectorMock({ selectedAccount: null });

      const { result } = renderHook(() => useMusdConversion());

      await act(async () => {
        await expect(
          result.current.initiateConversion(mockConfig),
        ).rejects.toThrow('No account selected');
      });

      expect(Logger.error).toHaveBeenCalled();
    });

    it('throws error when networkClientId not found', async () => {
      setupUseSelectorMock();

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        undefined,
      );

      const { result } = renderHook(() => useMusdConversion());

      await act(async () => {
        await expect(
          result.current.initiateConversion(mockConfig),
        ).rejects.toThrow('Network client not found for chain ID');
      });

      expect(Logger.error).toHaveBeenCalled();
    });

    it('throws error when outputChainId is missing', async () => {
      setupUseSelectorMock();

      const { result } = renderHook(() => useMusdConversion());

      const invalidConfig = {
        ...mockConfig,
        outputChainId: undefined,
      };

      await act(async () => {
        await expect(
          // @ts-expect-error - Intentionally testing invalid config with missing outputChainId
          result.current.initiateConversion(invalidConfig),
        ).rejects.toThrow(
          'Output chain ID and preferred payment token are required',
        );
      });
    });

    it('throws error when preferredPaymentToken is missing', async () => {
      setupUseSelectorMock();

      const { result } = renderHook(() => useMusdConversion());

      const invalidConfig = {
        ...mockConfig,
        preferredPaymentToken: undefined,
      };

      await act(async () => {
        await expect(
          // @ts-expect-error - Intentionally testing invalid config with missing preferredPaymentToken
          result.current.initiateConversion(invalidConfig),
        ).rejects.toThrow(
          'Output chain ID and preferred payment token are required',
        );
      });
    });

    it('navigates to education and returns early when education has not been seen', async () => {
      setupUseSelectorMock({
        hasSeenConversionEducationScreen: false,
      });

      const { result } = renderHook(() => useMusdConversion());

      const transactionId = await result.current.initiateConversion(mockConfig);

      expect(transactionId).toBeUndefined();
      expect(mockTransactionController.addTransaction).not.toHaveBeenCalled();
      expect(
        mockNetworkController.findNetworkClientIdByChainId,
      ).not.toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
        params: {
          preferredPaymentToken: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
          },
          outputChainId: '0x1',
        },
      });
    });

    it('bypasses education when skipEducationCheck is true', async () => {
      setupUseSelectorMock({
        hasSeenConversionEducationScreen: false,
      });

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useMusdConversion());

      const transactionId = await result.current.initiateConversion({
        ...mockConfig,
        skipEducationCheck: true,
      });

      expect(transactionId).toBe('tx-123');
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.EARN.ROOT, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: {
          loader: ConfirmationLoader.CustomAmount,
          preferredPaymentToken: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
          },
          outputChainId: '0x1',
        },
      });
      expect(mockTransactionController.addTransaction).toHaveBeenCalledTimes(1);
    });

    it('sets error state when transaction creation fails', async () => {
      setupUseSelectorMock();

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockRejectedValue(
        new Error('Transaction failed'),
      );

      const { result } = renderHook(() => useMusdConversion());

      await act(async () => {
        await expect(
          result.current.initiateConversion(mockConfig),
        ).rejects.toThrow('Transaction failed');
      });

      expect(result.current.error).toBe('Transaction failed');
      expect(Logger.error).toHaveBeenCalled();
      expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
    });

    it('uses custom navigationStack when provided', async () => {
      setupUseSelectorMock();

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useMusdConversion());

      const configWithCustomStack = {
        ...mockConfig,
        navigationStack: 'CustomStack',
      } as unknown as MusdConversionConfig;

      await result.current.initiateConversion(configWithCustomStack);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('CustomStack', {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
        params: {
          loader: ConfirmationLoader.CustomAmount,
          preferredPaymentToken: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            chainId: '0x1',
          },
          outputChainId: '0x1',
        },
      });
    });

    it('returns transaction ID on success', async () => {
      setupUseSelectorMock();

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );
      mockTransactionController.addTransaction.mockResolvedValue({
        transactionMeta: { id: 'tx-123' },
      });

      const { result } = renderHook(() => useMusdConversion());

      const transactionId = await result.current.initiateConversion(mockConfig);

      expect(transactionId).toBe('tx-123');
    });
  });

  describe('error state', () => {
    it('initializes with null error', () => {
      setupUseSelectorMock();

      const { result } = renderHook(() => useMusdConversion());

      expect(result.current.error).toBeNull();
    });

    it('clears error on successful conversion attempt', async () => {
      setupUseSelectorMock();

      mockNetworkController.findNetworkClientIdByChainId.mockReturnValue(
        'mainnet',
      );

      const { result } = renderHook(() => useMusdConversion());

      const testConfig = {
        outputChainId: '0x1' as Hex,
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
          result.current.initiateConversion(testConfig),
        ).rejects.toThrow('Transaction failed');
      });

      expect(result.current.error).toBe('Transaction failed');

      mockTransactionController.addTransaction.mockResolvedValueOnce({
        transactionMeta: { id: 'tx-123' },
      });

      await act(async () => {
        await result.current.initiateConversion(testConfig);
      });

      expect(result.current.error).toBeNull();
    });
  });
});
