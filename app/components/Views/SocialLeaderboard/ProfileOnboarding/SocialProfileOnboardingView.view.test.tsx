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
import type { Profile } from '@metamask/profile-controller';
import NetInfo from '@react-native-community/netinfo';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import type NetInfoMock from '../../../../__mocks__/@react-native-community/netinfo';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import {
  renderSocialProfileOnboarding,
  SECOND_ONBOARDING_EVM_ACCOUNT,
} from '../../../../../tests/component-view/renderers/socialLeaderboard';
import {
  getLocalSocialProfileSnapshot,
  clearLocalSocialProfile,
} from '../MyProfileView/hooks/localSocialProfileStore';
import { displayNameFromUsername } from './profileOnboardingDraft';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { strings } from '../../../../../locales/i18n';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const goOnline = () =>
  netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });

const usernameValue = (): string =>
  screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT).props
    .value as string;

const continueFromUsername = async () => {
  fireEvent.press(
    screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
  );
  expect(
    await screen.findByTestId(SocialProfileOnboardingSelectorsIDs.AVATAR_STEP),
  ).toBeOnTheScreen();
};

const letsGoDisabled = (): boolean =>
  screen.getByTestId(SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON).props
    .accessibilityState?.disabled === true;

const leaveReadyStep = async () => {
  await waitFor(() => {
    expect(letsGoDisabled()).toBe(false);
  });
  fireEvent.press(
    screen.getByTestId(SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON),
  );
};

const pressBack = () => {
  fireEvent.press(
    screen.getByTestId(SocialProfileOnboardingSelectorsIDs.BACK_BUTTON),
  );
};

const deferUpdateProfile = () => {
  let resolveUpdate: () => void = () => undefined;
  jest
    .mocked(Engine.context.ProfileController.updateProfile)
    .mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = () => {
            resolve(undefined);
          };
        }),
    );
  return () => {
    resolveUpdate();
  };
};

const reachReadyStep = async () => {
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
    await screen.findByTestId(SocialProfileOnboardingSelectorsIDs.READY_STEP),
  ).toBeOnTheScreen();
};

interface PendingUsernameCheck {
  username: string;
  resolve: (available: boolean) => void;
}

const deferUsernameChecks = (): PendingUsernameCheck[] => {
  const pending: PendingUsernameCheck[] = [];
  jest
    .mocked(Engine.context.ProfileController.checkUsernameAvailability)
    .mockImplementation(
      (username: string) =>
        new Promise((resolve) => {
          pending.push({
            username,
            resolve: (available: boolean) => {
              resolve({
                username,
                available,
                valid: true,
                normalized: username,
                errors: [],
              });
            },
          });
        }),
    );
  return pending;
};

const CREATED_PROFILE: Profile = {
  profileId: 'mock-profile-id',
  username: '',
  displayName: '',
  bio: '',
  linkedAddresses: [],
  avatarUrl: '',
  tradingPrivacy: 'public',
  connectedToX: false,
  createdAt: '',
  updatedAt: '',
};

const deferCreateProfile = () => {
  let resolveCreate: (profile: Profile) => void = () => undefined;
  jest
    .mocked(Engine.context.ProfileController.createProfile)
    .mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );
  return () => {
    resolveCreate(CREATED_PROFILE);
  };
};

/** Empty profile id so onboarding falls back when nobody is signed in. */
const SIGNED_OUT_SESSION: Awaited<
  ReturnType<typeof Engine.context.AuthenticationController.getSessionProfile>
> = {
  identifierId: 'signed-out',
  profileId: '',
  canonicalProfileId: '',
  metaMetricsId: 'metrics',
};

const signIn = () => {
  jest
    .mocked(Engine.context.AuthenticationController.getSessionProfile)
    .mockResolvedValue({
      ...SIGNED_OUT_SESSION,
      profileId: 'signed-in-profile',
      canonicalProfileId: 'signed-in-profile',
    });
};

const restoreProfileControllerMocks = () => {
  jest.mocked(Engine.context.ProfileController.createProfile).mockReset();
  jest
    .mocked(Engine.context.ProfileController.createProfile)
    .mockResolvedValue(CREATED_PROFILE);
  jest
    .mocked(Engine.context.ProfileController.checkUsernameAvailability)
    .mockReset();
  jest
    .mocked(Engine.context.ProfileController.checkUsernameAvailability)
    .mockResolvedValue({
      username: 'wen_cat',
      available: true,
      valid: true,
      normalized: 'wen_cat',
      errors: [],
    });
  jest
    .mocked(Engine.context.AuthenticationController.getSessionProfile)
    .mockReset();
  jest
    .mocked(Engine.context.AuthenticationController.getSessionProfile)
    .mockResolvedValue(SIGNED_OUT_SESSION);
  jest.mocked(Engine.context.ProfileController.updateProfile).mockReset();
  jest
    .mocked(Engine.context.ProfileController.updateProfile)
    .mockResolvedValue(undefined);
  jest
    .mocked(Engine.context.ProfileController.getXAuthorizationUrl)
    .mockReset();
  jest
    .mocked(Engine.context.ProfileController.getXAuthorizationUrl)
    .mockResolvedValue({
      authorizationUrl: 'https://x.com/i/oauth2/authorize?mock=true',
      state: 'mock-oauth-state',
    });
  jest.mocked(Engine.context.ProfileController.connectX).mockReset();
  jest.mocked(Engine.context.ProfileController.connectX).mockResolvedValue({
    xUserId: 'x-user-1',
    xProfileUrl: 'https://x.com/degangirl',
    username: 'degangirl',
    displayName: 'Degan Giri',
    avatarUrl:
      'https://pbs.twimg.com/profile_images/2079082606717779969/DcvmQxfE_400x400.jpg',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  });
};

describe('SocialProfileOnboardingView', () => {
  afterEach(() => {
    clearLocalSocialProfile();
    netInfoMock.__resetMockNetInfo();
    jest.mocked(Engine.context.ProfileController.createProfile).mockClear();
    jest
      .mocked(Engine.context.ProfileController.checkUsernameAvailability)
      .mockClear();
    jest
      .mocked(Engine.context.ProfileController.getXAuthorizationUrl)
      .mockClear();
    jest.mocked(Engine.context.ProfileController.connectX).mockClear();
    restoreProfileControllerMocks();
  });

  it('writes a manual profile and opens the feed', async () => {
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    const handle = usernameValue();
    const displayName = displayNameFromUsername(handle);
    expect(
      screen.getByText('Username available', { exact: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByText(/metamask\.io\//)).not.toBeOnTheScreen();
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

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.ACCOUNT_SELECTOR),
    );
    expect(await screen.findByText('Select an account')).toBeOnTheScreen();
    expect(
      screen.getAllByTestId(
        new RegExp(`^${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-`),
      ),
    ).toHaveLength(1);
    expect(screen.queryByText('Solana Account')).not.toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-acc-1`,
      ),
    );
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_HANDLE),
    ).toHaveTextContent(`@${handle}`);

    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({
        handle,
        displayName,
        avatarPresetId: 'zombie',
        avatarBackgroundId: 'background4',
        shareTradingActivity: true,
        linkedAccountId: 'acc-1',
      }),
    );
    expect(
      Engine.context.ProfileController.checkUsernameAvailability,
    ).toHaveBeenCalledWith(handle);
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      {
        profile_id: 'social-v1-profile',
        username: handle,
        display_name: displayName,
        bio: null,
        linked_addresses: [
          'eip155:1:0x0000000000000000000000000000000000000001',
        ],
        avatar_url: 'foxicon://zombie/background4',
        trading_privacy: 'public',
      },
    );
  });

  it('hides the back arrow on the intro and shows it on later steps', () => {
    renderSocialProfileOnboarding();

    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.BACK_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
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
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_TITLE),
    ).toHaveTextContent(
      strings('social_leaderboard.profile_onboarding.intro_title'),
    );
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    ).toHaveTextContent(
      strings('social_leaderboard.profile_onboarding.connect_x'),
    );
    expect(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    ).toHaveTextContent(
      strings('social_leaderboard.profile_onboarding.create_manually'),
    );
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
        username: 'wen_cat',
        available: false,
        valid: true,
        normalized: 'wen_cat',
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

  it('checks availability for a handle with a trailing underscore', async () => {
    renderSocialProfileOnboarding();
    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    const usernameInput = screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT,
    );
    fireEvent.changeText(usernameInput, 'hello_');

    expect(
      screen.queryByText('Use letters, numbers, and underscores.'),
    ).not.toBeOnTheScreen();
    await waitFor(() => {
      expect(
        Engine.context.ProfileController.checkUsernameAvailability,
      ).toHaveBeenCalledWith('hello_');
    });
    expect(
      await screen.findByText('Username available', { exact: true }),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON)
        .props.accessibilityState?.disabled,
    ).not.toBe(true);
  });

  it('shows the minimum length message instead of the unavailable message', async () => {
    jest
      .mocked(Engine.context.ProfileController.checkUsernameAvailability)
      .mockResolvedValue({
        username: 'hello_',
        available: false,
        valid: true,
        normalized: 'hello_',
        errors: [],
      });
    renderSocialProfileOnboarding();
    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    const usernameInput = screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT,
    );

    fireEvent.changeText(usernameInput, 'hello_');
    expect(
      await screen.findByText(
        'This handle is unavailable. Choose another one.',
      ),
    ).toBeOnTheScreen();

    fireEvent.changeText(usernameInput, 'h');
    expect(screen.getByText('Use at least 3 characters.')).toBeOnTheScreen();
    expect(
      screen.queryByText('This handle is unavailable. Choose another one.'),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('Username available')).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON)
        .props.accessibilityState?.disabled,
    ).toBe(true);

    fireEvent.changeText(usernameInput, 'ab');
    expect(screen.getByText('Use at least 3 characters.')).toBeOnTheScreen();

    fireEvent.changeText(usernameInput, 'hello_');
    expect(
      await screen.findByText(
        'This handle is unavailable. Choose another one.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText('Use at least 3 characters.'),
    ).not.toBeOnTheScreen();
  });

  it('stays on the username step when the availability check fails', async () => {
    jest
      .mocked(Engine.context.ProfileController.checkUsernameAvailability)
      .mockRejectedValueOnce(new Error('network'));
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
        "Couldn't check that username. Check your connection and try again.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.AVATAR_STEP),
    ).not.toBeOnTheScreen();
  });

  it('stays on the ready step when creating the profile fails', async () => {
    const profileBefore = getLocalSocialProfileSnapshot().profile;
    jest
      .mocked(Engine.context.ProfileController.createProfile)
      .mockRejectedValueOnce(new Error('network'));
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);

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
      await screen.findByText(
        "Couldn't create your profile. Check your connection and try again.",
      ),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON),
    );
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).not.toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);
    expect(getLocalSocialProfileSnapshot().profile).toEqual(profileBefore);

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.RETRY_CREATE_BUTTON,
      ),
    );
    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(2);
  });

  it('connects X when the session has no profile id yet', async () => {
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );

    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.getXAuthorizationUrl,
    ).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_ERROR),
    ).not.toBeOnTheScreen();
  });

  it('shows a connection error when the profile API rejects X connect', async () => {
    jest
      .mocked(Engine.context.ProfileController.getXAuthorizationUrl)
      .mockRejectedValueOnce(new Error('network'));
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );

    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.CONNECT_X_ERROR,
      ),
    ).toHaveTextContent(
      "Couldn't connect X. Check your connection and try again.",
    );
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP),
    ).not.toBeOnTheScreen();
  });

  it('connects X through the profile API and creates a profile from that account', async () => {
    signIn();
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.MY_PROFILE }]);

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );

    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.getXAuthorizationUrl,
    ).toHaveBeenCalledTimes(1);
    expect(Engine.context.ProfileController.connectX).toHaveBeenCalledWith({
      code: 'mock-code',
      state: 'mock-oauth-state',
    });
    expect(screen.getByText('Degan Giri')).toBeOnTheScreen();
    expect(screen.getByText('@degangirl')).toBeOnTheScreen();
    expect(screen.getByText('Use @degangirl as username')).toBeOnTheScreen();
    expect(screen.getByText('Use X profile picture')).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.PROGRESS}-segment-0`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        `${SocialProfileOnboardingSelectorsIDs.PROGRESS}-segment-3`,
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        SocialProfileOnboardingSelectorsIDs.EDIT_AVATAR_BUTTON,
      ),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(await screen.findByText('Account 1')).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.PROGRESS}-segment-1`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        `${SocialProfileOnboardingSelectorsIDs.PROGRESS}-segment-2`,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_HANDLE),
    ).toHaveTextContent('@degangirl');
    expect(screen.getByText('View profile')).toBeOnTheScreen();

    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.MY_PROFILE)),
    ).toBeOnTheScreen();
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({
        handle: 'degangirl',
        displayName: 'Degan Giri',
        imageUrl:
          'https://pbs.twimg.com/profile_images/2079082606717779969/DcvmQxfE_400x400.jpg',
        xHandle: 'degangirl',
        connectedToX: true,
      }),
    );
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'degangirl',
        display_name: 'Degan Giri',
        avatar_url:
          'https://pbs.twimg.com/profile_images/2079082606717779969/DcvmQxfE_400x400.jpg',
      }),
    );
  });

  it('does not announce a kept X handle as available before the server answers', async () => {
    signIn();
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.MY_PROFILE }]);

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();

    expect(screen.getByText('@degangirl')).toBeOnTheScreen();
    expect(screen.queryByText('Username available')).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS),
    ).not.toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.checkUsernameAvailability,
    ).not.toHaveBeenCalled();
  });

  it('starts a fresh manual flow after leaving the X path', async () => {
    signIn();
    renderSocialProfileOnboarding([
      { name: Routes.SOCIAL.V1 },
      { name: Routes.SOCIAL.MY_PROFILE },
    ]);

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.BACK_BUTTON),
    );
    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );

    const handle = usernameValue();
    expect(handle).not.toBe('degangirl');
    expect(handle).toMatch(/^[a-z0-9]+(?:_[a-z0-9]+)+$/);
    expect(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.PROGRESS}-segment-3`,
      ),
    ).toBeOnTheScreen();

    await continueFromUsername();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(await screen.findByText('Account 1')).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({
        handle,
        connectedToX: false,
        xHandle: null,
        imageUrl: null,
      }),
    );
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        username: handle,
        avatar_url: 'foxicon://vr/background3',
      }),
    );
  });

  it('uses the manual username and avatar pickers when X reuse is off', async () => {
    signIn();
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.MY_PROFILE }]);

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();

    fireEvent(
      within(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.USE_X_USERNAME_SWITCH,
        ),
      ).getByRole('switch'),
      'valueChange',
      false,
    );
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT),
    ).toBeOnTheScreen();
    expect(screen.queryByText('Degan Giri')).not.toBeOnTheScreen();

    fireEvent.changeText(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT),
      'moon_fox',
    );

    fireEvent(
      within(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.USE_X_AVATAR_SWITCH,
        ),
      ).getByRole('switch'),
      'valueChange',
      false,
    );
    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.EDIT_AVATAR_BUTTON,
      ),
    );
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.AVATAR_STEP,
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.AVATAR_OPTION}-zombie`,
      ),
    );
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.EDIT_AVATAR_BUTTON,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(await screen.findByText('Account 1')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_HANDLE),
    ).toHaveTextContent('@moon_fox');

    await leaveReadyStep();
    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.MY_PROFILE)),
    ).toBeOnTheScreen();
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'moon_fox',
        display_name: 'Degan Giri',
        avatar_url: 'foxicon://zombie/background3',
      }),
    );
  });

  it('stays on the ready step when profile creation fails offline', async () => {
    jest
      .mocked(Engine.context.ProfileController.createProfile)
      .mockRejectedValueOnce(new Error('offline'));
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);
    const profileBeforeFinish = getLocalSocialProfileSnapshot().profile;

    await reachReadyStep();

    expect(
      await screen.findByText(
        "Couldn't create your profile. Check your connection and try again.",
      ),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON),
    );
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_STEP),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).not.toBeOnTheScreen();
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      profileBeforeFinish,
    );
  });

  it('creates the profile with the signed-in session id', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getSessionProfile)
      .mockResolvedValue({
        ...SIGNED_OUT_SESSION,
        profileId: 'signed-in-profile',
        canonicalProfileId: 'signed-in-profile',
      });
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);

    await reachReadyStep();
    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ profile_id: 'signed-in-profile' }),
    );
  });

  it('creates a private profile when trading activity is turned off', async () => {
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);

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
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.ACCOUNT_STEP),
    ).toHaveTextContent(
      /shows this account's trades[\s\S]*Earn 15% on fees[\s\S]*address stays private[\s\S]*can follow your profile/,
    );

    const activitySwitch = within(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.SHARE_ACTIVITY_SWITCH,
      ),
    ).getByRole('switch');
    expect(activitySwitch).toHaveProp('value', true);

    fireEvent(activitySwitch, 'valueChange', false);
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ trading_privacy: 'private' }),
    );
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({ shareTradingActivity: false }),
    );
  });

  it('links the second EVM account when the user picks it', async () => {
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }], {
      includeSecondEvmAccount: true,
    });

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
    expect(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.ACCOUNT_CHANGE_FOOTNOTE,
      ),
    ).toHaveTextContent('You can change your linked account every 30 days.');
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.ACCOUNT_SELECTOR),
    );
    expect(await screen.findByText('Select an account')).toBeOnTheScreen();
    expect(
      screen.getAllByTestId(
        new RegExp(`^${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-`),
      ),
    ).toHaveLength(2);
    expect(screen.queryByText('Solana Account')).not.toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-${SECOND_ONBOARDING_EVM_ACCOUNT.id}`,
      ),
    );
    expect(await screen.findByText('Account 2')).toBeOnTheScreen();
    expect(screen.queryByText('Select an account')).not.toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        linked_addresses: [`eip155:1:${SECOND_ONBOARDING_EVM_ACCOUNT.address}`],
      }),
    );
  });

  it('suggests a numbered username when the shuffled handle is taken', async () => {
    jest
      .mocked(Engine.context.ProfileController.checkUsernameAvailability)
      .mockResolvedValueOnce({
        username: 'taken-handle',
        available: false,
        valid: true,
        normalized: 'taken-handle',
        errors: [],
      });
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.SHUFFLE_USERNAME_BUTTON,
      ),
    );

    await screen.findByDisplayValue(/_\d{3}$/);
    const numberedHandle = screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT,
    ).props.value as string;
    expect(
      Engine.context.ProfileController.checkUsernameAvailability,
    ).toHaveBeenCalledTimes(2);
    expect(
      Engine.context.ProfileController.checkUsernameAvailability,
    ).toHaveBeenNthCalledWith(2, numberedHandle);
    expect(numberedHandle).toMatch(/_\d{3}$/);
  });

  it('keeps the shuffled handle when that availability check is superseded', async () => {
    const pendingChecks = deferUsernameChecks();
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    const initialHandle = usernameValue();
    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.SHUFFLE_USERNAME_BUTTON,
      ),
    );
    await waitFor(() => {
      expect(usernameValue()).not.toBe(initialHandle);
    });
    const shuffledHandle = screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT,
    ).props.value as string;

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(pendingChecks).toHaveLength(2);
    await act(async () => {
      pendingChecks[0].resolve(false);
    });
    await act(async () => {
      pendingChecks[1].resolve(true);
    });

    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.AVATAR_STEP,
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(await screen.findByText('Account 1')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_HANDLE),
    ).toHaveTextContent(`@${shuffledHandle}`);

    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ username: shuffledHandle }),
    );
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({ handle: shuffledHandle }),
    );
  });

  it('stays on the username step when the availability check rejects offline', async () => {
    jest
      .mocked(Engine.context.ProfileController.checkUsernameAvailability)
      .mockRejectedValueOnce(new Error('offline'));
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
        "Couldn't check that username. Check your connection and try again.",
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.AVATAR_STEP),
    ).not.toBeOnTheScreen();
  });

  it('keeps a single in-flight create when ready is left and reopened', async () => {
    const resolveCreate = deferCreateProfile();
    renderSocialProfileOnboarding();

    await reachReadyStep();
    await waitFor(() => {
      expect(
        Engine.context.ProfileController.createProfile,
      ).toHaveBeenCalledTimes(1);
    });
    expect(letsGoDisabled()).toBe(true);

    pressBack();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.ACCOUNT_STEP),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(
      await screen.findByTestId(SocialProfileOnboardingSelectorsIDs.READY_STEP),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);
    expect(
      Engine.context.ProfileController.updateProfile,
    ).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreate();
    });

    await waitFor(() => {
      expect(letsGoDisabled()).toBe(false);
    });
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);
  });

  it('updates the created profile when the linked account changes', async () => {
    const resolveUpdate = deferUpdateProfile();
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }], {
      includeSecondEvmAccount: true,
    });

    await reachReadyStep();
    await waitFor(() => {
      expect(letsGoDisabled()).toBe(false);
    });
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);

    pressBack();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.ACCOUNT_SELECTOR),
    );
    fireEvent.press(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-${SECOND_ONBOARDING_EVM_ACCOUNT.id}`,
      ),
    );
    expect(await screen.findByText('Account 2')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(
      await screen.findByTestId(SocialProfileOnboardingSelectorsIDs.READY_STEP),
    ).toBeOnTheScreen();
    expect(letsGoDisabled()).toBe(true);
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON),
    );
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).not.toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(
        Engine.context.ProfileController.updateProfile,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          linked_addresses: [
            `eip155:1:${SECOND_ONBOARDING_EVM_ACCOUNT.address}`,
          ],
        }),
      );
    });

    await act(async () => {
      resolveUpdate();
    });
    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1)),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);
  });

  it('updates the created profile when the username changes', async () => {
    const resolveUpdate = deferUpdateProfile();
    renderSocialProfileOnboarding([{ name: Routes.SOCIAL.V1 }]);

    await reachReadyStep();
    await waitFor(() => {
      expect(letsGoDisabled()).toBe(false);
    });

    pressBack();
    pressBack();
    pressBack();
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.USERNAME_STEP,
      ),
    ).toBeOnTheScreen();
    fireEvent.changeText(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT),
      'moon_fox',
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
      await screen.findByTestId(SocialProfileOnboardingSelectorsIDs.READY_STEP),
    ).toBeOnTheScreen();
    expect(letsGoDisabled()).toBe(true);
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(
        Engine.context.ProfileController.updateProfile,
      ).toHaveBeenCalledWith(expect.objectContaining({ username: 'moon_fox' }));
    });

    await act(async () => {
      resolveUpdate();
    });
    await waitFor(() => {
      expect(letsGoDisabled()).toBe(false);
    });
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.READY_HANDLE),
    ).toHaveTextContent('@moon_fox');

    await leaveReadyStep();
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({ handle: 'moon_fox' }),
    );
  });

  it('continues with an X handle that fails the username pattern until it is edited', async () => {
    jest.mocked(Engine.context.ProfileController.connectX).mockResolvedValue({
      xUserId: 'x-user-1',
      xProfileUrl: 'https://x.com/bad-name',
      username: 'bad-name',
      displayName: 'Bad Name',
      avatarUrl: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('@bad-name')).toBeOnTheScreen();
    expect(
      screen.queryByText('Use letters, numbers, and underscores.'),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON)
        .props.accessibilityState?.disabled,
    ).not.toBe(true);

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.ACCOUNT_STEP,
      ),
    ).toBeOnTheScreen();

    pressBack();
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();
    fireEvent(
      within(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.USE_X_USERNAME_SWITCH,
        ),
      ).getByRole('switch'),
      'valueChange',
      false,
    );
    const usernameInput = await screen.findByTestId(
      SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT,
    );
    fireEvent.changeText(usernameInput, 'bad-name');

    expect(
      await screen.findByText('Use letters, numbers, and underscores.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON)
        .props.accessibilityState?.disabled,
    ).toBe(true);
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.ACCOUNT_STEP),
    ).not.toBeOnTheScreen();
  });

  it('keeps create manually disabled while X is connecting', async () => {
    let resolveUrl: (session: {
      authorizationUrl: string;
      state: string;
    }) => void = () => undefined;
    jest
      .mocked(Engine.context.ProfileController.getXAuthorizationUrl)
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUrl = resolve;
          }),
      );
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );
    await waitFor(() => {
      expect(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
        ).props.accessibilityState?.disabled,
      ).toBe(true);
    });

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).not.toBeOnTheScreen();

    await act(async () => {
      resolveUrl({
        authorizationUrl: 'https://x.com/i/oauth2/authorize?mock=true',
        state: 'mock-oauth-state',
      });
    });

    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();
  });

  it('drops an in-flight X connect when onboarding is closed', async () => {
    let resolveUrl: (session: {
      authorizationUrl: string;
      state: string;
    }) => void = () => undefined;
    jest
      .mocked(Engine.context.ProfileController.getXAuthorizationUrl)
      .mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveUrl = resolve;
          }),
      );
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );
    await waitFor(() => {
      expect(
        Engine.context.ProfileController.getXAuthorizationUrl,
      ).toHaveBeenCalledTimes(1);
    });
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CLOSE_BUTTON),
    );

    await act(async () => {
      resolveUrl({
        authorizationUrl: 'https://x.com/i/oauth2/authorize?mock=true',
        state: 'mock-oauth-state',
      });
    });

    expect(Engine.context.ProfileController.connectX).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP),
    ).not.toBeOnTheScreen();
  });
});
