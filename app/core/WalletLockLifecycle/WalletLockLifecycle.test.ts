import { UserActionType } from '../../actions/user/types';
import {
  __resetWalletLockedForTests,
  getWalletLocked,
  selectIsWalletLocked,
  setWalletLocked,
} from './WalletLockLifecycle';

const mockDispatch = jest.fn();

jest.mock('../redux', () => ({
  __esModule: true,
  default: {
    store: {
      dispatch: (...args: unknown[]) => mockDispatch(...args),
      getState: () => ({ user: { isWalletLocked: false } }),
    },
  },
}));

describe('WalletLockLifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetWalletLockedForTests();
  });

  it('setWalletLocked(true) updates getWalletLocked and mirrors to Redux', () => {
    setWalletLocked(true);

    expect(getWalletLocked()).toBe(true);
    expect(mockDispatch).toHaveBeenCalledWith({
      type: UserActionType.SET_IS_WALLET_LOCKED,
      isWalletLocked: true,
    });
  });

  it('setWalletLocked(false) clears the flag after unlock navigation', () => {
    setWalletLocked(true);
    setWalletLocked(false);

    expect(getWalletLocked()).toBe(false);
    expect(mockDispatch).toHaveBeenLastCalledWith({
      type: UserActionType.SET_IS_WALLET_LOCKED,
      isWalletLocked: false,
    });
  });

  it('setWalletLocked is a no-op when the flag is already that value', () => {
    setWalletLocked(true);
    mockDispatch.mockClear();

    setWalletLocked(true);

    expect(getWalletLocked()).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('selectIsWalletLocked reads the Redux user field', () => {
    expect(
      selectIsWalletLocked({
        user: { isWalletLocked: true },
      } as never),
    ).toBe(true);
    expect(
      selectIsWalletLocked({
        user: { isWalletLocked: false },
      } as never),
    ).toBe(false);
  });
});
