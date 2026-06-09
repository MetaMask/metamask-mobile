import { RootState } from '../../../reducers';
import { store, runSaga } from '../../../store';
import { ensureOnboardingComplete } from './ensureOnboardingComplete';
import { Task } from 'redux-saga';

jest.mock('../../../store', () => ({
  store: { getState: jest.fn() },
  runSaga: jest.fn(),
}));

const mockRunSaga = jest.mocked(runSaga);
const mockGetState = jest.mocked(store.getState);

function makeSagaTask(promise: Promise<void>): Task {
  return { toPromise: () => promise } as Task;
}

function setOnboardingComplete(complete: boolean) {
  mockGetState.mockReturnValue({
    onboarding: { completedOnboarding: complete },
  } as unknown as RootState);
}

describe('ensureOnboardingComplete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when onboarding is already complete', () => {
    it('resolves immediately without starting a saga', async () => {
      setOnboardingComplete(true);

      await ensureOnboardingComplete();

      expect(mockRunSaga).not.toHaveBeenCalled();
    });
  });

  describe('when onboarding is not yet complete', () => {
    it('starts a saga and waits for it to complete', async () => {
      setOnboardingComplete(false);
      mockRunSaga.mockReturnValue(makeSagaTask(Promise.resolve()));

      await ensureOnboardingComplete();

      expect(mockRunSaga).toHaveBeenCalledTimes(1);
    });

    it('does not resolve until the saga completes', async () => {
      setOnboardingComplete(false);

      let resolveSaga!: () => void;
      const sagaPromise = new Promise<void>((resolve) => {
        resolveSaga = resolve;
      });
      mockRunSaga.mockReturnValue(makeSagaTask(sagaPromise));

      let resolved = false;
      const pending = ensureOnboardingComplete().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      resolveSaga();
      await pending;

      expect(resolved).toBe(true);
    });

    it('shares a single saga task across concurrent calls', async () => {
      setOnboardingComplete(false);

      let resolveSaga!: () => void;
      const sagaPromise = new Promise<void>((resolve) => {
        resolveSaga = resolve;
      });
      mockRunSaga.mockReturnValue(makeSagaTask(sagaPromise));

      const p1 = ensureOnboardingComplete();
      const p2 = ensureOnboardingComplete();

      expect(mockRunSaga).toHaveBeenCalledTimes(1);

      resolveSaga();
      await Promise.all([p1, p2]);
    });

    it('resets the shared promise after resolution so the next call starts a new saga', async () => {
      setOnboardingComplete(false);
      mockRunSaga.mockReturnValue(makeSagaTask(Promise.resolve()));

      await ensureOnboardingComplete();
      await ensureOnboardingComplete();

      expect(mockRunSaga).toHaveBeenCalledTimes(2);
    });

    it('resets the shared promise after saga rejection so the next call starts a new saga', async () => {
      setOnboardingComplete(false);
      mockRunSaga.mockReturnValue(
        makeSagaTask(Promise.reject(new Error('saga failed'))),
      );

      await expect(ensureOnboardingComplete()).rejects.toThrow('saga failed');
      await expect(ensureOnboardingComplete()).rejects.toThrow('saga failed');

      expect(mockRunSaga).toHaveBeenCalledTimes(2);
    });
  });
});
