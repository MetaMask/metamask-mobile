import { renderHook } from '@testing-library/react-hooks';
import { useFocusEffect } from '@react-navigation/native';
import { useUpgradeMoneyAccountOnFocus } from './useUpgradeMoneyAccountOnFocus';
import { upgradeMoneyAccount } from '../../../../actions/money';
import useThunkDispatch from '../../../hooks/useThunkDispatch';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock('../../../../actions/money', () => ({
  upgradeMoneyAccount: jest.fn(),
}));

jest.mock('../../../hooks/useThunkDispatch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseFocusEffect = useFocusEffect as jest.MockedFunction<
  typeof useFocusEffect
>;
const mockUpgradeMoneyAccount = upgradeMoneyAccount as jest.MockedFunction<
  typeof upgradeMoneyAccount
>;
const mockUseThunkDispatch = useThunkDispatch as jest.MockedFunction<
  typeof useThunkDispatch
>;

describe('useUpgradeMoneyAccountOnFocus', () => {
  const mockDispatch = jest.fn();
  let focusCallback: () => undefined | (() => void);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThunkDispatch.mockReturnValue(mockDispatch as never);
    mockUpgradeMoneyAccount.mockImplementation(
      ((signal?: AbortSignal) =>
        ({ type: 'UPGRADE_MONEY_ACCOUNT', signal }) as never) as never,
    );
    mockUseFocusEffect.mockImplementation((callback) => {
      focusCallback = callback as typeof focusCallback;
    });
  });

  it('does not dispatch until the hosting screen gains focus', () => {
    renderHook(() => useUpgradeMoneyAccountOnFocus());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('dispatches upgradeMoneyAccount with an abort signal on focus', () => {
    renderHook(() => useUpgradeMoneyAccountOnFocus());

    focusCallback();

    expect(mockUpgradeMoneyAccount).toHaveBeenCalledWith(
      expect.any(AbortSignal),
    );
    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UPGRADE_MONEY_ACCOUNT' }),
    );
  });

  it('aborts the in-flight upgrade when the screen loses focus', () => {
    renderHook(() => useUpgradeMoneyAccountOnFocus());

    const cleanup = focusCallback() as () => void;
    const signal = mockUpgradeMoneyAccount.mock.calls[0][0] as AbortSignal;
    expect(signal.aborted).toBe(false);

    cleanup();

    expect(signal.aborted).toBe(true);
  });

  it('starts a fresh, non-aborted attempt on each focus', () => {
    renderHook(() => useUpgradeMoneyAccountOnFocus());

    const cleanup = focusCallback() as () => void;
    cleanup();
    focusCallback();

    expect(mockUpgradeMoneyAccount).toHaveBeenCalledTimes(2);
    const secondSignal = mockUpgradeMoneyAccount.mock
      .calls[1][0] as AbortSignal;
    expect(secondSignal.aborted).toBe(false);
  });
});
