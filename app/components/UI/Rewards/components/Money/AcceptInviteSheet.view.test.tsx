/**
 * Invite sheet through the real accept hook and registered splash route.
 *
 * Run with:
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/components/Money/AcceptInviteSheet.view.test.tsx --runInBand --silent --coverage=false
 */
import '../../../../../../tests/component-view/mocks';
import {
  fireEvent,
  waitFor,
  type RenderResult,
} from '@testing-library/react-native';
import { RewardsMoneyHttpError } from '../../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import { strings } from '../../../../../../locales/i18n';
import {
  installRewardsMoneyEngine,
  renderAcceptInviteSheet,
} from '../../../../../../tests/component-view/renderers/rewardsMoney';
import { referralMeFixture } from '../../../../../../tests/component-view/presets/rewardsMoney';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { ACCEPT_INVITE_SHEET_TEST_IDS } from './AcceptInviteSheet';
import { REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS } from '../../Views/RewardsMoneyReferralAcceptedSplashView';

const ACCEPT_WAIT = { timeout: 3000 };

const refusals: {
  name: string;
  status: number;
  body: string;
  message: string;
}[] = [
  {
    name: 'already referred',
    status: 409,
    body: '',
    message: strings('rewards.error_messages.already_referred'),
  },
  {
    name: 'own code',
    status: 403,
    body: 'own referral code',
    message: strings('rewards.error_messages.cannot_use_own_referral_code'),
  },
  {
    name: 'cannot be referred',
    status: 403,
    body: 'kol cannot register as a referee',
    message: strings('rewards.error_messages.referrer_cannot_be_referred'),
  },
];

async function pressAcceptWhenReady(getByTestId: RenderResult['getByTestId']) {
  await waitFor(() => {
    expect(
      getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT).props.accessibilityState
        ?.disabled,
    ).toBe(false);
  }, ACCEPT_WAIT);

  fireEvent.press(getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT));
}

describeForPlatforms('AcceptInviteSheet', () => {
  it('opens the accepted splash after the invite is accepted', async () => {
    installRewardsMoneyEngine({
      referralMe: referralMeFixture('REFEREE'),
    });

    const { getByTestId, findByTestId } = renderAcceptInviteSheet(
      referralMeFixture('NONE'),
    );

    await pressAcceptWhenReady(getByTestId);

    expect(
      await findByTestId(
        REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER,
        {},
        ACCEPT_WAIT,
      ),
    ).toBeOnTheScreen();
  });

  for (const refusal of refusals) {
    it(`stays on the sheet when the invite is refused as ${refusal.name}`, async () => {
      installRewardsMoneyEngine({
        registerReferee: () =>
          Promise.reject(
            new RewardsMoneyHttpError(
              'refused',
              refusal.status,
              refusal.body === '' ? undefined : refusal.body,
            ),
          ),
      });

      const { getByTestId, findByTestId, queryByTestId } =
        renderAcceptInviteSheet(referralMeFixture('NONE'));

      await pressAcceptWhenReady(getByTestId);

      expect(
        await findByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CODE_ERROR),
      ).toHaveTextContent(refusal.message);
      expect(
        getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(
          REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER,
        ),
      ).not.toBeOnTheScreen();
    });
  }
});
