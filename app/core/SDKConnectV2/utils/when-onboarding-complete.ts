import { selectCompletedOnboarding } from '../../../selectors/onboarding';
import { store } from '../../../store';

const isOnboardingComplete = (): boolean => {
  try {
    return selectCompletedOnboarding(store.getState());
  } catch (error) {
    return false;
  }
};

export async function whenOnboardingComplete() {
  while (!isOnboardingComplete()) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
