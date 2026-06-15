import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { navigateFromOnboardingToDepositFlow } from './navigateFromOnboardingToDepositFlow';

describe('navigateFromOnboardingToDepositFlow', () => {
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

  it('pushes token selection onto the onboarding root stack when unified V2 is enabled', () => {
    navigateFromOnboardingToDepositFlow(mockNavigation, true);

    expect(mockGetParent).toHaveBeenCalledTimes(1);
    expect(mockParentNavigate).toHaveBeenCalledWith(
      Routes.RAMP.TOKEN_SELECTION,
    );
  });

  it('pushes deposit onto the onboarding root stack when unified V2 is disabled', () => {
    navigateFromOnboardingToDepositFlow(mockNavigation, false);

    expect(mockParentNavigate).toHaveBeenCalledWith(Routes.DEPOSIT.ID);
  });

  it('does nothing when the onboarding root navigator is unavailable', () => {
    navigateFromOnboardingToDepositFlow(noParentNavigation, true);

    expect(mockParentNavigate).not.toHaveBeenCalled();
  });
});
