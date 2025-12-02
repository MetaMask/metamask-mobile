import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useGasEstimateFailedAlert } from './useGasEstimateFailedAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';

const MOCK_TRANSACTION_META = {
  id: '1',
  status: TransactionStatus.unapproved,
  type: TransactionType.contractInteraction,
  chainId: '0x1',
  simulationFails: undefined,
} as unknown as TransactionMeta;

const MOCK_TRANSACTION_META_WITH_SIMULATION_FAILS = {
  id: '2',
  status: TransactionStatus.unapproved,
  type: TransactionType.contractInteraction,
  chainId: '0x1',
  simulationFails: {
    reason: 'execution reverted',
    debug: {
      blockNumber: '0x123',
      blockGasLimit: '0x456',
    },
  },
} as unknown as TransactionMeta;

jest.mock('../transactions/useTransactionMetadataRequest');

describe('useGasEstimateFailedAlert', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns alert when transaction has simulationFails', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      MOCK_TRANSACTION_META_WITH_SIMULATION_FAILS,
    );

    const { result } = renderHookWithProvider(() =>
      useGasEstimateFailedAlert(),
    );

    expect(result.current).toHaveLength(1);
    expect(result.current[0]).toMatchObject({
      isBlocking: false,
      key: AlertKeys.GasEstimateFailed,
      field: RowAlertKey.EstimatedFee,
      severity: Severity.Warning,
      title: 'Inaccurate fee',
    });
  });

  it('returns empty array when transaction has no simulationFails', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(MOCK_TRANSACTION_META);

    const { result } = renderHookWithProvider(() =>
      useGasEstimateFailedAlert(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns empty array when transaction metadata is undefined', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);

    const { result } = renderHookWithProvider(() =>
      useGasEstimateFailedAlert(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns alert with correct message content', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      MOCK_TRANSACTION_META_WITH_SIMULATION_FAILS,
    );

    const { result } = renderHookWithProvider(() =>
      useGasEstimateFailedAlert(),
    );

    expect(result.current[0].message).toBe(
      "We're unable to provide an accurate fee and this estimate might be high. We suggest you to input a custom gas limit, but there's a risk the transaction will still fail.",
    );
  });

  it('returns non-blocking alert', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      MOCK_TRANSACTION_META_WITH_SIMULATION_FAILS,
    );

    const { result } = renderHookWithProvider(() =>
      useGasEstimateFailedAlert(),
    );

    expect(result.current[0].isBlocking).toBe(false);
  });
});
