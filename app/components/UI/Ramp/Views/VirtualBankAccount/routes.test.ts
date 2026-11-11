import Routes from '../../../../../constants/navigation/Routes';
import {
  VBA_DEFAULT_CALLER_ROUTE,
  VbaOnboardingRoutes,
  getVbaOnboardingResumeState,
} from './routes';

describe('getVbaOnboardingResumeState', () => {
  it('opens the onboarding loading screen above the home tabs and asks to focus Money below', () => {
    const state = getVbaOnboardingResumeState('vba-kyc-relaunch');

    expect(state).toStrictEqual({
      index: 1,
      routes: [
        VBA_DEFAULT_CALLER_ROUTE,
        {
          name: Routes.RAMP.VBA_ONBOARDING,
          params: { focusMoneyTabBelow: true },
          state: {
            index: 0,
            routes: [
              {
                name: VbaOnboardingRoutes.LOADING,
                params: { source: 'vba-kyc-relaunch' },
              },
            ],
          },
        },
      ],
    });
  });
});
