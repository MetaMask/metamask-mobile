import {
  SimulationErrorCode,
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
  simulationData: undefined,
} as unknown as TransactionMeta;

const MOCK_TRANSACTION_META_WITH_REVERTED_SIMULATION = {
  id: '2',
  status: TransactionStatus.unapproved,
  type: TransactionType.contractInteraction,
  chainId: '0x1',
  simulationData: {
    error: {
      code: SimulationErrorCode.Reverted,
      message: 'execution reverted',
    },
  },
} as unknown as TransactionMeta;

const MOCK_TRANSACTION_META_WITH_OTHER_SIMULATION_ERROR = {
  id: '3',
  status: TransactionStatus.unapproved,
  type: TransactionType.contractInteraction,
  chainId: '0x1',
  simulationData: {
    error: {
      code: SimulationErrorCode.InvalidResponse,
      message: 'invalid response',
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

  it('returns alert when simulation is reverted', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      MOCK_TRANSACTION_META_WITH_REVERTED_SIMULATION,
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

  it('returns empty array when simulation has no error', () => {
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

  it('returns empty array when simulation error is not Reverted', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      MOCK_TRANSACTION_META_WITH_OTHER_SIMULATION_ERROR,
    );

    const { result } = renderHookWithProvider(() =>
      useGasEstimateFailedAlert(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns alert with correct message content', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      MOCK_TRANSACTION_META_WITH_REVERTED_SIMULATION,
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
      MOCK_TRANSACTION_META_WITH_REVERTED_SIMULATION,
    );

    const { result } = renderHookWithProvider(() =>
      useGasEstimateFailedAlert(),
    );

    expect(result.current[0].isBlocking).toBe(false);
  });
});
