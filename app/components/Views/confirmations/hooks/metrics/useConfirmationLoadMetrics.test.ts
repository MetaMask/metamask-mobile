import { renderHook } from '@testing-library/react-hooks';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

import { updateConfirmationMetric } from '../../../../../core/redux/slices/confirmationMetrics';
import { TraceName, endTrace, trace } from '../../../../../util/trace';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useConfirmationLoadMetrics } from './useConfirmationLoadMetrics';

jest.mock('../transactions/useTransactionMetadataRequest');

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../core/redux/slices/confirmationMetrics', () => ({
  ...jest.requireActual('../../../../../core/redux/slices/confirmationMetrics'),
  updateConfirmationMetric: jest.fn(),
}));

jest.mock('../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
}));

const TRANSACTION_ID_MOCK = '123-456';
const CREATED_AT_MS_MOCK = 1746696740463;
const PAINTED_AT_MS_MOCK = 1746696741463;

describe('useConfirmationLoadMetrics', () => {
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const updateConfirmationMetricMock = jest.mocked(updateConfirmationMetric);
  const traceMock = jest.mocked(trace);
  const endTraceMock = jest.mocked(endTrace);

  function mockTransaction(overrides?: Partial<TransactionMeta>) {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      time: CREATED_AT_MS_MOCK,
      type: TransactionType.simpleSend,
      ...overrides,
    } as TransactionMeta);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(PAINTED_AT_MS_MOCK);
    useTransactionMetadataRequestMock.mockReturnValue(undefined);
  });

  it('does not report anything before first paint', () => {
    mockTransaction();

    renderHook(() => useConfirmationLoadMetrics());

    expect(updateConfirmationMetricMock).not.toHaveBeenCalled();
    expect(traceMock).not.toHaveBeenCalled();
    expect(endTraceMock).not.toHaveBeenCalled();
  });

  it('dispatches confirmation_time_to_open_ms anchored at first paint', () => {
    mockTransaction();

    const { result } = renderHook(() => useConfirmationLoadMetrics());
    result.current.onFirstPaint();

    expect(updateConfirmationMetricMock).toHaveBeenCalledWith({
      id: TRANSACTION_ID_MOCK,
      params: {
        properties: {
          confirmation_time_to_open_ms: 1000,
        },
      },
    });
  });

  it('records a backdated trace spanning transaction creation to first paint', () => {
    mockTransaction();

    const { result } = renderHook(() => useConfirmationLoadMetrics());
    result.current.onFirstPaint();

    expect(traceMock).toHaveBeenCalledWith({
      name: TraceName.TransactionConfirmationLoad,
      id: TRANSACTION_ID_MOCK,
      startTime: CREATED_AT_MS_MOCK,
      forceTransaction: true,
      tags: { transaction_type: 'simple_send' },
    });
    expect(endTraceMock).toHaveBeenCalledWith({
      name: TraceName.TransactionConfirmationLoad,
      id: TRANSACTION_ID_MOCK,
      timestamp: PAINTED_AT_MS_MOCK,
    });
  });

  it('reports once across repeated layout events', () => {
    mockTransaction();

    const { result } = renderHook(() => useConfirmationLoadMetrics());
    result.current.onFirstPaint();
    result.current.onFirstPaint();
    result.current.onFirstPaint();

    expect(updateConfirmationMetricMock).toHaveBeenCalledTimes(1);
    expect(traceMock).toHaveBeenCalledTimes(1);
    expect(endTraceMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      scenario: 'a plain transaction type',
      expected: 'simple_send',
      overrides: { type: TransactionType.simpleSend },
    },
    {
      scenario: 'a batch resolved from its nested transactions',
      expected: 'perps_deposit_batch',
      overrides: {
        type: TransactionType.batch,
        nestedTransactions: [{ type: TransactionType.perpsRelayDeposit }],
      },
    },
    {
      scenario: 'a missing transaction type',
      expected: 'unknown',
      overrides: { type: undefined },
    },
  ])(
    'tags the trace with $expected given $scenario',
    ({ expected, overrides }) => {
      mockTransaction(overrides as Partial<TransactionMeta>);

      const { result } = renderHook(() => useConfirmationLoadMetrics());
      result.current.onFirstPaint();

      expect(traceMock).toHaveBeenCalledWith(
        expect.objectContaining({ tags: { transaction_type: expected } }),
      );
    },
  );

  it('skips confirmations with no transaction metadata', () => {
    useTransactionMetadataRequestMock.mockReturnValue(
      undefined as unknown as TransactionMeta,
    );

    const { result } = renderHook(() => useConfirmationLoadMetrics());
    result.current.onFirstPaint();

    expect(updateConfirmationMetricMock).not.toHaveBeenCalled();
    expect(traceMock).not.toHaveBeenCalled();
  });

  it.each([0, undefined])(
    'skips transactions with an unusable creation time of %s',
    (time) => {
      mockTransaction({ time: time as number });

      const { result } = renderHook(() => useConfirmationLoadMetrics());
      result.current.onFirstPaint();

      expect(updateConfirmationMetricMock).not.toHaveBeenCalled();
      expect(traceMock).not.toHaveBeenCalled();
    },
  );
});
