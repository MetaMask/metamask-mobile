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

describe('SocialProfileOnboardingView', () => {
  afterEach(() => {
    restoreDefaultLocalSocialProfile();
    netInfoMock.__resetMockNetInfo();
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
  });

  it('defaults the avatar backdrop to the centered color', () => {
    renderSocialProfileOnboarding();

    fireEvent.press(
      screen.getByTestId(
        SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON,
      ),
    );
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );

    expect(screen.getByText('Customize your avatar')).toBeOnTheScreen();
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
    fireEvent.press(
      screen.getByTestId(SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON),
    );
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
});
