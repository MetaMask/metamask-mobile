import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { navigateFromOnboardingToBuyFlow } from './navigateFromOnboardingToBuyFlow';

describe('navigateFromOnboardingToBuyFlow', () => {
  const mockParentNavigate = jest.fn();
  const mockGetParent = jest.fn(
    () =>
      ({
        navigate: mockParentNavigate,
      }) as unknown as NavigationProp<ParamListBase>,
  ) as NavigationProp<ParamListBase>['getParent'];

  const mockNavigation: Pick<NavigationProp<ParamListBase>, 'getParent'> = {
    getParent: mockGetParent,
  };

  const noParentNavigation: Pick<NavigationProp<ParamListBase>, 'getParent'> = {
    getParent: (() => undefined) as NavigationProp<ParamListBase>['getParent'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pushes the unified buy flow (token selection) onto the onboarding root stack', () => {
    navigateFromOnboardingToBuyFlow(mockNavigation);

    expect(mockGetParent).toHaveBeenCalledTimes(1);
    expect(mockParentNavigate).toHaveBeenCalledWith(
      Routes.RAMP.TOKEN_SELECTION,
    );
  });

  it('does nothing when the onboarding root navigator is unavailable', () => {
    navigateFromOnboardingToBuyFlow(noParentNavigation);

    expect(mockParentNavigate).not.toHaveBeenCalled();
  });
});
