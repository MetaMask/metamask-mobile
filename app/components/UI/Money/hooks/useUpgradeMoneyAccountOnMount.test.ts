import { renderHook } from '@testing-library/react-hooks';
import { useUpgradeMoneyAccountOnMount } from './useUpgradeMoneyAccountOnMount';
import { upgradeMoneyAccount } from '../../../../actions/money';
import useThunkDispatch from '../../../hooks/useThunkDispatch';

jest.mock('../../../../actions/money', () => ({
  upgradeMoneyAccount: jest.fn(),
}));

jest.mock('../../../hooks/useThunkDispatch', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUpgradeMoneyAccount = upgradeMoneyAccount as jest.MockedFunction<
  typeof upgradeMoneyAccount
>;
const mockUseThunkDispatch = useThunkDispatch as jest.MockedFunction<
  typeof useThunkDispatch
>;

describe('useUpgradeMoneyAccountOnMount', () => {
  const mockDispatch = jest.fn();
  const mockUpgradeAction = { type: 'UPGRADE_MONEY_ACCOUNT' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThunkDispatch.mockReturnValue(mockDispatch as never);
    mockUpgradeMoneyAccount.mockReturnValue(mockUpgradeAction as never);
  });

  it('dispatches upgradeMoneyAccount on mount', () => {
    renderHook(() => useUpgradeMoneyAccountOnMount());

    expect(mockDispatch).toHaveBeenCalledWith(mockUpgradeAction);
  });

  it('does not dispatch again on re-render when dispatch reference is stable', () => {
    const { rerender } = renderHook(() => useUpgradeMoneyAccountOnMount());

    rerender();

    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });
});
