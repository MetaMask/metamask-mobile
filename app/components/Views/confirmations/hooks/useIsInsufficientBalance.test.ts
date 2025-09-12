import { renderHook } from '@testing-library/react-hooks';
import { useIsInsufficientBalance } from './useIsInsufficientBalance';
// eslint-disable-next-line import/no-namespace
import * as useInsufficientBalanceAlertModule from './alerts/useInsufficientBalanceAlert';
import { Severity } from '../types/alerts';

const ALERT_MOCK = {
  field: 'MOCK_FIELD',
  key: 'MOCK_KEY',
  message: `Insufficient balance`,
  title: 'Insufficient Balance',
  severity: Severity.Danger,
};

describe('useIsInsufficientBalance', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return true when useInsufficientBalanceAlert returns a non-empty array', () => {
    jest
      .spyOn(useInsufficientBalanceAlertModule, 'useInsufficientBalanceAlert')
      .mockReturnValue([ALERT_MOCK]);

    const { result } = renderHook(() => useIsInsufficientBalance());

    expect(result.current).toBe(true);
  });

  it('should return false when useInsufficientBalanceAlert returns an empty array', () => {
    jest
      .spyOn(useInsufficientBalanceAlertModule, 'useInsufficientBalanceAlert')
      .mockReturnValue([]);

    const { result } = renderHook(() => useIsInsufficientBalance());

    expect(result.current).toBe(false);
  });
});
