/**
 * Component-view coverage for the manual profile onboarding flow.
 *
 * Account rows come from Redux (AccountsController). The profile itself is an
 * in-memory store, so the test restores that store after each run.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/ProfileOnboarding/SocialProfileOnboardingView.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../tests/component-view/mocks';
import { fireEvent, screen } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { renderSocialProfileOnboarding } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import {
  getLocalSocialProfileSnapshot,
  restoreDefaultLocalSocialProfile,
} from '../MyProfileView/hooks/localSocialProfileStore';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

describe('SocialProfileOnboardingView', () => {
  afterEach(() => {
    restoreDefaultLocalSocialProfile();
  });

  it('writes a manual profile and opens the feed', async () => {
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.AVATAR_OPTION}-1`,
      ),
    );
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(await screen.findByText('Account 1')).toBeOnTheScreen();

    fireEvent(screen.getByRole('switch'), 'valueChange', false);
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_HANDLE),
    ).toHaveTextContent('@wen-cat');

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON),
    );

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({
        handle: 'wen-cat',
        displayName: 'Wen Cat',
        avatarPresetId: 'fox-emoji',
        shareTradingActivity: false,
        linkedAccountId: 'acc-1',
      }),
    );
  });

  it('stays on the username step when the handle cannot be claimed', () => {
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    fireEvent.changeText(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT),
      'no',
    );
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.AVATAR_STEP),
    ).not.toBeOnTheScreen();
  });
});
