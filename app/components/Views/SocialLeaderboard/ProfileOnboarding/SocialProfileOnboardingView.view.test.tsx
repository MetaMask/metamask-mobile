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
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';
import Engine from '../../../../core/Engine';
import Routes from '../../../../constants/navigation/Routes';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { renderSocialProfileOnboarding } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import {
  getLocalSocialProfileSnapshot,
  restoreDefaultLocalSocialProfile,
} from '../MyProfileView/hooks/localSocialProfileStore';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

describe('SocialProfileOnboardingView', () => {
  const checkUsernameAvailability = Engine.context.ProfileController
    .checkUsernameAvailability as jest.Mock;
  const createProfile = Engine.context.ProfileController
    .createProfile as jest.Mock;
  const getXAuthUrl = Engine.context.ProfileService.getXAuthUrl as jest.Mock;

  beforeEach(() => {
    (
      Engine.context.AuthenticationController as {
        getSessionProfile: jest.Mock;
      }
    ).getSessionProfile = jest
      .fn()
      .mockResolvedValue({ profileId: 'session-profile' });
    checkUsernameAvailability.mockResolvedValue({
      username: 'wen-cat',
      available: true,
      valid: true,
      normalized: 'wen-cat',
      errors: [],
    });
    createProfile.mockClear();
  });

  afterEach(() => {
    restoreDefaultLocalSocialProfile();
  });

  it('creates a profile and opens the feed', async () => {
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS,
      ),
    ).toHaveTextContent('Username available · metamask.io/wen-cat');
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
    expect(screen.queryByText('Solana Account')).not.toBeOnTheScreen();
    expect(
      screen.getAllByTestId(
        new RegExp(`^${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-`),
      ),
    ).toHaveLength(1);

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
    expect(createProfile).toHaveBeenCalledWith({
      profile_id: 'session-profile',
      username: 'wen-cat',
      display_name: 'Wen Cat',
      bio: null,
      linked_addresses: ['eip155:0:0x0000000000000000000000000000000000000001'],
      trading_privacy: 'private',
    });
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({
        profileId: 'session-profile',
        handle: 'wen-cat',
        displayName: 'Wen Cat',
        avatarPresetId: 'fox-emoji',
        shareTradingActivity: false,
        linkedAccountId: 'acc-1',
      }),
    );
  });

  it('opens the X authorization URL', async () => {
    const openURL = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined as never);
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );

    await waitFor(() => {
      expect(getXAuthUrl).toHaveBeenCalledTimes(1);
      expect(openURL).toHaveBeenCalledWith('https://x.com/i/oauth2/authorize');
    });
    openURL.mockRestore();
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
