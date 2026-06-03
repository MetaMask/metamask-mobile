import { store, runSaga } from '../../../store';
import { selectCompletedOnboarding } from '../../../selectors/onboarding';
import { createEnsureOnboardingCompleteCallback } from './ensureOnboardingComplete';
import { Task } from 'redux-saga';

jest.mock('../../../store', () => ({
  store: { getState: jest.fn() },
  runSaga: jest.fn(),
}));

jest.mock('../../../selectors/onboarding', () => ({
  selectCompletedOnboarding: jest.fn(),
}));

const mockRunSaga = jest.mocked(runSaga);
const mockSelectCompletedOnboarding = jest.mocked(selectCompletedOnboarding);

function makeSagaTask(promise: Promise<void>): Task {
  return { toPromise: () => promise } as Task;
}

describe('createEnsureOnboardingCompleteCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when onboarding is already complete', () => {
    it('resolves immediately without starting a saga', async () => {
      mockSelectCompletedOnboarding.mockReturnValue(true);

      const ensureOnboardingComplete = createEnsureOnboardingCompleteCallback();
      await ensureOnboardingComplete();

      expect(mockRunSaga).not.toHaveBeenCalled();
    });
  });

  describe('when onboarding is not yet complete', () => {
    it('starts a saga and waits for it to complete', async () => {
      mockSelectCompletedOnboarding.mockReturnValue(false);
      mockRunSaga.mockReturnValue(makeSagaTask(Promise.resolve()));

      const ensureOnboardingComplete = createEnsureOnboardingCompleteCallback();
      await ensureOnboardingComplete();

      expect(mockRunSaga).toHaveBeenCalledTimes(1);
    });

    it('does not resolve until the saga completes', async () => {
      mockSelectCompletedOnboarding.mockReturnValue(false);

      let resolveSaga!: () => void;
      const sagaPromise = new Promise<void>((resolve) => {
        resolveSaga = resolve;
      });
      mockRunSaga.mockReturnValue(makeSagaTask(sagaPromise));

      const ensureOnboardingComplete = createEnsureOnboardingCompleteCallback();

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
      mockSelectCompletedOnboarding.mockReturnValue(false);

      let resolveSaga!: () => void;
      const sagaPromise = new Promise<void>((resolve) => {
        resolveSaga = resolve;
      });
      mockRunSaga.mockReturnValue(makeSagaTask(sagaPromise));

      const ensureOnboardingComplete = createEnsureOnboardingCompleteCallback();

      const p1 = ensureOnboardingComplete();
      const p2 = ensureOnboardingComplete();

      expect(mockRunSaga).toHaveBeenCalledTimes(1);

      resolveSaga();
      await Promise.all([p1, p2]);
    });

    it('resets the shared promise after resolution so the next call starts a new saga', async () => {
      mockSelectCompletedOnboarding.mockReturnValue(false);
      mockRunSaga.mockReturnValue(makeSagaTask(Promise.resolve()));

      const ensureOnboardingComplete = createEnsureOnboardingCompleteCallback();

      await ensureOnboardingComplete();
      await ensureOnboardingComplete();

      expect(mockRunSaga).toHaveBeenCalledTimes(2);
    });

    it('resets the shared promise after saga rejection so the next call starts a new saga', async () => {
      mockSelectCompletedOnboarding.mockReturnValue(false);
      mockRunSaga.mockReturnValue(
        makeSagaTask(Promise.reject(new Error('saga failed'))),
      );

      const ensureOnboardingComplete = createEnsureOnboardingCompleteCallback();

      await expect(ensureOnboardingComplete()).rejects.toThrow('saga failed');
      await expect(ensureOnboardingComplete()).rejects.toThrow('saga failed');

      expect(mockRunSaga).toHaveBeenCalledTimes(2);
    });

    it('passes the current store state to the selector', async () => {
      const fakeState = { onboarding: { completedOnboarding: false } };
      jest.mocked(store.getState).mockReturnValue(fakeState as never);
      mockSelectCompletedOnboarding.mockReturnValue(false);
      mockRunSaga.mockReturnValue(makeSagaTask(Promise.resolve()));

      const ensureOnboardingComplete = createEnsureOnboardingCompleteCallback();
      await ensureOnboardingComplete();

      expect(mockSelectCompletedOnboarding).toHaveBeenCalledWith(fakeState);
    });
  });
});
