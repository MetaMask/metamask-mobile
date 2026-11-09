/**
 * Rewards Settings referral field through the shared Money preset.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsSettingsView.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Routes from '../../../../constants/navigation/Routes';
import { OPT_OUT_SECTION_TEST_IDS } from '../components/Settings/OptOutSection.testIds';
import { REFERRED_BY_CODE_SECTION_TEST_IDS } from '../components/Settings/ReferredByCodeSection.testIds';
import { REWARD_SETTINGS_ACCOUNT_GROUP_LIST_TEST_IDS } from '../components/Settings/RewardSettingsAccountGroupList.testIds';
import { getRouteProbeTestId } from '../../../../../tests/component-view/render';
import { renderRewardsSettingsView } from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  referralMeFixture,
  REFERRAL_LOCALIZED_TEXT,
} from '../../../../../tests/component-view/presets/rewardsMoney';

describe('RewardsSettingsView', () => {
  it('shows only the referral section when the user has no subscription', async () => {
    const { findByTestId, getByTestId, queryByTestId } =
      renderRewardsSettingsView({
        persona: 'plain',
      });

    expect(
      await findByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.SECTION),
    ).toBeOnTheScreen();
    fireEvent.changeText(
      getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.INPUT),
      'ab-1',
    );

    expect(getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.INPUT)).toHaveProp(
      'value',
      'AB1',
    );
    expect(
      queryByTestId(REWARD_SETTINGS_ACCOUNT_GROUP_LIST_TEST_IDS.HEADER),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(REWARD_SETTINGS_ACCOUNT_GROUP_LIST_TEST_IDS.FLASH_LIST),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(OPT_OUT_SECTION_TEST_IDS.CONTAINER),
    ).not.toBeOnTheScreen();
  });

  it('shows an already saved code as read-only', async () => {
    const storedCode =
      referralMeFixture('referee').referred_by?.referral_code ?? '';
    const { findByTestId, getByTestId, getByText, queryByTestId } =
      renderRewardsSettingsView({
        persona: 'referee',
      });

    const input = await findByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.INPUT);

    expect(input).toHaveProp('value', storedCode);
    expect(
      getByText(REFERRAL_LOCALIZED_TEXT.settingsReferralLinkedDescription),
    ).toBeOnTheScreen();

    fireEvent.changeText(input, 'NEWCODE');

    expect(getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.INPUT)).toHaveProp(
      'value',
      storedCode,
    );
    expect(
      queryByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY),
    ).not.toBeOnTheScreen();
  });

  it('navigates to the referral accepted splash after a valid code is applied', async () => {
    const { findByTestId, getByTestId, engine } = renderRewardsSettingsView({
      persona: 'plain',
    });

    const input = await findByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.INPUT);

    fireEvent.changeText(input, 'ab-12cd');

    expect(getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.INPUT)).toHaveProp(
      'value',
      'AB12CD',
    );

    await waitFor(
      () => {
        expect(
          getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY),
        ).not.toBeDisabled();
      },
      { timeout: 3000 },
    );
    fireEvent.press(getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY));

    expect(
      await findByTestId(
        getRouteProbeTestId(Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW),
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
    expect(engine).toHaveBeenCalledWith(
      'RewardsMoneyController:registerReferee',
      { code: 'AB12CD' },
    );
  });
});
