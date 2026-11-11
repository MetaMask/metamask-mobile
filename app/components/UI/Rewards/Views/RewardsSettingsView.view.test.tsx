/**
 * Rewards Settings referral field through the shared Money preset.
 *
 * yarn jest -c jest.config.view.js app/components/UI/Rewards/Views/RewardsSettingsView.view.test.tsx --runInBand --coverage=false
 */
import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { METAMASK_SUPPORT_URL } from '../../../../constants/urls';
import { RewardsMoneyHttpError } from '../../../../core/Engine/controllers/rewards-money-controller/services/rewards-money-data-service';
import ReduxService from '../../../../core/redux';
import { REWARDS_SETTINGS_SAFE_AREA_TEST_ID } from './RewardsSettingsView';
import { OPT_OUT_SECTION_TEST_IDS } from '../components/Settings/OptOutSection.testIds';
import { REFERRED_BY_CODE_SECTION_TEST_IDS } from '../components/Settings/ReferredByCodeSection.testIds';
import { REWARD_SETTINGS_ACCOUNT_GROUP_LIST_TEST_IDS } from '../components/Settings/RewardSettingsAccountGroupList.testIds';
import {
  getRouteParamsProbeTestId,
  getRouteProbeTestId,
} from '../../../../../tests/component-view/render';
import { renderRewardsSettingsView } from '../../../../../tests/component-view/renderers/rewardsMoney';
import {
  referralMeFixture,
  REFERRAL_LOCALIZED_TEXT,
} from '../../../../../tests/component-view/presets/rewardsMoney';

const ACCEPTED_SPLASH = getRouteProbeTestId(
  Routes.REWARDS_MONEY_REFERRAL_ACCEPTED_SPLASH_VIEW,
);

async function typeCode(
  view: ReturnType<typeof renderRewardsSettingsView>,
  code: string,
): Promise<void> {
  fireEvent.changeText(
    await view.findByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.INPUT),
    code,
  );
}

async function waitUntilApplyEnabled(
  view: ReturnType<typeof renderRewardsSettingsView>,
): Promise<void> {
  // Referral code validation resolves before Apply enables.
  await waitFor(
    () => {
      expect(
        view.getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY),
      ).not.toBeDisabled();
    },
    { timeout: 3000 },
  );
}

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

  it('shows the invalid code error when validation rejects the code (B3)', async () => {
    const view = renderRewardsSettingsView({
      persona: 'plain',
      handlers: {
        'RewardsMoneyController:validateReferralCode': () =>
          Promise.resolve({ success: false }),
      },
    });

    await typeCode(view, 'BADBAD');

    // validateReferralCode resolves before the invalid-code error renders.
    expect(
      await view.findByText(
        strings('rewards.error_messages.invalid_referral_code'),
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY),
    ).toBeDisabled();
    expect(view.engine).not.toHaveBeenCalledWith(
      'RewardsMoneyController:registerReferee',
      expect.anything(),
    );
  });

  it.each([
    {
      caseId: 'B3',
      refusal: 'own code',
      status: 403,
      bodyText: 'Cannot use your own referral code',
      message: () =>
        strings('rewards.error_messages.cannot_use_own_referral_code'),
    },
    {
      caseId: 'B4',
      refusal: '409 ALREADY_REFERRED',
      status: 409,
      bodyText: 'User is already referred',
      message: () => strings('rewards.error_messages.already_referred'),
    },
  ])(
    'shows the $refusal error when apply is refused ($caseId)',
    async ({ status, bodyText, message }) => {
      const view = renderRewardsSettingsView({
        persona: 'plain',
        handlers: {
          'RewardsMoneyController:registerReferee': () =>
            Promise.reject(
              new RewardsMoneyHttpError(
                `Register referee failed: ${status}`,
                status,
                bodyText,
              ),
            ),
        },
      });

      await typeCode(view, 'AB12CD');
      await waitUntilApplyEnabled(view);
      fireEvent.press(
        view.getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY),
      );

      // registerReferee rejects before the refusal error renders.
      expect(
        await view.findByText(message(), {}, { timeout: 3000 }),
      ).toBeOnTheScreen();
      expect(view.queryByTestId(ACCEPTED_SPLASH)).not.toBeOnTheScreen();
      expect(view.engine).toHaveBeenCalledWith(
        'RewardsMoneyController:registerReferee',
        { code: 'AB12CD' },
      );
    },
  );

  it('hides the referral section when Rewards Money is disabled', async () => {
    const { findByTestId, queryByTestId } = renderRewardsSettingsView({
      persona: 'plain',
      moneyControllerEnabled: false,
    });

    expect(
      await findByTestId(REWARDS_SETTINGS_SAFE_AREA_TEST_ID),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.SECTION),
    ).not.toBeOnTheScreen();
  });

  it('shows the generic error when registration reports Rewards Money is disabled', async () => {
    const view = renderRewardsSettingsView({
      persona: 'plain',
      handlers: {
        'RewardsMoneyController:registerReferee': () =>
          Promise.reject(new Error('Rewards Money is disabled')),
      },
    });

    await typeCode(view, 'AB12CD');
    await waitUntilApplyEnabled(view);
    fireEvent.press(view.getByTestId(REFERRED_BY_CODE_SECTION_TEST_IDS.APPLY));

    // registerReferee rejects before the generic error renders.
    expect(
      await view.findByText(
        strings('rewards.error_messages.something_went_wrong'),
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
    expect(view.queryByTestId(ACCEPTED_SPLASH)).not.toBeOnTheScreen();
  });

  it('opens support in the modal webview from an off-device account', async () => {
    const view = renderRewardsSettingsView({
      persona: 'referee',
      subscriptionId: 'sub-1',
      supportPreferenceSaved: true,
      handlers: {
        'RewardsController:getOffDeviceSubscriptionAccounts': () =>
          Promise.resolve([
            'eip155:1:0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          ]),
      },
    });
    // Consent reads the saved preference from ReduxService.
    ReduxService.store = view.store;

    fireEvent.press(
      await view.findByText(
        strings('rewards.settings.off_device_accounts_banner_cta'),
      ),
    );
    fireEvent.press(
      await view.findByText(
        strings('rewards.settings.off_device_accounts_sheet_let_us_know'),
      ),
    );

    expect(
      await view.findByTestId(
        getRouteParamsProbeTestId(Routes.MODAL.ROOT_MODAL_FLOW),
      ),
    ).toHaveTextContent(
      JSON.stringify({
        screen: Routes.WEBVIEW.SIMPLE,
        params: {
          url: METAMASK_SUPPORT_URL,
          title: strings('app_settings.contact_support'),
          isModal: false,
        },
      }),
    );
  });
});
