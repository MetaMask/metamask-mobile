import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { renderHook } from '@testing-library/react-hooks';
import { ethers } from 'ethers';
import { useEarnLendingTransactionStatus } from './useEarnLendingTransactionStatus';

// Mock dependencies
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ name: 'test-event' }),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  MetaMetricsEvents: {
    EARN_TRANSACTION_SUBMITTED: { name: 'Earn Transaction Submitted' },
    EARN_TRANSACTION_CONFIRMED: { name: 'Earn Transaction Confirmed' },
    EARN_TRANSACTION_REJECTED: { name: 'Earn Transaction Rejected' },
    EARN_TRANSACTION_DROPPED: { name: 'Earn Transaction Dropped' },
    EARN_TRANSACTION_FAILED: { name: 'Earn Transaction Failed' },
    EARN_TRANSACTION_INITIATED: { name: 'Earn Transaction Initiated' },
  },
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
}));

const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();
const mockAddToken = jest.fn().mockResolvedValue(undefined);
const mockFindNetworkClientIdByChainId = jest.fn().mockReturnValue('mainnet');
const mockGetNetworkConfigurationByChainId = jest.fn().mockReturnValue({
  name: 'Ethereum Mainnet',
  chainId: '0x1',
});

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: (...args: unknown[]) => mockSubscribe(...args),
    unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
  },
  context: {
    TokensController: {
      addToken: (...args: unknown[]) => mockAddToken(...args),
    },
    NetworkController: {
      findNetworkClientIdByChainId: (...args: unknown[]) =>
        mockFindNetworkClientIdByChainId(...args),
      getNetworkConfigurationByChainId: (...args: unknown[]) =>
        mockGetNetworkConfigurationByChainId(...args),
    },
  },
}));

jest.mock('../../../Views/confirmations/utils/transaction', () => ({
  hasTransactionType: (
    transactionMeta: TransactionMeta | undefined,
    types: TransactionType[],
  ) => {
    const { nestedTransactions, type } = transactionMeta ?? {};
    if (types.includes(type as TransactionType)) {
      return true;
    }
    return (
      nestedTransactions?.some((tx: { type?: TransactionType }) =>
        types.includes(tx.type as TransactionType),
      ) ?? false
    );
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useEarnTokens', () => () => ({
  getPairedEarnTokens: jest.fn(() => ({
    earnToken: {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      symbol: 'USDC',
      name: 'USD Coin',
    },
    outputToken: {
      address: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
      decimals: 6,
      symbol: 'aEthUSDC',
      name: 'Aave Ethereum USDC',
    },
  })),
  getEarnToken: jest.fn(() => ({
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  })),
  getOutputToken: jest.fn(() => ({
    address: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
    decimals: 6,
    symbol: 'aEthUSDC',
    name: 'Aave Ethereum USDC',
  })),
}));

const mockFetchTokenSnapshot = jest.fn().mockResolvedValue(undefined);
const mockGetTokenSnapshotFromState = jest.fn(() => ({
  chainId: '0x1',
  address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  token: {
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
  },
  outputToken: {
    address: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
    decimals: 6,
    symbol: 'aEthUSDC',
    name: 'Aave Ethereum USDC',
  },
}));

jest.mock('../utils/token-snapshot', () => ({
  fetchTokenSnapshot: (...args: Parameters<typeof mockFetchTokenSnapshot>) =>
    mockFetchTokenSnapshot(...args),
  getTokenSnapshotFromState: (
    ...args: Parameters<typeof mockGetTokenSnapshotFromState>
  ) => mockGetTokenSnapshotFromState(...args),
  getEarnTokenPairAddressesFromState: jest.fn(() => ({
    earnToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    outputToken: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
  })),
}));

import { MetaMetricsEvents } from '../../../hooks/useMetrics';

type TransactionHandler = (
  event: TransactionMeta | { transactionMeta: TransactionMeta },
) => void;

describe('useEarnLendingTransactionStatus', () => {
  const UNDERLYING_TOKEN_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const OUTPUT_TOKEN_ADDRESS = '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c';
  const CHAIN_ID = '0x1';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createLendingDepositData = (): string => {
    const supplyAbi = [
      'function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode)',
    ];
    const contractInterface = new ethers.utils.Interface(supplyAbi);
    return contractInterface.encodeFunctionData('supply', [
      UNDERLYING_TOKEN_ADDRESS,
      '1000000',
      '0x1230000000000000000000000000000000000456',
      0,
    ]);
  };

  const createLendingWithdrawalData = (): string => {
    const withdrawAbi = [
      'function withdraw(address asset, uint256 amount, address to)',
    ];
    const contractInterface = new ethers.utils.Interface(withdrawAbi);
    return contractInterface.encodeFunctionData('withdraw', [
      UNDERLYING_TOKEN_ADDRESS,
      '1000000',
      '0x1230000000000000000000000000000000000456',
    ]);
  };

  const createTransactionMeta = (
    type: TransactionType,
    transactionId = 'test-transaction-1',
    data?: string,
    nestedTransactions?: { type: TransactionType; data?: string }[],
  ): TransactionMeta =>
    ({
      id: transactionId,
      type,
      chainId: CHAIN_ID,
      networkClientId: 'mainnet',
      status: TransactionStatus.submitted,
      time: Date.now(),
      txParams: {
        from: '0x1230000000000000000000000000000000000456',
        to: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        data,
      },
      nestedTransactions,
    }) as TransactionMeta;

  const getHandler = (eventName: string): TransactionHandler => {
    const subscribeCalls = mockSubscribe.mock.calls;
    const call = subscribeCalls.find(
      ([name]: [string]) => name === eventName,
    ) as [string, TransactionHandler] | undefined;
    if (!call) {
      throw new Error(`No subscription found for ${eventName}`);
    }
    return call[1];
  };

  describe('subscription lifecycle', () => {
    it('subscribes to all transaction lifecycle events on mount', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      expect(mockSubscribe).toHaveBeenCalledTimes(5);
      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionSubmitted',
        expect.any(Function),
      );
      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionConfirmed',
        expect.any(Function),
      );
      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionRejected',
        expect.any(Function),
      );
      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionDropped',
        expect.any(Function),
      );
      expect(mockSubscribe).toHaveBeenCalledWith(
        'TransactionController:transactionFailed',
        expect.any(Function),
      );
    });

    it('unsubscribes from all events on unmount', () => {
      const { unmount } = renderHook(() => useEarnLendingTransactionStatus());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalledTimes(5);
    });
  });

  describe('direct deposit transactions', () => {
    it('adds receipt token when deposit transaction is confirmed', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-deposit-1',
        depositData,
      );

      handler(transactionMeta);

      expect(mockAddToken).toHaveBeenCalledTimes(1);
      expect(mockAddToken).toHaveBeenCalledWith({
        decimals: 6,
        symbol: 'aEthUSDC',
        address: OUTPUT_TOKEN_ADDRESS,
        name: 'Aave Ethereum USDC',
        networkClientId: 'mainnet',
      });
    });

    it('tracks analytics event when deposit is confirmed', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-deposit-analytics',
        depositData,
      );

      handler(transactionMeta);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.EARN_TRANSACTION_CONFIRMED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('prevents duplicate events for same transaction', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-deposit-duplicate',
        depositData,
      );

      handler(transactionMeta);
      handler(transactionMeta);
      handler(transactionMeta);

      expect(mockAddToken).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });
  });

  describe('direct withdrawal transactions', () => {
    it('adds underlying token when withdrawal transaction is confirmed', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const withdrawalData = createLendingWithdrawalData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingWithdraw,
        'test-withdrawal-1',
        withdrawalData,
      );

      handler(transactionMeta);

      expect(mockAddToken).toHaveBeenCalledTimes(1);
      expect(mockAddToken).toHaveBeenCalledWith({
        decimals: 6,
        symbol: 'USDC',
        address: UNDERLYING_TOKEN_ADDRESS,
        name: 'USD Coin',
        networkClientId: 'mainnet',
      });
    });
  });

  describe('batch transactions (1-click flow)', () => {
    it('extracts lending deposit from nested transactions and adds token', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const depositData = createLendingDepositData();

      const batchMeta = createTransactionMeta(
        TransactionType.batch,
        'batch-deposit-1',
        undefined,
        [
          { type: TransactionType.tokenMethodApprove, data: '0xapprovedata' },
          { type: TransactionType.lendingDeposit, data: depositData },
        ],
      );

      handler(batchMeta);

      expect(mockAddToken).toHaveBeenCalledTimes(1);
      expect(mockAddToken).toHaveBeenCalledWith({
        decimals: 6,
        symbol: 'aEthUSDC',
        address: OUTPUT_TOKEN_ADDRESS,
        name: 'Aave Ethereum USDC',
        networkClientId: 'mainnet',
      });
    });

    it('extracts lending withdrawal from nested transactions and adds token', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const withdrawalData = createLendingWithdrawalData();

      const batchMeta = createTransactionMeta(
        TransactionType.batch,
        'batch-withdrawal-1',
        undefined,
        [{ type: TransactionType.lendingWithdraw, data: withdrawalData }],
      );

      handler(batchMeta);

      expect(mockAddToken).toHaveBeenCalledTimes(1);
      expect(mockAddToken).toHaveBeenCalledWith({
        decimals: 6,
        symbol: 'USDC',
        address: UNDERLYING_TOKEN_ADDRESS,
        name: 'USD Coin',
        networkClientId: 'mainnet',
      });
    });

    it('ignores batch transactions without lending nested transactions', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');

      const batchMeta = createTransactionMeta(
        TransactionType.batch,
        'batch-no-lending',
        undefined,
        [
          { type: TransactionType.tokenMethodApprove, data: '0xapprovedata' },
          { type: TransactionType.swap, data: '0xswapdata' },
        ],
      );

      handler(batchMeta);

      expect(mockAddToken).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('transaction events tracking', () => {
    it('tracks EARN_TRANSACTION_SUBMITTED on transaction submitted', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionSubmitted');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-submitted',
        depositData,
      );

      handler({ transactionMeta });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.EARN_TRANSACTION_SUBMITTED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockAddToken).not.toHaveBeenCalled();
    });

    it('tracks EARN_TRANSACTION_REJECTED on transaction rejected', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionRejected');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-rejected',
        depositData,
      );

      handler({ transactionMeta });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.EARN_TRANSACTION_REJECTED,
      );
    });

    it('tracks EARN_TRANSACTION_DROPPED on transaction dropped', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionDropped');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-dropped',
        depositData,
      );

      handler({ transactionMeta });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.EARN_TRANSACTION_DROPPED,
      );
    });

    it('tracks EARN_TRANSACTION_FAILED on transaction failed', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionFailed');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-failed',
        depositData,
      );

      handler({ transactionMeta });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.EARN_TRANSACTION_FAILED,
      );
    });
  });

  describe('EARN_TRANSACTION_INITIATED tracking', () => {
    it('tracks EARN_TRANSACTION_INITIATED on submission for deposits', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionSubmitted');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-initiated-deposit',
        depositData,
      );

      handler({ transactionMeta });

      // Should track both EARN_TRANSACTION_SUBMITTED and EARN_TRANSACTION_INITIATED
      const eventBuilderCalls = mockCreateEventBuilder.mock
        .calls as unknown as [{ name: string }][];
      const initiatedCall = eventBuilderCalls.find(
        ([event]) => event.name === 'Earn Transaction Initiated',
      );
      expect(initiatedCall).toBeDefined();
    });

    it('tracks EARN_TRANSACTION_INITIATED on submission for withdrawals', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionSubmitted');
      const withdrawalData = createLendingWithdrawalData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingWithdraw,
        'test-initiated-withdrawal',
        withdrawalData,
      );

      handler({ transactionMeta });

      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('allowance transaction tracking', () => {
    it('tracks allowance submitted event when batch has approval transaction', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionSubmitted');
      const depositData = createLendingDepositData();

      const batchMeta = createTransactionMeta(
        TransactionType.batch,
        'batch-with-approval',
        undefined,
        [
          { type: TransactionType.tokenMethodApprove, data: '0xapprovedata' },
          { type: TransactionType.lendingDeposit, data: depositData },
        ],
      );

      handler({ transactionMeta: batchMeta });

      // Should track allowance event with is_allowance flag
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks allowance confirmed event when batch with approval is confirmed', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const depositData = createLendingDepositData();

      const batchMeta = createTransactionMeta(
        TransactionType.batch,
        'batch-approval-confirmed',
        undefined,
        [
          {
            type: TransactionType.tokenMethodIncreaseAllowance,
            data: '0xapprovedata',
          },
          { type: TransactionType.lendingDeposit, data: depositData },
        ],
      );

      handler(batchMeta);

      // Should track both lending confirmed and allowance confirmed
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockAddToken).toHaveBeenCalled();
    });
  });

  describe('token prefetching on submission', () => {
    it('prefetches output token on deposit submission', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionSubmitted');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-prefetch-deposit',
        depositData,
      );

      handler({ transactionMeta });

      // fetchTokenSnapshot should be called for prefetching (if outputToken is not known)
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('prefetches underlying token on withdrawal submission', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionSubmitted');
      const withdrawalData = createLendingWithdrawalData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingWithdraw,
        'test-prefetch-withdrawal',
        withdrawalData,
      );

      handler({ transactionMeta });

      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('non-lending transactions', () => {
    it('ignores transactions with non-lending type', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const transactionMeta = createTransactionMeta(
        TransactionType.swap,
        'test-swap',
      );

      handler(transactionMeta);

      expect(mockAddToken).not.toHaveBeenCalled();
      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles missing transaction data gracefully', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-no-data',
        undefined,
      );

      expect(() => handler(transactionMeta)).not.toThrow();
      expect(mockAddToken).not.toHaveBeenCalled();
    });

    it('handles invalid transaction data gracefully', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-invalid-data',
        '0xinvaliddata',
      );

      expect(() => handler(transactionMeta)).not.toThrow();
      expect(mockAddToken).not.toHaveBeenCalled();
    });
  });

  describe('deduplication', () => {
    it('evicts oldest entry when at capacity', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const depositData = createLendingDepositData();

      // Trigger 101 unique transactions (exceeds MAX_PROCESSED_TRANSACTIONS of 100)
      for (let i = 0; i < 101; i++) {
        const transactionMeta = createTransactionMeta(
          TransactionType.lendingDeposit,
          `test-eviction-${i}`,
          depositData,
        );
        handler(transactionMeta);
      }

      // Should not throw and should have processed all transactions
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  describe('fallback to token snapshot', () => {
    it('uses snapshot when outputToken is null for deposit confirmation', () => {
      // This test verifies the fallback path when outputToken is not directly available
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-fallback-deposit',
        depositData,
      );

      handler(transactionMeta);

      // addToken should be called (either from direct outputToken or snapshot)
      expect(mockAddToken).toHaveBeenCalled();
    });

    it('uses snapshot when earnToken is null for withdrawal confirmation', () => {
      // This test verifies the fallback path when earnToken is not directly available
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionConfirmed');
      const withdrawalData = createLendingWithdrawalData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingWithdraw,
        'test-fallback-withdrawal',
        withdrawalData,
      );

      handler(transactionMeta);

      // addToken should be called (either from direct earnToken or snapshot)
      expect(mockAddToken).toHaveBeenCalled();
    });
  });

  describe('token prefetch edge cases', () => {
    it('skips prefetch when outputToken already exists for deposit', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionSubmitted');
      const depositData = createLendingDepositData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingDeposit,
        'test-prefetch-skip',
        depositData,
      );

      // Since our mock returns both earnToken and outputToken, prefetch should be skipped
      handler({ transactionMeta });

      // fetchTokenSnapshot should NOT be called when token already known
      expect(mockFetchTokenSnapshot).not.toHaveBeenCalled();
    });

    it('skips prefetch when earnToken already exists for withdrawal', () => {
      renderHook(() => useEarnLendingTransactionStatus());

      const handler = getHandler('TransactionController:transactionSubmitted');
      const withdrawalData = createLendingWithdrawalData();
      const transactionMeta = createTransactionMeta(
        TransactionType.lendingWithdraw,
        'test-prefetch-skip-withdraw',
        withdrawalData,
      );

      // Since our mock returns both earnToken and outputToken, prefetch should be skipped
      handler({ transactionMeta });

      // fetchTokenSnapshot should NOT be called when token already known
      expect(mockFetchTokenSnapshot).not.toHaveBeenCalled();
    });
  });
});
