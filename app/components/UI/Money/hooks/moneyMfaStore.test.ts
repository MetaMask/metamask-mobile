import StorageWrapper from '../../../../store/storage-wrapper';
import { MONEY_MFA_STORAGE_KEY, moneyMfaStore } from './moneyMfaStore';

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    getItemSync: jest.fn(() => null),
    setItem: jest.fn(() => Promise.resolve()),
  },
}));

const mockSetItem = StorageWrapper.setItem as jest.Mock;

describe('moneyMfaStore', () => {
  afterEach(() => {
    moneyMfaStore.reset();
    jest.clearAllMocks();
  });

  it('starts idle with 2-step verification never turned on', () => {
    expect(moneyMfaStore.getState()).toEqual({
      phase: 'idle',
      isEnabled: false,
      hasBeenEnabled: false,
    });
  });

  it('merges a patch into the current state', () => {
    moneyMfaStore.setState({ isEnabled: true });

    moneyMfaStore.setState({ phase: 'setting_up' });

    expect(moneyMfaStore.getState()).toEqual({
      phase: 'setting_up',
      isEnabled: true,
      hasBeenEnabled: false,
    });
  });

  it('persists isEnabled and hasBeenEnabled when they change', () => {
    moneyMfaStore.setState({ isEnabled: true, hasBeenEnabled: true });

    expect(mockSetItem).toHaveBeenCalledWith(
      MONEY_MFA_STORAGE_KEY,
      JSON.stringify({ isEnabled: true, hasBeenEnabled: true }),
    );
  });

  it('does not persist a phase-only change', () => {
    moneyMfaStore.setState({ phase: 'failed' });

    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('notifies subscribers when the state changes', () => {
    const listener = jest.fn();
    moneyMfaStore.subscribe(listener);

    moneyMfaStore.setState({ phase: 'failed' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('stops notifying a listener after it unsubscribes', () => {
    const listener = jest.fn();
    const unsubscribe = moneyMfaStore.subscribe(listener);

    unsubscribe();
    moneyMfaStore.setState({ phase: 'failed' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('restores the initial state and notifies subscribers on reset', () => {
    moneyMfaStore.setState({ phase: 'failed', isEnabled: true });
    const listener = jest.fn();
    moneyMfaStore.subscribe(listener);

    moneyMfaStore.reset();

    expect(moneyMfaStore.getState()).toEqual({
      phase: 'idle',
      isEnabled: false,
      hasBeenEnabled: false,
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('moneyMfaStore persisted state', () => {
  it('reads the saved state at startup', () => {
    jest.isolateModules(() => {
      (StorageWrapper.getItemSync as jest.Mock).mockReturnValueOnce(
        JSON.stringify({ isEnabled: false, hasBeenEnabled: true }),
      );
      const { moneyMfaStore: freshStore } =
        jest.requireActual<typeof import('./moneyMfaStore')>('./moneyMfaStore');

      expect(freshStore.getState()).toEqual({
        phase: 'idle',
        isEnabled: false,
        hasBeenEnabled: true,
      });
    });
  });
});
