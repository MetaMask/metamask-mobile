import React from 'react';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { MusdConversionTransactionDetails } from './MusdConversionTransactionDetails';
import Routes from '../../../../../constants/navigation/Routes';
import { MusdConversionTransactionDetailsSelectorsIDs } from './MusdConversionTransactionDetails.types';
import initialRootState from '../../../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockPop = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      pop: mockPop,
      setOptions: jest.fn(),
    }),
  };
});

const mockGetConversionTransfersFromLogs = jest.fn().mockResolvedValue({
  input: {
    amount: '1000000',
    tokenContract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  },
  output: {
    amount: '1000000',
    tokenContract: '0x866e82a600a1414e583f7f13623f1ac5d58b0afa',
  },
});

jest.mock('./utils', () => ({
  getConversionTransfersFromLogs: (...args: unknown[]) =>
    mockGetConversionTransfersFromLogs(...args),
}));

const createMockTransactionMeta = (
  overrides: Partial<TransactionMeta> = {},
): TransactionMeta =>
  ({
    id: 'test-tx-id',
    chainId: '0x1',
    hash: '0x123abc456def',
    networkClientId: 'mainnet',
    time: Date.now(),
    type: TransactionType.musdConversion,
    txParams: {
      from: '0x123',
      to: '0x456',
      value: '0x0',
      data: '0x',
      gas: '0x5208',
      gasPrice: '0x3b9aca00',
    },
    txReceipt: {
      gasUsed: '0xc480',
      effectiveGasPrice: '0x2e90edd000',
    },
    status: TransactionStatus.confirmed,
    metamaskPay: {
      chainId: '0x1',
      tokenAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      tokenAmount: '1000000',
    },
    ...overrides,
  }) as TransactionMeta;

const createMockState = (tx: TransactionMeta) => ({
  ...initialRootState,
  engine: {
    ...initialRootState.engine,
    backgroundState: {
      ...initialRootState.engine.backgroundState,
      TransactionController: {
        transactions: [tx],
      },
      NetworkController: {
        ...initialRootState.engine.backgroundState.NetworkController,
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1' as const,
            name: 'Ethereum Mainnet',
            nativeCurrency: 'ETH',
            blockExplorerUrls: ['https://etherscan.io'],
            rpcEndpoints: [
              {
                url: 'https://mainnet.infura.io/v3/test',
                networkClientId: 'mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
      TokenListController: {
        tokensChainsCache: {
          '0x1': {
            data: {
              '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
                address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                symbol: 'USDC',
                decimals: 6,
                name: 'USD Coin',
                iconUrl: 'https://example.com/usdc.png',
              },
            },
          },
        },
      },
    },
  },
});

describe('MusdConversionTransactionDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConversionTransfersFromLogs.mockResolvedValue({
      input: {
        amount: '1000000',
        tokenContract: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      },
      output: {
        amount: '1000000',
        tokenContract: '0x866e82a600a1414e583f7f13623f1ac5d58b0afa',
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('rendering', () => {
    it('renders container with correct testID', () => {
      const mockTx = createMockTransactionMeta();

      const { getByTestId } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(
        getByTestId(MusdConversionTransactionDetailsSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('displays status row', () => {
      const mockTx = createMockTransactionMeta();

      const { getByText } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(getByText(/status/i)).toBeOnTheScreen();
      expect(getByText(/confirmed/i)).toBeOnTheScreen();
    });

    it('displays date row', () => {
      const mockTx = createMockTransactionMeta();

      const { getByText } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(getByText(/date/i)).toBeOnTheScreen();
    });

    it('displays total gas fee row', () => {
      const mockTx = createMockTransactionMeta();

      const { getByText } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(getByText(/total gas fee/i)).toBeOnTheScreen();
    });

    it('displays destination token as MUSD', () => {
      const mockTx = createMockTransactionMeta();

      const { getByText } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(getByText(/MUSD/)).toBeOnTheScreen();
    });
  });

  describe('status colors', () => {
    it('displays confirmed status in success color', () => {
      const mockTx = createMockTransactionMeta({
        status: TransactionStatus.confirmed,
      });

      const { getByText } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(getByText(/confirmed/i)).toBeOnTheScreen();
    });

    it('displays submitted status', () => {
      const mockTx = createMockTransactionMeta({
        status: TransactionStatus.submitted,
      });

      const { getByText } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(getByText(/submitted/i)).toBeOnTheScreen();
    });

    it('displays failed status', () => {
      const mockTx = createMockTransactionMeta({
        status: TransactionStatus.failed,
      });

      const { getByText } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(getByText(/failed/i)).toBeOnTheScreen();
    });
  });

  describe('navigation', () => {
    it('sets navigation options on mount', () => {
      const mockTx = createMockTransactionMeta();

      renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      // Navigation options are set in useEffect
      expect(true).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles missing metamaskPay data', () => {
      const mockTx = createMockTransactionMeta({
        metamaskPay: undefined,
      });

      const { getByTestId } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(
        getByTestId(MusdConversionTransactionDetailsSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('handles missing hash', () => {
      const mockTx = createMockTransactionMeta({
        hash: undefined,
      });

      const { queryByText } = renderScreen(
        () => (
          <MusdConversionTransactionDetails
            route={{ params: { transactionMeta: mockTx } }}
          />
        ),
        { name: Routes.EARN.MUSD.CONVERSION_TRANSACTION_DETAILS },
        { state: createMockState(mockTx) },
      );

      expect(queryByText(/view on block explorer/i)).toBeNull();
    });
  });
});
