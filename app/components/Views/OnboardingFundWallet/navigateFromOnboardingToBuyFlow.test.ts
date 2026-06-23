import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { navigateFromOnboardingToBuyFlow } from './navigateFromOnboardingToBuyFlow';

describe('navigateFromOnboardingToBuyFlow', () => {
  // TOKEN_SELECTION is registered on OnboardingRootNav — the direct parent of
  // OnboardingNav. One getParent() call is enough.
  const mockParentNavigate = jest.fn();

  const mockNavigation: Pick<NavigationProp<ParamListBase>, 'getParent'> = {
    getParent: jest.fn(
      () =>
        ({
          navigate: mockParentNavigate,
        }) as unknown as NavigationProp<ParamListBase>,
    ) as NavigationProp<ParamListBase>['getParent'],
  };

  const noParentNavigation: Pick<NavigationProp<ParamListBase>, 'getParent'> = {
    getParent: (() => undefined) as NavigationProp<ParamListBase>['getParent'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to OnboardingRootNav and pushes TOKEN_SELECTION', () => {
    navigateFromOnboardingToBuyFlow(mockNavigation);

    expect(mockParentNavigate).toHaveBeenCalledWith(
      Routes.RAMP.TOKEN_SELECTION,
    );
  });

  it('does nothing when there is no parent navigator', () => {
    navigateFromOnboardingToBuyFlow(noParentNavigation);

    expect(mockParentNavigate).not.toHaveBeenCalled();
  });
});
