/**
 * The Settings referral-code accept journey.
 *
 * B11: a double tap on Apply registers once, reads referral me back, and the
 * session profile comes back as a REFEREE before the splash opens.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsSettingsView.acceptJourney.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { selectReferralMeEntry } from '../../../../reducers/rewardsMoney/selectors';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { renderRewardsSettingsView } from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  referralMeFixture,
  REWARDS_MONEY_PROFILE_ID,
  REFERRAL_LOCALIZED_TEXT,
} from '../../../../../tests/component-view/presets/rewardsMoney';
import { REFERRED_BY_CODE_SECTION_TEST_IDS } from '../components/Settings/ReferredByCodeSection.testIds';

function callsFor(engine: jest.Mock, action: string): unknown[][] {
  return engine.mock.calls.filter((call) => call[0] === action);
}

describe('RewardsSettingsView accept journey', () => {
  it('registers once from a double tap and reads the profile back as a referee (B11)', async () => {
    // The pre-register read returns a plain profile; the forceFresh read back
    // after registration returns the REFEREE payload the backend now serves.
    const refereeMe = referralMeFixture('referee');
    const { findByTestId, getByTestId, store, engine } =
      renderRewardsSettingsView({
        persona: 'plain',
        handlers: {
          'RewardsMoneyController:getReferralMe': (...args: unknown[]) => {
            const params = args[0] as { forceFresh?: boolean } | undefined;
            return Promise.resolve(
              params?.forceFresh ? refereeMe : referralMeFixture('plain'),
            );
          },
        },
      });

    const input = await findByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.INPUT);
    fireEvent.changeText(input, 'ab-12cd');

    await waitFor(() => {
      expect(
        getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY),
      ).not.toBeDisabled();
    });

    // Two presses in one tick: the second lands while the first register is
    // still in flight.
    fireEvent.press(getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY));
    fireEvent.press(getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY));

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW),
      ),
    ).toBeOnTheScreen();

    expect(
      callsFor(engine, 'RewardsMoneyController:registerReferee'),
    ).toHaveLength(1);
    expect(
      callsFor(engine, 'RewardsMoneyController:registerReferee')[0][1],
    ).toEqual({ code: 'AB12CD' });

    // The read back landed: the session profile is now a REFEREE.
    await waitFor(() => {
      expect(
        selectReferralMeEntry(store.getState(), REWARDS_MONEY_PROFILE_ID)?.data
          ?.roles,
      ).toEqual(['REFEREE']);
    });
    expect(
      selectReferralMeEntry(store.getState(), REWARDS_MONEY_PROFILE_ID)?.data
        ?.localized_text.settingsReferralLinkedDescription,
    ).toBe(REFERRAL_LOCALIZED_TEXT.settingsReferralLinkedDescription);
  });
});
