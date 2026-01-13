import { renderHook } from '@testing-library/react-hooks';
import { TransactionType } from '@metamask/transaction-controller';
import { ethers } from 'ethers';
import { useLendingDepositDetails } from './useLendingDepositDetails';

// Mock dependencies
const mockUseTransactionMetadataRequest = jest.fn();
const mockUseTransactionBatchesMetadata = jest.fn();
const mockUseEarnToken = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => 'USD'),
}));

jest.mock('../../../hooks/transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: () => mockUseTransactionMetadataRequest(),
}));

jest.mock('../../../hooks/transactions/useTransactionBatchesMetadata', () => ({
  useTransactionBatchesMetadata: () => mockUseTransactionBatchesMetadata(),
}));

jest.mock('../../../../../UI/Earn/hooks/useEarnToken', () => ({
  __esModule: true,
  default: () => mockUseEarnToken(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'earn.every_minute': 'Every minute',
      'earn.immediate': 'Immediate',
    };
    return translations[key] || key;
  },
}));

jest.mock('@metamask/stake-sdk', () => ({
  CHAIN_ID_TO_AAVE_POOL_CONTRACT: {
    1: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    59144: '0xLinea87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  },
}));

jest.mock('../../../../../../util/networks', () => ({
  getDecimalChainId: (chainId: string) => {
    const map: Record<string, number> = {
      '0x1': 1,
      '0xe708': 59144,
    };
    return map[chainId] || 0;
  },
}));

describe('useLendingDepositDetails', () => {
  const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const AUSDC_ADDRESS = '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c';
  const CHAIN_ID = '0x1';

  const createSupplyData = (
    tokenAddress: string = USDC_ADDRESS,
    amount: string = '1000000',
  ): string => {
    const supplyAbi = [
      'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
    ];
    const contractInterface = new ethers.utils.Interface(supplyAbi);
    return contractInterface.encodeFunctionData('supply', [
      tokenAddress,
      amount,
      '0x1230000000000000000000000000000000000456',
      0,
    ]);
  };

  const createMockEarnToken = (overrides = {}) => ({
    address: USDC_ADDRESS,
    symbol: 'USDC',
    ticker: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    image: 'https://example.com/usdc.png',
    chainId: CHAIN_ID,
    tokenUsdExchangeRate: 1,
    experience: {
      apr: '5.25',
      market: {
        outputToken: {
          address: AUSDC_ADDRESS,
        },
      },
    },
    ...overrides,
  });

  const createMockOutputToken = (overrides = {}) => ({
    address: AUSDC_ADDRESS,
    symbol: 'aEthUSDC',
    ticker: 'aEthUSDC',
    name: 'Aave Ethereum USDC',
    decimals: 6,
    image: 'https://example.com/ausdc.png',
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(null);
    mockUseTransactionBatchesMetadata.mockReturnValue(null);
    mockUseEarnToken.mockReturnValue({
      earnTokenPair: null,
      tokenSnapshot: null,
      getTokenSnapshot: jest.fn(),
    });
  });

  describe('returns null', () => {
    it('returns null when no transaction metadata available', () => {
      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current).toBeNull();
    });

    it('returns null when earnToken is not found', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: createSupplyData() },
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current).toBeNull();
    });

    it('returns null when transaction has no data', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: {},
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current).toBeNull();
    });
  });

  describe('direct transactions (7702 flow)', () => {
    it('extracts deposit details from direct lending transaction', () => {
      const supplyData = createSupplyData(USDC_ADDRESS, '1000000');

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken(),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current).not.toBeNull();
      expect(result.current?.tokenSymbol).toBe('USDC');
      expect(result.current?.tokenAmount).toBe('1');
      expect(result.current?.apr).toBe('5.25');
      expect(result.current?.aprNumeric).toBe(5.25);
      expect(result.current?.protocol).toBe('Aave');
      expect(result.current?.rewardFrequency).toBe('Every minute');
      expect(result.current?.withdrawalTime).toBe('Immediate');
    });

    it('extracts details from batch transaction with nested lending deposit', () => {
      const supplyData = createSupplyData(USDC_ADDRESS, '2000000');

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.batch,
        chainId: CHAIN_ID,
        txParams: {},
        nestedTransactions: [
          { type: TransactionType.tokenMethodApprove, data: '0xapprove' },
          { type: TransactionType.lendingDeposit, data: supplyData },
        ],
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken(),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current).not.toBeNull();
      expect(result.current?.tokenSymbol).toBe('USDC');
      expect(result.current?.tokenAmount).toBe('2');
    });
  });

  describe('batch transactions (non-7702 flow)', () => {
    it('extracts details from transactionBatchesMetadata', () => {
      const supplyData = createSupplyData(USDC_ADDRESS, '5000000');

      mockUseTransactionBatchesMetadata.mockReturnValue({
        chainId: CHAIN_ID,
        transactions: [
          {
            type: TransactionType.lendingDeposit,
            params: { data: supplyData },
          },
        ],
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken(),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current).not.toBeNull();
      expect(result.current?.tokenAmount).toBe('5');
    });
  });

  describe('receipt token handling', () => {
    it('uses outputToken data when available', () => {
      const supplyData = createSupplyData();

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken(),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current?.receiptTokenSymbol).toBe('aEthUSDC');
      expect(result.current?.receiptTokenName).toBe('Aave Ethereum USDC');
      expect(result.current?.receiptTokenImage).toBe(
        'https://example.com/ausdc.png',
      );
    });

    it('falls back to tokenSnapshot when outputToken not available', () => {
      const supplyData = createSupplyData();

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken(),
          outputToken: null,
        },
        tokenSnapshot: {
          token: {
            symbol: 'aUSDC',
            name: 'Aave USDC',
            image: 'https://snapshot.com/ausdc.png',
          },
        },
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current?.receiptTokenSymbol).toBe('aUSDC');
      expect(result.current?.receiptTokenName).toBe('Aave USDC');
    });

    it('calls getTokenSnapshot when outputToken is missing', () => {
      const supplyData = createSupplyData();
      const mockGetTokenSnapshot = jest.fn();

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken(),
          outputToken: null,
        },
        tokenSnapshot: null,
        getTokenSnapshot: mockGetTokenSnapshot,
      });

      renderHook(() => useLendingDepositDetails());

      expect(mockGetTokenSnapshot).toHaveBeenCalledWith(
        CHAIN_ID,
        AUSDC_ADDRESS,
      );
    });
  });

  describe('calculated values', () => {
    it('calculates token fiat value using exchange rate', () => {
      const supplyData = createSupplyData(USDC_ADDRESS, '10000000'); // 10 USDC

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken({ tokenUsdExchangeRate: 1.0 }),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current?.tokenAmount).toBe('10');
      expect(result.current?.tokenFiat).toBe('10');
    });

    it('formats receipt token amount with symbol', () => {
      const supplyData = createSupplyData(USDC_ADDRESS, '1500000'); // 1.5 USDC

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken(),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current?.receiptTokenAmount).toBe('1.5 aEthUSDC');
    });

    it('returns protocol contract address for mainnet', () => {
      const supplyData = createSupplyData();

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken(),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current?.protocolContractAddress).toBe(
        '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      );
    });
  });

  describe('token object creation', () => {
    it('creates token object with correct properties', () => {
      const supplyData = createSupplyData();

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken(),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current?.token).toEqual({
        address: USDC_ADDRESS,
        symbol: 'USDC',
        decimals: 6,
        image: 'https://example.com/usdc.png',
        name: 'USD Coin',
        chainId: CHAIN_ID,
        isNative: false,
      });
    });
  });

  describe('edge cases', () => {
    it('handles APR with percentage sign', () => {
      const supplyData = createSupplyData();

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken({
            experience: {
              apr: '7.5%',
              market: { outputToken: { address: AUSDC_ADDRESS } },
            },
          }),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current?.aprNumeric).toBe(7.5);
    });

    it('handles missing token decimals with default of 18', () => {
      const supplyData = createSupplyData();

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken({ decimals: undefined }),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current?.tokenDecimals).toBe(18);
    });

    it('prefers ticker over symbol', () => {
      const supplyData = createSupplyData();

      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.lendingDeposit,
        chainId: CHAIN_ID,
        txParams: { data: supplyData },
      });

      mockUseEarnToken.mockReturnValue({
        earnTokenPair: {
          earnToken: createMockEarnToken({
            ticker: 'USDC-T',
            symbol: 'USDC-S',
          }),
          outputToken: createMockOutputToken(),
        },
        tokenSnapshot: null,
        getTokenSnapshot: jest.fn(),
      });

      const { result } = renderHook(() => useLendingDepositDetails());

      expect(result.current?.tokenSymbol).toBe('USDC-T');
    });
  });
});
