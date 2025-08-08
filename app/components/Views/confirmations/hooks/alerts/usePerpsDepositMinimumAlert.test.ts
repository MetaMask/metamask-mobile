import { renderHook } from '@testing-library/react-native';
import { usePerpsDepositMinimumAlert } from './usePerpsDepositMinimumAlert';
import { useTokenAmount } from '../useTokenAmount';
import { AlertKeys } from '../../constants/alerts';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { strings } from '../../../../../../locales/i18n';

jest.mock('../useTokenAmount');

function runHook() {
  return renderHook(() => usePerpsDepositMinimumAlert());
}

describe('usePerpsDepositMinimumAlert', () => {
  const useTokenAmountMock = jest.mocked(useTokenAmount);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns alert if token amount less than minimum', () => {
    useTokenAmountMock.mockReturnValue({ usdValue: '9.99' } as ReturnType<
      typeof useTokenAmount
    >);

    const { result } = runHook();

    expect(result.current).toStrictEqual([
      {
        key: AlertKeys.PerpsDepositMinimum,
        field: RowAlertKey.Amount,
        message: strings('alert_system.perps_deposit_minimum.message'),
        severity: Severity.Danger,
        isBlocking: true,
      },
    ]);
  });

  it('returns no alert if token amount greater than minimum', () => {
    useTokenAmountMock.mockReturnValue({ usdValue: '10.01' } as ReturnType<
      typeof useTokenAmount
    >);

    const { result } = runHook();

    expect(result.current).toStrictEqual([]);
  });
});
