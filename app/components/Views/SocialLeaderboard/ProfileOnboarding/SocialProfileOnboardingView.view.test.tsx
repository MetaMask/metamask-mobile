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
import NetInfo from '@react-native-community/netinfo';
import { fireEvent, screen } from '@testing-library/react-native';
import type NetInfoMock from '../../../../__mocks__/@react-native-community/netinfo';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { renderSocialProfileOnboarding } from '../../../../../tests/component-view/renderers/socialLeaderboard';
import {
  getLocalSocialProfileSnapshot,
  restoreDefaultLocalSocialProfile,
} from '../MyProfileView/hooks/localSocialProfileStore';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const goOnline = () =>
  netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });

const continueFromUsername = async () => {
  fireEvent.press(
    screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
  );
  expect(
    await screen.findByTestId(SocialProfileOnboardingSelectorsIDs.AVATAR_STEP),
  ).toBeOnTheScreen();
};

describe('SocialProfileOnboardingView', () => {
  afterEach(() => {
    restoreDefaultLocalSocialProfile();
    netInfoMock.__resetMockNetInfo();
    jest.mocked(Engine.context.ProfileController.createProfile).mockClear();
    jest
      .mocked(Engine.context.ProfileController.checkUsernameAvailability)
      .mockClear();
    jest
      .mocked(Engine.context.ProfileController.getXAuthorizationUrl)
      .mockClear();
  });

  it('writes a manual profile and opens the feed', async () => {
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    await continueFromUsername();
    fireEvent.press(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.AVATAR_OPTION}-zombie`,
      ),
    );
    fireEvent(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_CAROUSEL,
      ),
      'layout',
      { nativeEvent: { layout: { width: 390, height: 136 } } },
    );
    fireEvent.press(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_OPTION}-3`,
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
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({
        handle: 'wen-cat',
        displayName: 'Wen Cat',
        avatarPresetId: 'zombie',
        avatarBackgroundId: 'lime',
        shareTradingActivity: false,
        linkedAccountId: 'acc-1',
      }),
    );
    expect(
      Engine.context.ProfileController.checkUsernameAvailability,
    ).toHaveBeenCalledWith('wen-cat');
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      {
        profile_id: 'social-v1-profile',
        username: 'wen-cat',
        display_name: 'Wen Cat',
        bio: null,
        linked_addresses: [
          'eip155:1:0x0000000000000000000000000000000000000001',
        ],
        avatar_url: 'foxicon://zombie/lime',
        trading_privacy: 'private',
      },
    );
  });

  it('defaults the avatar backdrop to the centered color', async () => {
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    await continueFromUsername();

    expect(screen.getByText('Choose an avatar')).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.PROGRESS),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.AVATAR_BACKGROUND_CAROUSEL,
      ),
    ).toBeOnTheScreen();
  });

  it('shows the static live activity on the intro while offline', () => {
    renderSocialProfileOnboarding();

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.PROGRESS),
    ).not.toBeOnTheScreen();
  });

  it('plays the intro animation while online', () => {
    goOnline();

    renderSocialProfileOnboarding();

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_ANIMATION),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_FALLBACK),
    ).not.toBeOnTheScreen();
  });

  it('shows the animated profile card on the ready step while online', async () => {
    goOnline();
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    await continueFromUsername();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(await screen.findByText('Account 1')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_ANIMATION),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.READY_HANDLE),
    ).not.toBeOnTheScreen();
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

  it('stays on the username step when the handle is taken', async () => {
    jest
      .mocked(Engine.context.ProfileController.checkUsernameAvailability)
      .mockResolvedValueOnce({
        username: 'wen-cat',
        available: false,
        valid: true,
        normalized: 'wen-cat',
        errors: [],
      });
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await screen.findByText(
        'This handle is unavailable. Choose another one.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();
  });

  it('starts the X authorization flow from the intro step', async () => {
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );

    expect(
      await screen.findByTestId(SocialProfileOnboardingSelectorsIDs.INTRO),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.getXAuthorizationUrl,
    ).toHaveBeenCalled();
  });
});
