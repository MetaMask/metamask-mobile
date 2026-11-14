/**
 * Component-view coverage for the manual profile onboarding flow.
 *
 * Account rows and server-owned profiles come from Redux. Tests restore the
 * Engine state and local avatar overlay after each run.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/Views/SocialLeaderboard/ProfileOnboarding/SocialProfileOnboardingView.view.test.tsx --runInBand --silent --coverage=false
 */

import '../../../../../tests/component-view/mocks';
import type { Profile } from '@metamask/profile-controller';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, StyleSheet, Text } from 'react-native';
import type NetInfoMock from '../../../../__mocks__/@react-native-community/netinfo';
import Routes from '../../../../constants/navigation/Routes';
import { SOCIAL_TERMS_ACCEPTED } from '../../../../constants/storage';
import Engine from '../../../../core/Engine';
import StorageWrapper from '../../../../store/storage-wrapper';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import {
  renderSocialProfileOnboarding,
  SECOND_ONBOARDING_EVM_ACCOUNT,
} from '../../../../../tests/component-view/renderers/socialLeaderboard';
import {
  getLocalSocialProfileSnapshot,
  clearLocalSocialProfile,
} from '../MyProfileView/hooks/localSocialProfileStore';
import {
  displayNameFromUsername,
  MAX_DISPLAY_NAME_LENGTH,
} from './profileOnboardingDraft';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { strings } from '../../../../../locales/i18n';
import { __setRivePropertyValue } from '../../../../__mocks__/rive-app-react-native';
import {
  acceptSocialTerms,
  ensureSocialTermsAccepted,
  hasAcceptedSocialTerms,
  resetSocialTermsAcceptance,
  takePendingSocialEntry,
} from '../terms/socialTermsAcceptance';
import { SocialTermsSheetSelectorsIDs } from '../terms/SocialTermsSheet';
import {
  getPendingSocialPreviewTarget,
  setPendingSocialPreviewTarget,
} from '../TraderPreviewSheet/pendingSocialPreviewTarget';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;
const engineWithState = Engine as unknown as { state: typeof Engine.state };
const originalEngineState = Engine.state;

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

const agreeToTerms = () => {
  fireEvent(
    screen.getByTestId(SocialTermsSheetSelectorsIDs.WEBVIEW),
    'message',
    { nativeEvent: { data: 'social-terms-scroll-end' } },
  );
  fireEvent.press(
    screen.getByTestId(SocialTermsSheetSelectorsIDs.AGREE_BUTTON),
  );
};

const FeedExitStackProbe = () => {
  const route = useRoute();
  const tabName =
    route.params &&
    typeof route.params === 'object' &&
    'screen' in route.params &&
    typeof route.params.screen === 'string'
      ? route.params.screen
      : '';

  return <Text testID={getRouteProbeTestId(Routes.HOME_TABS)}>{tabName}</Text>;
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
  verified: false,
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

/** Empty profile id: nobody is signed in yet. */
const SIGNED_OUT_SESSION: Awaited<
  ReturnType<typeof Engine.context.AuthenticationController.getSessionProfile>
> = {
  identifierId: 'signed-out',
  profileId: '',
  canonicalProfileId: '',
  metaMetricsId: 'metrics',
};

const SIGNED_IN_SESSION: typeof SIGNED_OUT_SESSION = {
  ...SIGNED_OUT_SESSION,
  profileId: 'signed-in-profile',
  canonicalProfileId: 'signed-in-profile',
};

const signIn = () => {
  jest
    .mocked(Engine.context.AuthenticationController.getSessionProfile)
    .mockResolvedValue(SIGNED_IN_SESSION);
};

const signOut = () => {
  jest
    .mocked(Engine.context.AuthenticationController.getSessionProfile)
    .mockResolvedValue(SIGNED_OUT_SESSION);
};

/** Profile the server already holds for the signed-in session. */
const EXISTING_PROFILE: Profile = {
  profileId: 'signed-in-profile',
  username: 'RealHandle',
  displayName: 'Real Handle',
  bio: '',
  linkedAddresses: ['eip155:1:0x0000000000000000000000000000000000000001'],
  avatarUrl: '',
  tradingPrivacy: 'public',
  connectedToX: true,
  verified: false,
  createdAt: '',
  updatedAt: '',
};

/** A ProfileController read that finds no profile, like a 404. */
const NO_PROFILE: Profile = { ...EXISTING_PROFILE, profileId: '' };

let storageReadSpy: jest.SpyInstance | undefined;

/**
 * View tests run with test overrides, where `getItemSync` always returns null,
 * so the stored older version is supplied at the storage read.
 */
const storeOlderTermsVersion = async () => {
  await resetSocialTermsAcceptance();
  const readItem = StorageWrapper.getItemSync.bind(StorageWrapper);
  storageReadSpy = jest
    .spyOn(StorageWrapper, 'getItemSync')
    .mockImplementation((key: string) =>
      key === SOCIAL_TERMS_ACCEPTED ? 'v0' : readItem(key),
    );
};

const introActionDisabled = (testID: string): boolean =>
  screen.getByTestId(testID).props.accessibilityState?.disabled === true;

/**
 * Renders onboarding and waits until the existing-profile check settles and
 * the intro actions are enabled.
 */
const renderOnboarding = async (
  ...args: Parameters<typeof renderSocialProfileOnboarding>
) => {
  const result = renderSocialProfileOnboarding(...args);
  await waitFor(() => {
    expect(
      introActionDisabled(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    ).toBe(false);
  });
  return result;
};

const openManualUsernameStep = async () => {
  await renderOnboarding();
  fireEvent.press(
    screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
    ),
  );
  expect(
    await screen.findByTestId(
      SocialProfileOnboardingSelectorsIDs.USERNAME_STEP,
    ),
  ).toBeOnTheScreen();
};

const submitDisplayName = (name: string) => {
  fireEvent.changeText(
    screen.getByTestId(SocialProfileOnboardingSelectorsIDs.DISPLAY_NAME_INPUT),
    name,
  );
  fireEvent.press(
    screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
  );
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
    .mocked(Engine.context.ProfileService.checkDisplayNameValidity)
    .mockReset();
  jest
    .mocked(Engine.context.ProfileService.checkDisplayNameValidity)
    .mockResolvedValue({ valid: true });
  jest
    .mocked(Engine.context.AuthenticationController.getSessionProfile)
    .mockReset();
  signIn();
  jest
    .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
    .mockReset();
  jest
    .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
    .mockResolvedValue(NO_PROFILE);
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
  beforeEach(async () => {
    restoreProfileControllerMocks();
    await acceptSocialTerms();
  });

  afterEach(async () => {
    takePendingSocialEntry();
    engineWithState.state = originalEngineState;
    await resetSocialTermsAcceptance();
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

  it('opens the trader from a preview link instead of the Social tab on Lets go', async () => {
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'onboarding',
    });
    await renderOnboarding([
      { name: Routes.HOME_TABS },
      { name: Routes.SOCIAL.V1_PROFILE },
    ]);

    await reachReadyStep();
    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.SOCIAL.V1_PROFILE)),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).not.toBeOnTheScreen();
    expect(getPendingSocialPreviewTarget()).toBeNull();
  });

  it('drops a preview link when onboarding closes without finishing', async () => {
    setPendingSocialPreviewTarget({
      kind: 'trader',
      traderId: 'trader-1',
      stage: 'onboarding',
    });
    const { unmount } = await renderOnboarding();

    unmount();

    expect(getPendingSocialPreviewTarget()).toBeNull();
  });

  it.each([true, false])(
    'uses server verified=%s after creation without an extra profile fetch',
    async (verified) => {
      let resolveCreate: (profile: Profile) => void = () => undefined;
      jest
        .mocked(Engine.context.ProfileController.createProfile)
        .mockImplementationOnce(
          () =>
            new Promise<Profile>((resolve) => {
              resolveCreate = resolve;
            }),
        );
      const fetchProfile = jest.mocked(
        Engine.context.ProfileController.fetchAndUpdateProfile,
      );
      // The existing-profile lookup fetches once on open. Clear it after that so
      // the assertion only covers fetches made after creation.
      const { store } = await renderOnboarding();
      fetchProfile.mockClear();

      await reachReadyStep();

      expect(letsGoDisabled()).toBe(true);
      expect(
        screen.queryByTestId(
          SocialProfileOnboardingSelectorsIDs.READY_VERIFIED_BADGE,
        ),
      ).not.toBeOnTheScreen();

      await act(async () => {
        const created = { ...CREATED_PROFILE, verified };
        engineWithState.state = {
          ...Engine.state,
          ProfileController: { profile: created },
        };
        store.dispatch(updateBgState({ key: 'ProfileController' }));
      });
      // Controller state alone must not verify the ready card before the
      // creation request succeeds.
      expect(letsGoDisabled()).toBe(true);
      expect(
        screen.queryByTestId(
          SocialProfileOnboardingSelectorsIDs.READY_VERIFIED_BADGE,
        ),
      ).not.toBeOnTheScreen();

      await act(async () => {
        resolveCreate({ ...CREATED_PROFILE, verified });
      });
      await waitFor(() => expect(letsGoDisabled()).toBe(false));

      if (verified) {
        expect(
          screen.getByTestId(
            SocialProfileOnboardingSelectorsIDs.READY_VERIFIED_BADGE,
          ),
        ).toBeOnTheScreen();
      } else {
        expect(
          screen.queryByTestId(
            SocialProfileOnboardingSelectorsIDs.READY_VERIFIED_BADGE,
          ),
        ).not.toBeOnTheScreen();
      }
      expect(fetchProfile).not.toHaveBeenCalled();
    },
  );

  it('writes a manual profile with the typed username casing and opens the feed', async () => {
    await renderOnboarding([
      { name: Routes.HOME_TABS, Component: FeedExitStackProbe },
    ]);

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    const handle = 'Wen_Cat';
    fireEvent.changeText(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT),
      handle,
    );
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
      await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toHaveTextContent(Routes.SOCIAL.TAB);
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
        profile_id: 'signed-in-profile',
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

  describe('Social Terms of Use', () => {
    beforeEach(async () => {
      await resetSocialTermsAcceptance();
    });

    it('asks for the terms before the manual path and continues once agreed', async () => {
      await renderOnboarding();

      fireEvent.press(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
        ),
      );

      expect(
        screen.getByTestId(SocialTermsSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
      ).not.toBeOnTheScreen();

      agreeToTerms();

      expect(
        await screen.findByTestId(
          SocialProfileOnboardingSelectorsIDs.USERNAME_STEP,
        ),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(SocialTermsSheetSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen();
      expect(hasAcceptedSocialTerms()).toBe(true);
    });

    it('asks for the terms before the X path and continues once agreed', async () => {
      await renderOnboarding();

      fireEvent.press(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON,
        ),
      );
      agreeToTerms();

      expect(
        await screen.findByTestId(
          SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
        ),
      ).toBeOnTheScreen();
    });

    it('stays on the intro without accepting when the sheet is closed', async () => {
      await renderOnboarding();

      fireEvent.press(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON,
        ),
      );
      fireEvent.press(
        screen.getByTestId(SocialTermsSheetSelectorsIDs.CLOSE_BUTTON),
      );

      expect(
        screen.queryByTestId(SocialTermsSheetSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO),
      ).toBeOnTheScreen();
      expect(hasAcceptedSocialTerms()).toBe(false);
    });

    it('continues to the blocked Social entry once the terms-only sheet is accepted', () => {
      const openBlockedEntry = jest.fn();
      ensureSocialTermsAccepted(jest.fn(), openBlockedEntry);
      renderSocialProfileOnboarding([], { initialParams: { termsOnly: true } });

      agreeToTerms();

      expect(hasAcceptedSocialTerms()).toBe(true);
      expect(openBlockedEntry).toHaveBeenCalledTimes(1);
    });

    it('drops the blocked Social entry when the terms-only sheet is closed', () => {
      const openBlockedEntry = jest.fn();
      ensureSocialTermsAccepted(jest.fn(), openBlockedEntry);
      renderSocialProfileOnboarding([], { initialParams: { termsOnly: true } });

      fireEvent.press(
        screen.getByTestId(SocialTermsSheetSelectorsIDs.CLOSE_BUTTON),
      );

      expect(hasAcceptedSocialTerms()).toBe(false);
      expect(openBlockedEntry).not.toHaveBeenCalled();
    });

    it('forgets the blocked Social entry when onboarding closes', () => {
      ensureSocialTermsAccepted(jest.fn(), jest.fn());
      const { unmount } = renderSocialProfileOnboarding([], {
        initialParams: { termsOnly: true },
      });

      unmount();

      expect(takePendingSocialEntry()).toBeUndefined();
    });

    it('opens the blocked Social entry instead of the feed after a new profile', async () => {
      const openBlockedEntry = jest.fn();
      ensureSocialTermsAccepted(jest.fn(), openBlockedEntry);
      await acceptSocialTerms();
      await renderOnboarding([
        { name: Routes.HOME_TABS, Component: FeedExitStackProbe },
      ]);

      await reachReadyStep();
      await leaveReadyStep();

      expect(openBlockedEntry).toHaveBeenCalledTimes(1);
      expect(
        screen.queryByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
      ).not.toBeOnTheScreen();
    });

    it('opens My Profile after the X path even with a blocked Social entry', async () => {
      const openBlockedEntry = jest.fn();
      ensureSocialTermsAccepted(jest.fn(), openBlockedEntry);
      await acceptSocialTerms();
      signIn();
      await renderOnboarding([{ name: Routes.SOCIAL.MY_PROFILE }]);

      fireEvent.press(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON,
        ),
      );
      expect(
        await screen.findByTestId(
          SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
        ),
      ).toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
      );
      expect(await screen.findByText('Account 1')).toBeOnTheScreen();
      fireEvent.press(
        screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
      );
      await leaveReadyStep();

      expect(
        await screen.findByTestId(
          getRouteProbeTestId(Routes.SOCIAL.MY_PROFILE),
        ),
      ).toBeOnTheScreen();
      expect(openBlockedEntry).not.toHaveBeenCalled();
    });

    it('skips the sheet when the current terms were already accepted', async () => {
      await acceptSocialTerms();
      await renderOnboarding();

      fireEvent.press(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
        ),
      );

      expect(
        screen.queryByTestId(SocialTermsSheetSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen();
      expect(
        screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
      ).toBeOnTheScreen();
    });

    it('returns to the caller instead of opening Social after agreeing on the termsOnly route', async () => {
      renderSocialProfileOnboarding(
        [{ name: Routes.HOME_TABS, Component: FeedExitStackProbe }],
        { initialParams: { termsOnly: true } },
      );

      expect(
        await screen.findByTestId(SocialTermsSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();

      agreeToTerms();

      await waitFor(() => {
        expect(
          screen.queryByTestId(SocialTermsSheetSelectorsIDs.SHEET),
        ).not.toBeOnTheScreen();
      });
      expect(
        screen.queryByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
      ).not.toBeOnTheScreen();
      expect(hasAcceptedSocialTerms()).toBe(true);
    });
  });

  it('pads the header 16px on the left and right', async () => {
    await renderOnboarding();

    const style = StyleSheet.flatten(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.HEADER).props
        .style,
    );

    expect(style).toEqual(
      expect.objectContaining({
        paddingLeft: 16,
        paddingRight: 16,
      }),
    );
  });

  it('hides the back arrow on the intro and the first username step', async () => {
    await renderOnboarding();

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
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.BACK_BUTTON),
    ).not.toBeOnTheScreen();

    await continueFromUsername();

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
  });

  it('defaults the avatar backdrop to the centered color', async () => {
    await renderOnboarding();

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

  it('uses the hero line height for the account step title', async () => {
    await renderOnboarding();
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

    const title = screen.getByText(
      strings('social_leaderboard.profile_onboarding.link_account'),
    );

    expect(title).toHaveStyle({
      lineHeight: 32,
      letterSpacing: -0.8,
      paddingTop: 8,
      paddingBottom: 8,
      marginBottom: -8,
    });
  });

  it('shows the static live activity on the intro while offline', async () => {
    await renderOnboarding();

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_TITLE),
    ).toHaveTextContent(
      strings('social_leaderboard.profile_onboarding.intro_title_activity'),
    );
    const connectXButton = screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON,
    );
    expect(connectXButton).toHaveTextContent(
      `${strings('social_leaderboard.profile_onboarding.connect_x_before_logo')}${strings('social_leaderboard.profile_onboarding.connect_x_after_logo')}`,
    );
    expect(connectXButton).toHaveProp(
      'accessibilityLabel',
      strings('social_leaderboard.profile_onboarding.connect_x'),
    );
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_LOGO),
    ).toBeOnTheScreen();
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

  it('plays the intro animation while online', async () => {
    goOnline();

    await renderOnboarding();

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_ANIMATION),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_FALLBACK),
    ).not.toBeOnTheScreen();
  });

  it('reserves the intro title slot for the tallest scene title', () => {
    renderSocialProfileOnboarding();
    const heights = { 1: 64, 2: 32, 3: 80 } as const;

    ([1, 2, 3] as const).forEach((step) => {
      fireEvent(
        screen.getByTestId(
          `${SocialProfileOnboardingSelectorsIDs.INTRO_TITLE_SIZER}-${step}`,
          { includeHiddenElements: true },
        ),
        'layout',
        {
          nativeEvent: {
            layout: { x: 0, y: 0, width: 300, height: heights[step] },
          },
        },
      );
    });

    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_TITLE_SLOT),
    ).toHaveStyle({ minHeight: heights[3] });
  });

  it('follows the intro scene with the title', () => {
    goOnline();
    renderSocialProfileOnboarding();

    const introTitle = screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.INTRO_TITLE,
    );
    expect(introTitle).toHaveTextContent(
      strings('social_leaderboard.profile_onboarding.intro_title_activity'),
    );
    expect(
      screen.queryByTestId(
        SocialProfileOnboardingSelectorsIDs.INTRO_TITLE_OUTGOING,
      ),
    ).not.toBeOnTheScreen();

    act(() => {
      __setRivePropertyValue('currentStep', 2);
    });
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_TITLE),
    ).toHaveTextContent(
      strings('social_leaderboard.profile_onboarding.intro_title'),
    );
    expect(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.INTRO_TITLE_INCOMING,
      ),
    ).toHaveAnimatedStyle({ opacity: 1 });
    const outgoingTitle = screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.INTRO_TITLE_OUTGOING,
      { includeHiddenElements: true },
    );
    expect(outgoingTitle).toHaveTextContent(
      strings('social_leaderboard.profile_onboarding.intro_title_activity'),
    );
    expect(outgoingTitle).toHaveAnimatedStyle({ opacity: 0 });

    act(() => {
      __setRivePropertyValue('currentStep', 3);
    });
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_TITLE),
    ).toHaveTextContent(
      strings('social_leaderboard.profile_onboarding.intro_title_post'),
    );

    act(() => {
      __setRivePropertyValue('currentStep', 0);
    });
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.INTRO_TITLE),
    ).toHaveTextContent(
      strings('social_leaderboard.profile_onboarding.intro_title_activity'),
    );
  });

  it('shows the animated profile card on the ready step while online', async () => {
    goOnline();
    await renderOnboarding();

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

  it('pins the ready title under the header and centers the card with its avatar', async () => {
    goOnline();
    await renderOnboarding();

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

    const title = screen.getByText(
      strings('social_leaderboard.profile_onboarding.feed_awaits'),
    );
    const slot = screen.getByTestId(
      SocialProfileOnboardingSelectorsIDs.READY_CARD_SLOT,
    );

    expect(StyleSheet.flatten(title.parent?.props.style)).toEqual(
      expect.objectContaining({ paddingTop: 8 }),
    );
    expect(StyleSheet.flatten(slot.props.style)).toEqual(
      expect.objectContaining({
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }),
    );
    expect(
      within(slot).getByTestId(
        SocialProfileOnboardingSelectorsIDs.READY_ANIMATION,
      ),
    ).toBeOnTheScreen();
    expect(
      within(slot).getByTestId(
        SocialProfileOnboardingSelectorsIDs.READY_AVATAR,
      ),
    ).toBeOnTheScreen();
  });

  it('stays on the username step when the handle cannot be claimed', async () => {
    await renderOnboarding();

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
    await renderOnboarding();

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

  it('checks the display name only when continue is pressed', async () => {
    await openManualUsernameStep();
    fireEvent.changeText(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.DISPLAY_NAME_INPUT,
      ),
      'Bad Name',
    );

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(
      Engine.context.ProfileService.checkDisplayNameValidity,
    ).not.toHaveBeenCalled();

    jest
      .mocked(Engine.context.ProfileService.checkDisplayNameValidity)
      .mockResolvedValueOnce({ valid: false });
    const announceSpy = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    try {
      fireEvent.press(
        screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
      );

      const invalidDisplayName = strings(
        'social_leaderboard.errors.display_name_invalid',
      );
      const displayNameError = await screen.findByText(invalidDisplayName);
      expect(displayNameError).toBeOnTheScreen();
      expect(displayNameError).toHaveProp('accessibilityRole', 'alert');
      expect(displayNameError).toHaveProp('accessibilityLiveRegion', 'polite');
      expect(announceSpy).toHaveBeenCalledWith(invalidDisplayName);
    } finally {
      announceSpy.mockRestore();
    }
    expect(
      Engine.context.ProfileService.checkDisplayNameValidity,
    ).toHaveBeenCalledWith('Bad Name');
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();
  });

  it('stays on the username step when the display name is longer than 50 characters', async () => {
    await openManualUsernameStep();
    submitDisplayName('A'.repeat(MAX_DISPLAY_NAME_LENGTH + 1));

    expect(
      await screen.findByText(
        strings('social_leaderboard.errors.display_name_too_long', {
          max: MAX_DISPLAY_NAME_LENGTH,
        }),
      ),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileService.checkDisplayNameValidity,
    ).not.toHaveBeenCalled();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();
  });

  it('stays on the username step when the display name check cannot reach the API', async () => {
    jest
      .mocked(Engine.context.ProfileService.checkDisplayNameValidity)
      .mockRejectedValueOnce(new Error('offline'));
    await openManualUsernameStep();
    submitDisplayName('Laser Gains');

    expect(
      await screen.findByText(
        strings('social_leaderboard.errors.display_name_check_error'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.errors.display_name_invalid'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      Engine.context.ProfileService.checkDisplayNameValidity,
    ).toHaveBeenCalledWith('Laser Gains');
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();
  });

  it('sends the trimmed display name when continue is pressed', async () => {
    await openManualUsernameStep();
    submitDisplayName('  Laser Gains  ');

    expect(
      await screen.findByText(
        strings('social_leaderboard.profile_onboarding.customize_avatar'),
      ),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileService.checkDisplayNameValidity,
    ).toHaveBeenCalledWith('Laser Gains');
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).not.toBeOnTheScreen();
  });

  it('clears the display name error when the name changes', async () => {
    jest
      .mocked(Engine.context.ProfileService.checkDisplayNameValidity)
      .mockResolvedValueOnce({ valid: false });
    await openManualUsernameStep();
    submitDisplayName('Bad Name');
    expect(
      await screen.findByText(
        strings('social_leaderboard.errors.display_name_invalid'),
      ),
    ).toBeOnTheScreen();

    fireEvent.changeText(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.DISPLAY_NAME_INPUT,
      ),
      'Better Name',
    );

    expect(
      screen.queryByText(
        strings('social_leaderboard.errors.display_name_invalid'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      Engine.context.ProfileService.checkDisplayNameValidity,
    ).toHaveBeenCalledTimes(1);
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();
  });

  it('ignores a display name result that arrives after the name changes', async () => {
    let resolveCheck: (value: { valid: boolean }) => void = () => undefined;
    jest
      .mocked(Engine.context.ProfileService.checkDisplayNameValidity)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveCheck = resolve;
          }),
      );
    await openManualUsernameStep();
    submitDisplayName('Bad Name');
    await waitFor(() => {
      expect(
        Engine.context.ProfileService.checkDisplayNameValidity,
      ).toHaveBeenCalledWith('Bad Name');
    });

    fireEvent.changeText(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.DISPLAY_NAME_INPUT,
      ),
      'Better Name',
    );
    await act(async () => {
      resolveCheck({ valid: false });
    });

    expect(
      screen.queryByText(
        strings('social_leaderboard.errors.display_name_invalid'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(
      await screen.findByText(
        strings('social_leaderboard.profile_onboarding.customize_avatar'),
      ),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileService.checkDisplayNameValidity,
    ).toHaveBeenLastCalledWith('Better Name');
  });

  it('checks availability for a handle with a trailing underscore', async () => {
    await renderOnboarding();
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
      screen.queryByText(
        strings('social_leaderboard.profile_onboarding.username_invalid'),
      ),
    ).not.toBeOnTheScreen();
    // Availability is debounced 400ms. Wait for the available status — the
    // assertion subject — with a budget above that debounce.
    await waitFor(
      () => {
        expect(
          Engine.context.ProfileController.checkUsernameAvailability,
        ).toHaveBeenCalledWith('hello_');
        expect(
          screen.getByText(
            strings('social_leaderboard.profile_onboarding.username_available'),
            { exact: true },
          ),
        ).toBeOnTheScreen();
      },
      { timeout: 3000 },
    );
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
    await renderOnboarding();
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
    await renderOnboarding();

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
    await renderOnboarding([{ name: Routes.HOME_TABS }]);

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
      screen.queryByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
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
      await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(2);
  });

  it('connects X when the session has no profile id yet', async () => {
    signOut();
    await renderOnboarding();

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
    await renderOnboarding();

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
    await renderOnboarding([{ name: Routes.SOCIAL.MY_PROFILE }]);

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
    expect(
      screen.getByText(
        strings('social_leaderboard.profile_onboarding.view_profile'),
      ),
    ).toBeOnTheScreen();

    await waitFor(() => expect(letsGoDisabled()).toBe(false));

    expect(
      screen.queryByTestId(
        SocialProfileOnboardingSelectorsIDs.READY_VERIFIED_BADGE,
      ),
    ).not.toBeOnTheScreen();

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

  it('continues from X identity when the imported display name would fail the name check', async () => {
    jest.mocked(Engine.context.ProfileController.connectX).mockResolvedValue({
      xUserId: 'x-user-1',
      xProfileUrl: 'https://x.com/degangirl',
      username: 'degangirl',
      displayName: 'A'.repeat(MAX_DISPLAY_NAME_LENGTH + 1),
      avatarUrl: '',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    jest
      .mocked(Engine.context.ProfileService.checkDisplayNameValidity)
      .mockResolvedValue({ valid: false });
    await renderOnboarding();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON),
    );
    expect(
      await screen.findByTestId(
        SocialProfileOnboardingSelectorsIDs.X_IDENTITY_STEP,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(await screen.findByText('Account 1')).toBeOnTheScreen();
    expect(
      Engine.context.ProfileService.checkDisplayNameValidity,
    ).not.toHaveBeenCalled();
    expect(
      screen.queryByText(
        strings('social_leaderboard.errors.display_name_too_long', {
          max: MAX_DISPLAY_NAME_LENGTH,
        }),
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByText(
        strings('social_leaderboard.errors.display_name_invalid'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('does not announce a kept X handle as available before the server answers', async () => {
    signIn();
    await renderOnboarding([{ name: Routes.SOCIAL.MY_PROFILE }]);

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

  it('hides the back arrow on the X identity step', async () => {
    signIn();
    await renderOnboarding([
      { name: Routes.HOME_TABS },
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
    expect(
      screen.queryByTestId(SocialProfileOnboardingSelectorsIDs.BACK_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(await screen.findByText('Account 1')).toBeOnTheScreen();
    expect(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.BACK_BUTTON),
    ).toBeOnTheScreen();
  });

  it('uses the manual username and avatar pickers when X reuse is off', async () => {
    signIn();
    await renderOnboarding([{ name: Routes.SOCIAL.MY_PROFILE }]);

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
        avatar_url: expect.stringMatching(
          /^foxicon:\/\/zombie\/background\d+$/,
        ),
      }),
    );
  });

  it('stays on the ready step when profile creation fails offline', async () => {
    jest
      .mocked(Engine.context.ProfileController.createProfile)
      .mockRejectedValueOnce(new Error('offline'));
    await renderOnboarding([{ name: Routes.HOME_TABS }]);
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
      screen.queryByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).not.toBeOnTheScreen();
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      profileBeforeFinish,
    );
    expect(
      screen.queryByTestId(
        SocialProfileOnboardingSelectorsIDs.READY_VERIFIED_BADGE,
      ),
    ).not.toBeOnTheScreen();
  });

  it('creates the profile with the canonical profile id of a merged session', async () => {
    jest
      .mocked(Engine.context.AuthenticationController.getSessionProfile)
      .mockResolvedValue({
        ...SIGNED_OUT_SESSION,
        profileId: 'alias-profile',
        canonicalProfileId: 'signed-in-profile',
      });
    await renderOnboarding([{ name: Routes.HOME_TABS }]);

    await reachReadyStep();
    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ profile_id: 'signed-in-profile' }),
    );
  });

  it('creates a private profile when trading activity is turned off', async () => {
    await renderOnboarding([{ name: Routes.HOME_TABS }]);

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
      /all of this account's positions[\s\S]*Trade performance[\s\S]*Earn 15% on fees[\s\S]*address stays private[\s\S]*can follow your profile/,
    );
    expect(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.ACCOUNT_BENEFITS}-positions-shown`,
      ),
    ).toBeOnTheScreen();

    const activitySwitch = screen.getByRole('switch', {
      name: strings('social_leaderboard.manage_profile.show_trading_activity'),
    });
    expect(activitySwitch).toHaveProp(
      'testID',
      SocialProfileOnboardingSelectorsIDs.SHARE_ACTIVITY_SWITCH,
    );
    expect(activitySwitch).toHaveProp('value', true);

    fireEvent(activitySwitch, 'valueChange', false);
    expect(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.ACCOUNT_BENEFITS}-positions-hidden`,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        `${SocialProfileOnboardingSelectorsIDs.ACCOUNT_BENEFITS}-follow-shown`,
      ),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ trading_privacy: 'private' }),
    );
    expect(getLocalSocialProfileSnapshot().profile).toEqual(
      expect.objectContaining({ shareTradingActivity: false }),
    );
  });

  it('links the second EVM account when the user picks it', async () => {
    await renderOnboarding([{ name: Routes.HOME_TABS }], {
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
      await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        linked_addresses: [`eip155:1:${SECOND_ONBOARDING_EVM_ACCOUNT.address}`],
      }),
    );
  });

  it('shows only the numbered username when the shuffled handle is taken', async () => {
    const pendingChecks = deferUsernameChecks();
    await renderOnboarding();

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

    expect(pendingChecks).toHaveLength(1);
    expect(usernameValue()).toBe(initialHandle);

    await act(async () => {
      pendingChecks[0].resolve(false);
    });

    const numberedHandle = usernameValue();
    expect(numberedHandle).toMatch(/_\d{3}$/);
    expect(numberedHandle).not.toBe(pendingChecks[0].username);
    expect(pendingChecks).toHaveLength(2);
    expect(pendingChecks[1].username).toBe(numberedHandle);
  });

  it('shows the shuffled handle once its availability check resolves', async () => {
    const pendingChecks = deferUsernameChecks();
    await renderOnboarding();

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
    expect(usernameValue()).toBe(initialHandle);

    await act(async () => {
      pendingChecks[0].resolve(true);
    });

    expect(usernameValue()).toBe(pendingChecks[0].username);
    expect(pendingChecks).toHaveLength(1);
  });

  it('keeps the shuffled handle and shows the error when its check fails', async () => {
    jest
      .mocked(Engine.context.ProfileController.checkUsernameAvailability)
      .mockRejectedValueOnce(new Error('offline'));
    await renderOnboarding();

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

    expect(
      await screen.findByText(
        strings('social_leaderboard.profile_onboarding.username_check_error'),
      ),
    ).toBeOnTheScreen();
    const [[shuffledHandle]] = jest.mocked(
      Engine.context.ProfileController.checkUsernameAvailability,
    ).mock.calls;
    expect(usernameValue()).toBe(shuffledHandle);
    expect(
      Engine.context.ProfileController.checkUsernameAvailability,
    ).toHaveBeenCalledTimes(1);
  });

  it('keeps the current handle when the user continues before the shuffle check resolves', async () => {
    const pendingChecks = deferUsernameChecks();
    await renderOnboarding([{ name: Routes.HOME_TABS }]);

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
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
    expect(pendingChecks).toHaveLength(2);
    await act(async () => {
      pendingChecks[0].resolve(true);
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
    ).toHaveTextContent(`@${initialHandle}`);

    await leaveReadyStep();

    expect(
      await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
    expect(Engine.context.ProfileController.createProfile).toHaveBeenCalledWith(
      expect.objectContaining({ username: initialHandle }),
    );
  });

  it('stays on the username step when the availability check rejects offline', async () => {
    jest
      .mocked(Engine.context.ProfileController.checkUsernameAvailability)
      .mockRejectedValueOnce(new Error('offline'));
    await renderOnboarding();

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
    await renderOnboarding();

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
    await renderOnboarding([{ name: Routes.HOME_TABS }], {
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
      screen.queryByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
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
      await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
    ).toBeOnTheScreen();
    expect(
      Engine.context.ProfileController.createProfile,
    ).toHaveBeenCalledTimes(1);
  });

  it('updates the created profile when the username changes', async () => {
    const resolveUpdate = deferUpdateProfile();
    await renderOnboarding([{ name: Routes.HOME_TABS }]);

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
    await renderOnboarding();

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
    await renderOnboarding();

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
    await renderOnboarding();

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

  describe('existing profile on a fresh install', () => {
    afterEach(() => {
      storageReadSpy?.mockRestore();
      storageReadSpy = undefined;
    });

    it('opens the Social tab without creating a profile when the session already has one', async () => {
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockResolvedValue(EXISTING_PROFILE);

      renderSocialProfileOnboarding([
        { name: Routes.HOME_TABS, Component: FeedExitStackProbe },
      ]);

      expect(
        await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
      ).toHaveTextContent(Routes.SOCIAL.TAB);
      expect(
        Engine.context.ProfileController.fetchAndUpdateProfile,
      ).toHaveBeenCalledWith('signed-in-profile');
      expect(
        Engine.context.ProfileController.createProfile,
      ).not.toHaveBeenCalled();
      expect(
        screen.queryByTestId(SocialTermsSheetSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen();
    });

    it('records the terms and opens the Social tab when nothing is stored for an existing profile', async () => {
      await resetSocialTermsAcceptance();
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockResolvedValue(EXISTING_PROFILE);

      renderSocialProfileOnboarding([
        { name: Routes.HOME_TABS, Component: FeedExitStackProbe },
      ]);

      expect(
        await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
      ).toHaveTextContent(Routes.SOCIAL.TAB);
      expect(hasAcceptedSocialTerms()).toBe(true);
      expect(
        screen.queryByTestId(SocialTermsSheetSelectorsIDs.SHEET),
      ).not.toBeOnTheScreen();
      expect(
        Engine.context.ProfileController.createProfile,
      ).not.toHaveBeenCalled();
    });

    it('shows only the terms sheet when the existing profile has not accepted the current terms', async () => {
      await storeOlderTermsVersion();
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockResolvedValue(EXISTING_PROFILE);

      renderSocialProfileOnboarding([
        { name: Routes.HOME_TABS, Component: FeedExitStackProbe },
      ]);

      expect(
        await screen.findByTestId(SocialTermsSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
      ).not.toBeOnTheScreen();
      expect(
        Engine.context.ProfileController.createProfile,
      ).not.toHaveBeenCalled();
    });

    it('opens the Social tab once the terms are agreed for an existing profile', async () => {
      await storeOlderTermsVersion();
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockResolvedValue(EXISTING_PROFILE);

      renderSocialProfileOnboarding([
        { name: Routes.HOME_TABS, Component: FeedExitStackProbe },
      ]);

      expect(
        await screen.findByTestId(SocialTermsSheetSelectorsIDs.SHEET),
      ).toBeOnTheScreen();

      agreeToTerms();

      expect(
        await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
      ).toHaveTextContent(Routes.SOCIAL.TAB);
      expect(hasAcceptedSocialTerms()).toBe(true);
      expect(
        Engine.context.ProfileController.createProfile,
      ).not.toHaveBeenCalled();
    });

    it('keeps the intro actions disabled until the profile check settles', async () => {
      let resolveLookup: (profile: Profile) => void = () => undefined;
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveLookup = resolve;
            }),
        );

      renderSocialProfileOnboarding();

      await waitFor(() => {
        expect(
          Engine.context.ProfileController.fetchAndUpdateProfile,
        ).toHaveBeenCalledTimes(1);
      });
      expect(
        introActionDisabled(
          SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
        ),
      ).toBe(true);
      expect(
        introActionDisabled(
          SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON,
        ),
      ).toBe(true);

      await act(async () => {
        resolveLookup(NO_PROFILE);
      });

      await waitFor(() => {
        expect(
          introActionDisabled(
            SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
          ),
        ).toBe(false);
      });
      expect(
        introActionDisabled(
          SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON,
        ),
      ).toBe(false);
    });

    it('continues onboarding when the profile API returns 404', async () => {
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockRejectedValue(Object.assign(new Error('404'), { status: 404 }));

      await renderOnboarding();
      fireEvent.press(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
        ),
      );

      expect(
        screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
      ).toBeOnTheScreen();
    });

    it('continues onboarding when the profile check fails', async () => {
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockRejectedValue(new Error('network'));

      await renderOnboarding();
      fireEvent.press(
        screen.getByTestId(
          SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
        ),
      );

      expect(
        screen.getByTestId(SocialProfileOnboardingSelectorsIDs.USERNAME_STEP),
      ).toBeOnTheScreen();
    });

    it('shows the save error instead of creating a profile when there is no session profile id', async () => {
      signOut();
      await renderOnboarding([{ name: Routes.HOME_TABS }]);

      await reachReadyStep();

      expect(
        await screen.findByText(
          "Couldn't create your profile. Check your connection and try again.",
        ),
      ).toBeOnTheScreen();
      expect(
        Engine.context.ProfileController.createProfile,
      ).not.toHaveBeenCalled();
      expect(
        Engine.context.ProfileController.fetchAndUpdateProfile,
      ).not.toHaveBeenCalled();
    });

    it('opens the Social tab instead of creating a profile when sign-in recovers and the session already has one', async () => {
      signOut();
      await renderOnboarding([
        { name: Routes.HOME_TABS, Component: FeedExitStackProbe },
      ]);
      signIn();
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockResolvedValue(EXISTING_PROFILE);

      await reachReadyStep();

      expect(
        await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
      ).toHaveTextContent(Routes.SOCIAL.TAB);
      expect(
        Engine.context.ProfileController.fetchAndUpdateProfile,
      ).toHaveBeenCalledWith('signed-in-profile');
      expect(
        Engine.context.ProfileController.createProfile,
      ).not.toHaveBeenCalled();
    });

    it('opens the Social tab instead of creating a profile when the check on open failed and the profile exists', async () => {
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockRejectedValueOnce(new Error('network'))
        .mockResolvedValue(EXISTING_PROFILE);
      await renderOnboarding([
        { name: Routes.HOME_TABS, Component: FeedExitStackProbe },
      ]);

      await reachReadyStep();

      expect(
        await screen.findByTestId(getRouteProbeTestId(Routes.HOME_TABS)),
      ).toHaveTextContent(Routes.SOCIAL.TAB);
      expect(
        Engine.context.ProfileController.fetchAndUpdateProfile,
      ).toHaveBeenCalledTimes(2);
      expect(
        Engine.context.ProfileController.createProfile,
      ).not.toHaveBeenCalled();
    });

    it('creates the profile when the check on open failed and the check before creating finds none', async () => {
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockRejectedValueOnce(new Error('network'));
      await renderOnboarding([{ name: Routes.HOME_TABS }]);

      await reachReadyStep();

      await waitFor(() => {
        expect(
          Engine.context.ProfileController.createProfile,
        ).toHaveBeenCalledTimes(1);
      });
      expect(
        Engine.context.ProfileController.fetchAndUpdateProfile,
      ).toHaveBeenCalledTimes(2);
    });

    it('shows the save error instead of creating a profile when the check before creating fails', async () => {
      jest
        .mocked(Engine.context.ProfileController.fetchAndUpdateProfile)
        .mockRejectedValue(new Error('network'));
      await renderOnboarding([{ name: Routes.HOME_TABS }]);

      await reachReadyStep();

      expect(
        await screen.findByText(
          "Couldn't create your profile. Check your connection and try again.",
        ),
      ).toBeOnTheScreen();
      expect(
        Engine.context.ProfileController.createProfile,
      ).not.toHaveBeenCalled();
    });
  });
});
