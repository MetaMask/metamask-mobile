import { getOnboardingExitMethod } from './getOnboardingExitMethod';

describe('getOnboardingExitMethod', () => {
  it('reports the iOS swipe-back gesture as a swipe', () => {
    const method = getOnboardingExitMethod(
      { type: 'POP', source: 'onboarding-key' },
      'ios',
    );

    expect(method).toBe('swipe');
  });

  it('reports a pop on Android as a system back', () => {
    const method = getOnboardingExitMethod(
      { type: 'POP', source: 'onboarding-key' },
      'android',
    );

    expect(method).toBe('system_back');
  });

  it('reports a go back without a source screen as a system back', () => {
    const method = getOnboardingExitMethod({ type: 'GO_BACK' }, 'android');

    expect(method).toBe('system_back');
  });

  it('ignores a go back that the screen dispatched itself', () => {
    const method = getOnboardingExitMethod(
      { type: 'GO_BACK', source: 'onboarding-key' },
      'ios',
    );

    expect(method).toBeUndefined();
  });

  it.each(['NAVIGATE', 'REPLACE', 'RESET', 'POP_TO'])(
    'ignores %s because the app moved on by itself',
    (type) => {
      const method = getOnboardingExitMethod({ type }, 'ios');

      expect(method).toBeUndefined();
    },
  );
});
