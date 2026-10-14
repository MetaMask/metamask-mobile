import { act, renderHook } from '@testing-library/react-hooks';
import { useMoneyAccountRegistrationStatus } from './useMoneyAccountRegistrationStatus';
import { forceUpgradeMoneyAccount } from '../../../../actions/money';
import {
  selectPrimaryMoneyAccount,
  selectMoneyAccountUpgradedAccounts,
} from '../../../../selectors/moneyAccountController';
import { selectIsUnlocked } from '../../../../selectors/keyringController';

jest.mock('../../../../actions/money', () => ({
  forceUpgradeMoneyAccount: jest.fn(),
}));
jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
  selectMoneyAccountUpgradedAccounts: jest.fn(),
}));
jest.mock('../../../../selectors/keyringController', () => ({
  selectIsUnlocked: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => (selector as jest.Mock)(),
}));

const ADDRESS = '0x1111111111111111111111111111111111111111' as const;

describe('useMoneyAccountRegistrationStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(selectPrimaryMoneyAccount).mockReturnValue({
      address: ADDRESS,
    } as never);
    jest.mocked(selectMoneyAccountUpgradedAccounts).mockReturnValue({});
    jest.mocked(selectIsUnlocked).mockReturnValue(true);
  });

  it('maps registered and unavailable states', () => {
    jest.mocked(selectMoneyAccountUpgradedAccounts).mockReturnValue({
      [ADDRESS]: { configFingerprint: 'test', completedAt: 123 },
    });
    const { result, rerender } = renderHook(() =>
      useMoneyAccountRegistrationStatus(),
    );
    expect(result.current.status).toBe('registered');
    expect(result.current.completedAt).toBe(123);
    jest.mocked(selectIsUnlocked).mockReturnValue(false);
    rerender();
    expect(result.current.status).toBe('unavailable');
  });

  it('ignores concurrent retries and returns the result', async () => {
    let resolve: (value: { status: 'registered' }) => void = () => undefined;
    jest.mocked(forceUpgradeMoneyAccount).mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { result } = renderHook(() => useMoneyAccountRegistrationStatus());
    const first = result.current.retry();
    await act(async () => {
      await result.current.retry();
    });
    expect(forceUpgradeMoneyAccount).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ status: 'registered' }));
    await first;
    expect(result.current.retryResult).toEqual({ status: 'registered' });
  });
});
