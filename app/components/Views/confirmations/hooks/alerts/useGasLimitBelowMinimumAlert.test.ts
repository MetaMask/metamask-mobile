import { TransactionMeta } from '@metamask/transaction-controller';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useGasLimitBelowMinimumAlert } from './useGasLimitBelowMinimumAlert';

jest.mock('../transactions/useTransactionMetadataRequest');

const mockUseTransactionMetadataRequest = jest.mocked(
  useTransactionMetadataRequest,
);

function setGas(gas: string | undefined) {
  mockUseTransactionMetadataRequest.mockReturnValue(
    gas ? ({ txParams: { gas } } as unknown as TransactionMeta) : undefined,
  );
}

describe('useGasLimitBelowMinimumAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a blocking alert below the EIP-2780 minimum', () => {
    setGas('0x2edf');

    const { result } = renderHookWithProvider(() =>
      useGasLimitBelowMinimumAlert(),
    );

    expect(result.current).toEqual([
      {
        isBlocking: true,
        key: AlertKeys.GasLimitBelowMinimum,
        field: RowAlertKey.EstimatedFee,
        message:
          "To continue with this transaction, you'll need to increase the gas limit to 12000 or higher.",
        title: 'Low gas limit',
        severity: Severity.Warning,
      },
    ]);
  });

  it.each(['0x2ee0', '0x5208'])('returns no alert for gas limit %s', (gas) => {
    setGas(gas);

    const { result } = renderHookWithProvider(() =>
      useGasLimitBelowMinimumAlert(),
    );

    expect(result.current).toEqual([]);
  });

  it('returns no alert without transaction metadata', () => {
    setGas(undefined);

    const { result } = renderHookWithProvider(() =>
      useGasLimitBelowMinimumAlert(),
    );

    expect(result.current).toEqual([]);
  });
});
