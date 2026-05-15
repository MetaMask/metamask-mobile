import {
  TransactionStatus,
  TransactionType,
  TransactionMeta,
  UserFeeLevel,
} from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useGasEstimateFailedAlert } from './useGasEstimateFailedAlert';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { useIsCurrentTransactionGasSponsored } from './useIsCurrentTransactionGasSponsored';

jest.mock('../../../../../selectors/featureFlagController/gasFeesSponsored');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('../../../../../selectors/accountsController');
jest.mock('../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));
jest.mock('./useIsCurrentTransactionGasSponsored');

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
  txParams: {
    from: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
  },
  simulationFails: {
    reason: 'execution reverted',
  },
} as unknown as TransactionMeta;

const mockUseIsCurrentTransactionGasSponsored = jest.mocked(
  useIsCurrentTransactionGasSponsored,
);

describe('useGasEstimateFailedAlert', () => {
  const mockUseTransactionMetadataRequest = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIsCurrentTransactionGasSponsored.mockReturnValue({
      isCurrentTransactionGasSponsored: false,
    });
  });

  it('returns alert when simulationFails is truthy', () => {
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

  it('returns empty array when simulationFails is undefined', () => {
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

  it('returns no alerts if simulation fails but userFeeLevel is CUSTOM', () => {
    mockUseTransactionMetadataRequest.mockReturnValue({
      ...MOCK_TRANSACTION_META_WITH_SIMULATION_FAILS,
      userFeeLevel: UserFeeLevel.CUSTOM,
    } as unknown as TransactionMeta);

    const { result } = renderHookWithProvider(() =>
      useGasEstimateFailedAlert(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns no alerts if simulation fails but network is sponsored', () => {
    mockUseTransactionMetadataRequest.mockReturnValue(
      MOCK_TRANSACTION_META_WITH_SIMULATION_FAILS,
    );
    mockUseIsCurrentTransactionGasSponsored.mockReturnValue({
      isCurrentTransactionGasSponsored: true,
    });
    const { result } = renderHookWithProvider(() =>
      useGasEstimateFailedAlert(),
    );

    expect(result.current).toEqual([]);
  });
});
