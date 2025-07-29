import { renderHook } from '@testing-library/react-native';
import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import Engine from '../../../../core/Engine';
import { trace, endTrace, TraceName } from '../../../../util/trace';
import { useStakingTransactionTracing } from './useStakingTransactionTracing';
import { isStakingConfirmation } from '../../../Views/confirmations/utils/confirm';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { EARN_EXPERIENCES } from '../../Earn/constants/experiences';

jest.mock('../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribeOnceIf: jest.fn(),
  },
}));

jest.mock('../../../../util/trace', () => ({
  ...jest.requireActual('../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

jest.mock('../../../Views/confirmations/utils/confirm', () => ({
  isStakingConfirmation: jest.fn(),
}));

jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
  () => ({
    useTransactionMetadataRequest: jest.fn(),
  }),
);

const mockTrace = jest.mocked(trace);
const mockEndTrace = jest.mocked(endTrace);
const mockIsStakingConfirmation = jest.mocked(isStakingConfirmation);
const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);
const mockSubscribeOnceIf = jest.mocked(
  Engine.controllerMessenger.subscribeOnceIf,
);

describe('useStakingTransactionTracing', () => {
  const mockStakingDepositTransaction: TransactionMeta = {
    id: 'test-deposit-id',
    type: TransactionType.stakingDeposit,
    chainId: '0x1' as `0x${string}`,
    networkClientId: 'test-network-client-id',
    status: TransactionStatus.submitted,
    time: 1000,
    txParams: {
      from: '0x2' as `0x${string}`,
      to: '0x1' as `0x${string}`,
      value: '1000000000000000000',
    },
  };

  const mockNonStakingTransaction: TransactionMeta = {
    id: 'test-send-id',
    type: TransactionType.simpleSend,
    chainId: '0x1' as `0x${string}`,
    networkClientId: 'test-network-client-id',
    status: TransactionStatus.submitted,
    time: 1000,
    txParams: {
      from: '0x2' as `0x${string}`,
      to: '0x1' as `0x${string}`,
      value: '1000000000000000000',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should set up event listeners for staking deposit transactions', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      mockStakingDepositTransaction,
    );
    mockIsStakingConfirmation.mockReturnValue(true);

    renderHook(() => useStakingTransactionTracing());

    expect(mockSubscribeOnceIf).toHaveBeenCalledWith(
      'TransactionController:transactionSubmitted',
      expect.any(Function),
      expect.any(Function),
    );

    expect(mockSubscribeOnceIf).toHaveBeenCalledWith(
      'TransactionController:transactionConfirmed',
      expect.any(Function),
      expect.any(Function),
    );

    expect(mockSubscribeOnceIf).toHaveBeenCalledTimes(2);
  });

  it('should not set up event listeners for non-staking transactions', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      mockNonStakingTransaction,
    );
    mockIsStakingConfirmation.mockReturnValue(false);

    renderHook(() => useStakingTransactionTracing());

    expect(mockSubscribeOnceIf).not.toHaveBeenCalled();
  });

  it('should not set up event listeners when transaction metadata is missing', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    renderHook(() => useStakingTransactionTracing());

    expect(mockSubscribeOnceIf).not.toHaveBeenCalled();
  });

  describe('Transaction event handlers', () => {
    it('should start trace when transaction is submitted', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(
        mockStakingDepositTransaction,
      );
      mockIsStakingConfirmation.mockReturnValue(true);

      let transactionSubmittedCallback:
        | ((event: { transactionMeta: Partial<TransactionMeta> }) => void)
        | undefined;

      mockSubscribeOnceIf.mockImplementation(
        (eventName: string, callback: unknown) => {
          if (eventName === 'TransactionController:transactionSubmitted') {
            transactionSubmittedCallback = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          }
          return jest.fn();
        },
      );

      renderHook(() => useStakingTransactionTracing());

      const transactionMeta = {
        id: 'test-deposit-id',
        type: TransactionType.stakingDeposit,
        chainId: '0x1' as `0x${string}`,
      };

      if (transactionSubmittedCallback) {
        transactionSubmittedCallback({ transactionMeta });
      }

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.EarnPooledStakingDepositTxConfirmed,
        id: 'test-deposit-id',
        data: {
          chainId: '0x1',
          experience: EARN_EXPERIENCES.POOLED_STAKING,
        },
      });
    });

    it('should end trace when transaction is confirmed', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(
        mockStakingDepositTransaction,
      );
      mockIsStakingConfirmation.mockReturnValue(true);

      let transactionConfirmedCallback:
        | ((transactionMeta: Partial<TransactionMeta>) => void)
        | undefined;

      mockSubscribeOnceIf.mockImplementation(
        (eventName: string, callback: unknown) => {
          if (eventName === 'TransactionController:transactionConfirmed') {
            transactionConfirmedCallback = callback as (
              transactionMeta: Partial<TransactionMeta>,
            ) => void;
          }
          return jest.fn();
        },
      );

      renderHook(() => useStakingTransactionTracing());

      const transactionMeta = {
        id: 'test-deposit-id',
        type: TransactionType.stakingDeposit,
        chainId: '0x1' as `0x${string}`,
      };

      if (transactionConfirmedCallback) {
        transactionConfirmedCallback(transactionMeta);
      }

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.EarnPooledStakingDepositTxConfirmed,
        id: 'test-deposit-id',
      });
    });

    it('should handle staking withdrawal transactions', () => {
      const mockStakingWithdrawalTransaction: TransactionMeta = {
        ...mockStakingDepositTransaction,
        id: 'test-withdrawal-id',
        type: TransactionType.stakingUnstake,
      };

      mockUseTransactionMetadataRequest.mockReturnValue(
        mockStakingWithdrawalTransaction,
      );
      mockIsStakingConfirmation.mockReturnValue(true);

      let transactionSubmittedCallback:
        | ((event: { transactionMeta: Partial<TransactionMeta> }) => void)
        | undefined;

      mockSubscribeOnceIf.mockImplementation(
        (eventName: string, callback: unknown) => {
          if (eventName === 'TransactionController:transactionSubmitted') {
            transactionSubmittedCallback = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          }
          return jest.fn();
        },
      );

      renderHook(() => useStakingTransactionTracing());

      const transactionMeta = {
        id: 'test-withdrawal-id',
        type: TransactionType.stakingUnstake,
        chainId: '0x1' as `0x${string}`,
      };

      if (transactionSubmittedCallback) {
        transactionSubmittedCallback({ transactionMeta });
      }

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.EarnPooledStakingWithdrawTxConfirmed,
        id: 'test-withdrawal-id',
        data: {
          chainId: '0x1',
          experience: EARN_EXPERIENCES.POOLED_STAKING,
        },
      });
    });

    it('should handle staking claim rewards transactions', () => {
      const mockStakingClaimTransaction: TransactionMeta = {
        ...mockStakingDepositTransaction,
        id: 'test-claim-id',
        type: TransactionType.stakingClaim,
      };

      mockUseTransactionMetadataRequest.mockReturnValue(
        mockStakingClaimTransaction,
      );
      mockIsStakingConfirmation.mockReturnValue(true);

      let transactionSubmittedCallback:
        | ((event: { transactionMeta: Partial<TransactionMeta> }) => void)
        | undefined;

      mockSubscribeOnceIf.mockImplementation(
        (eventName: string, callback: unknown) => {
          if (eventName === 'TransactionController:transactionSubmitted') {
            transactionSubmittedCallback = callback as (event: {
              transactionMeta: Partial<TransactionMeta>;
            }) => void;
          }
          return jest.fn();
        },
      );

      renderHook(() => useStakingTransactionTracing());

      const transactionMeta = {
        id: 'test-claim-id',
        type: TransactionType.stakingClaim,
        chainId: '0x1' as `0x${string}`,
      };

      if (transactionSubmittedCallback) {
        transactionSubmittedCallback({ transactionMeta });
      }

      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.EarnPooledStakingClaimTxConfirmed,
        id: 'test-claim-id',
        data: {
          chainId: '0x1',
          experience: EARN_EXPERIENCES.POOLED_STAKING,
        },
      });
    });
  });
});
