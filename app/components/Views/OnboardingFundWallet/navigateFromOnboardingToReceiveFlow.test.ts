import type { AccountGroupId } from '@metamask/account-api';
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { navigateFromOnboardingToReceiveFlow } from './navigateFromOnboardingToReceiveFlow';

describe('navigateFromOnboardingToReceiveFlow', () => {
  const mockGroupId = 'entropy:wallet-id-1/1' as AccountGroupId;
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

  it('navigates to token selection in receive mode', () => {
    navigateFromOnboardingToReceiveFlow(mockNavigation, {
      groupId: mockGroupId,
    });

    expect(mockGetParent).toHaveBeenCalledTimes(1);
    expect(mockParentNavigate).toHaveBeenCalledWith(
      Routes.RAMP.TOKEN_SELECTION,
      {
        receiveMode: true,
        groupId: mockGroupId,
      },
    );
  });

  it('does nothing when the onboarding root navigator is unavailable', () => {
    navigateFromOnboardingToReceiveFlow(noParentNavigation, {
      groupId: mockGroupId,
    });

    expect(mockParentNavigate).not.toHaveBeenCalled();
  });
});
