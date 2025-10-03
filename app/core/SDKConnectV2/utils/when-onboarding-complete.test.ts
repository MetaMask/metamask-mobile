/* eslint-disable @typescript-eslint/no-explicit-any */
import { selectCompletedOnboarding } from '../../../selectors/onboarding';
import { whenOnboardingComplete } from './when-onboarding-complete';

jest.mock('../../../selectors/onboarding');
jest.mock('../../../store');

const mockSelectCompletedOnboarding =
  selectCompletedOnboarding as jest.MockedFunction<
    typeof selectCompletedOnboarding
  >;

describe('when-onboarding-complete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('whenOnboardingComplete', () => {
    it('should resolve immediately if onboarding is already complete', async () => {
      mockSelectCompletedOnboarding.mockReturnValue(true);

      const promise = whenOnboardingComplete();
      await expect(promise).resolves.toBeUndefined();
    });

    it('should wait and then resolve when onboarding becomes complete', async () => {
      mockSelectCompletedOnboarding
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValue(true);

      const promise = whenOnboardingComplete();

      // Fast-forward time to trigger the check intervals
      await jest.advanceTimersByTimeAsync(200);

      await expect(promise).resolves.toBeUndefined();
    });

    it('should handle errors when accessing store state', async () => {
      let callCount = 0;
      mockSelectCompletedOnboarding.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          throw new Error('Store not ready');
        }
        return true;
      });

      const promise = whenOnboardingComplete();

      // Fast-forward time to trigger the check intervals
      await jest.advanceTimersByTimeAsync(300);

      await expect(promise).resolves.toBeUndefined();
    });
  });
});
