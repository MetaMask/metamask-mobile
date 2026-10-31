import StorageWrapper from '../../../store/storage-wrapper';
import { MONEY_MFA_STORAGE_KEY, moneyMfaStore } from './moneyMfaStore';

jest.mock('../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    getItemSync: jest.fn(() => null),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

const mockSetItem = jest.mocked(StorageWrapper.setItem);
const mockGetItemSync = jest.mocked(StorageWrapper.getItemSync);

describe('moneyMfaStore', () => {
  afterEach(() => {
    moneyMfaStore.reset();
    jest.clearAllMocks();
  });

  it('starts with 2-step verification off and the banner not dismissed', () => {
    expect(moneyMfaStore.getState()).toEqual({
      isMoneyAccountMfaEnabled: false,
      isMigrationBannerDismissed: false,
      isHomePromptDismissed: false,
    });
  });

  it('merges a patch into the current state', () => {
    moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });

    moneyMfaStore.setState({ isMigrationBannerDismissed: true });

    expect(moneyMfaStore.getState()).toEqual({
      isMoneyAccountMfaEnabled: true,
      isMigrationBannerDismissed: true,
      isHomePromptDismissed: false,
    });
  });

  it('saves the state on every change', () => {
    moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });

    expect(mockSetItem).toHaveBeenCalledWith(
      MONEY_MFA_STORAGE_KEY,
      JSON.stringify({
        isMoneyAccountMfaEnabled: true,
        isMigrationBannerDismissed: false,
        isHomePromptDismissed: false,
      }),
    );
  });

  it('notifies subscribers until they unsubscribe', () => {
    const listener = jest.fn();
    const unsubscribe = moneyMfaStore.subscribe(listener);

    moneyMfaStore.setState({ isMoneyAccountMfaEnabled: true });
    unsubscribe();
    moneyMfaStore.setState({ isMoneyAccountMfaEnabled: false });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('reads the saved state at startup', () => {
    mockGetItemSync.mockReturnValueOnce(
      JSON.stringify({
        isMoneyAccountMfaEnabled: true,
        isMigrationBannerDismissed: true,
        isHomePromptDismissed: true,
      }),
    );

    jest.isolateModules(() => {
      const { moneyMfaStore: freshStore } =
        jest.requireActual<typeof import('./moneyMfaStore')>('./moneyMfaStore');

      expect(freshStore.getState()).toEqual({
        isMoneyAccountMfaEnabled: true,
        isMigrationBannerDismissed: true,
        isHomePromptDismissed: true,
      });
    });
  });

  it('falls back to the defaults when the saved state is unreadable', () => {
    mockGetItemSync.mockReturnValueOnce('not json');

    jest.isolateModules(() => {
      const { moneyMfaStore: freshStore } =
        jest.requireActual<typeof import('./moneyMfaStore')>('./moneyMfaStore');

      expect(freshStore.getState().isMoneyAccountMfaEnabled).toBe(false);
    });
  });
});
