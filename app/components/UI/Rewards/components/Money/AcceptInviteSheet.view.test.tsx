/**
 * Invite sheet through the real accept hook, with a parent route under the sheet.
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
  REWARDS_MONEY_INVITE_UNDERLAY_TEST_ID,
  renderAcceptInviteSheet,
} from '../../../../../../tests/component-view/renderers/rewardsMoney';
import { referralMeFixture } from '../../../../../../tests/component-view/presets/rewardsMoney';
import { ACCEPT_INVITE_SHEET_TEST_IDS } from './AcceptInviteSheet';
import { REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS } from '../../Views/RewardsMoneyReferralAcceptedSplashView';
import { REFEREE_HERO_CARD_TEST_IDS } from './RefereeHeroCard';
import { REFERER_HERO_CARD_TEST_IDS } from './RefererHeroCard';
import { REWARDS_OPT_IN_SECTION_TEST_IDS } from './RewardsOptInSection';
import { REWARDS_MONEY_DASHBOARD_TEST_IDS } from '../../Views/RewardsMoneyDashboard.testIds';

const ACCEPT_WAIT = { timeout: 3000 };
const DASHBOARD_WAIT = { timeout: 5000 };

const OWN_CODE_BODY = 'You cannot use your own referral code';
const KOL_BODY = 'A KOL cannot register as a referee';

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
    body: OWN_CODE_BODY,
    message: strings('rewards.error_messages.cannot_use_own_referral_code'),
  },
  {
    name: 'cannot be referred',
    status: 403,
    body: KOL_BODY,
    message: strings('rewards.error_messages.referrer_cannot_be_referred'),
  },
];

type EngineCall = jest.Mock;

function callsFor(engine: EngineCall, action: string): unknown[][] {
  return engine.mock.calls.filter((call) => call[0] === action);
}

async function pressAcceptWhenReady(getByTestId: RenderResult['getByTestId']) {
  await waitFor(() => {
    expect(
      getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT).props.accessibilityState
        ?.disabled,
    ).toBe(false);
  }, ACCEPT_WAIT);

  fireEvent.press(getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT));
}

describe('AcceptInviteSheet', () => {
  it('registers KOL1, leaves the sheet, and opens the referee dashboard', async () => {
    const { engine, getByTestId, findByTestId, queryByTestId } =
      renderAcceptInviteSheet(referralMeFixture('plain'), {
        referralMeFetch: referralMeFixture('referee'),
      });

    await pressAcceptWhenReady(getByTestId);

    await waitFor(() => {
      expect(
        callsFor(engine, 'RewardsMoneyController:registerReferee'),
      ).toEqual([['RewardsMoneyController:registerReferee', { code: 'KOL1' }]]);
    });
    await waitFor(() => {
      expect(engine).toHaveBeenCalledWith(
        'RewardsMoneyController:getReferralMe',
        { forceFresh: true },
      );
      expect(
        queryByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CONTAINER),
      ).not.toBeOnTheScreen();
    });
    expect(
      await findByTestId(
        REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER,
        {},
        ACCEPT_WAIT,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.VIEW_REWARDS),
    );

    expect(
      await findByTestId(
        REFEREE_HERO_CARD_TEST_IDS.REFERRAL_CODE,
        {},
        DASHBOARD_WAIT,
      ),
    ).toHaveTextContent('SOPHIE');
    expect(
      queryByTestId(REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('still opens the Money dashboard when the read-back stays a plain user', async () => {
    const { engine, getByTestId, findByTestId, queryByTestId } =
      renderAcceptInviteSheet(referralMeFixture('plain'));

    await pressAcceptWhenReady(getByTestId);

    await waitFor(() => {
      expect(engine).toHaveBeenCalledWith(
        'RewardsMoneyController:registerReferee',
        { code: 'KOL1' },
      );
    });
    await waitFor(() => {
      expect(engine).toHaveBeenCalledWith(
        'RewardsMoneyController:getReferralMe',
        { forceFresh: true },
      );
    });
    expect(
      await findByTestId(
        REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER,
        {},
        ACCEPT_WAIT,
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.VIEW_REWARDS),
    );

    expect(
      await findByTestId(
        REWARDS_MONEY_DASHBOARD_TEST_IDS.CONTAINER,
        {},
        DASHBOARD_WAIT,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REFEREE_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REFERER_HERO_CARD_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  for (const refusal of refusals) {
    it(`keeps Accept enabled when the invite is refused as ${refusal.name}`, async () => {
      const { engine, getByTestId, findByTestId, queryByTestId } =
        renderAcceptInviteSheet(referralMeFixture('plain'), {
          registerReferee: () =>
            Promise.reject(
              new RewardsMoneyHttpError(
                'refused',
                refusal.status,
                refusal.body === '' ? undefined : refusal.body,
              ),
            ),
        });

      await pressAcceptWhenReady(getByTestId);

      expect(
        await findByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CODE_ERROR),
      ).toHaveTextContent(refusal.message);
      expect(
        getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT).props
          .accessibilityState?.disabled,
      ).toBe(false);
      expect(
        callsFor(engine, 'RewardsMoneyController:getReferralMe'),
      ).toHaveLength(0);
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

  it('disables Accept when the server rejects the code', async () => {
    const { engine, getByTestId, findByTestId } = renderAcceptInviteSheet(
      referralMeFixture('plain'),
      { validateReferralCode: { success: false } },
    );

    expect(
      await findByTestId(
        ACCEPT_INVITE_SHEET_TEST_IDS.CODE_ERROR,
        {},
        ACCEPT_WAIT,
      ),
    ).toHaveTextContent(
      strings('rewards.error_messages.invalid_referral_code'),
    );
    expect(
      getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT).props.accessibilityState
        ?.disabled,
    ).toBe(true);

    fireEvent.press(getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT));

    expect(
      callsFor(engine, 'RewardsMoneyController:registerReferee'),
    ).toHaveLength(0);
    expect(
      callsFor(engine, 'RewardsMoneyController:getReferralMe'),
    ).toHaveLength(0);
  });

  it.each([
    ['Decline', ACCEPT_INVITE_SHEET_TEST_IDS.DECLINE],
    ['Close', ACCEPT_INVITE_SHEET_TEST_IDS.CLOSE],
  ])('dismisses from %s without registering', async (_label, testId) => {
    const { engine, getByTestId, findByTestId, queryByTestId } =
      renderAcceptInviteSheet(referralMeFixture('plain'));

    fireEvent.press(getByTestId(testId));

    expect(
      await findByTestId(REWARDS_MONEY_INVITE_UNDERLAY_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
    expect(
      callsFor(engine, 'RewardsMoneyController:registerReferee'),
    ).toHaveLength(0);
  });

  it.each(['referrer', 'referee'] as const)(
    'closes immediately when the profile is already a %s',
    async (persona) => {
      const { engine, findByTestId, queryByTestId } = renderAcceptInviteSheet(
        referralMeFixture(persona),
      );

      expect(
        await findByTestId(REWARDS_MONEY_INVITE_UNDERLAY_TEST_ID),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        callsFor(engine, 'RewardsMoneyController:registerReferee'),
      ).toHaveLength(0);
    },
  );

  it('keeps Accept disabled after a 429 with Retry-After', async () => {
    const { engine, getByTestId, findByTestId } = renderAcceptInviteSheet(
      referralMeFixture('plain'),
      {
        registerReferee: () =>
          Promise.reject(
            new RewardsMoneyHttpError('refused', 429, undefined, 60),
          ),
      },
    );

    await pressAcceptWhenReady(getByTestId);

    expect(
      await findByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.CODE_ERROR),
    ).toHaveTextContent(strings('rewards.error_messages.rate_limited'));
    expect(
      getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT).props.accessibilityState
        ?.disabled,
    ).toBe(true);

    fireEvent.press(getByTestId(ACCEPT_INVITE_SHEET_TEST_IDS.ACCEPT));

    expect(
      callsFor(engine, 'RewardsMoneyController:registerReferee'),
    ).toHaveLength(1);
    expect(
      callsFor(engine, 'RewardsMoneyController:getReferralMe'),
    ).toHaveLength(0);
  });
});
