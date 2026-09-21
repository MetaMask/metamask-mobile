import '../../../../../tests/component-view/mocks';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderAdvancedSettings,
  renderAdvancedSettingsWithBackRoute,
  SETTINGS_LAUNCHER_LABEL,
} from '../../../../../tests/component-view/renderers/settings';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import Routes from '../../../../constants/navigation/Routes';
import Engine from '../../../../core/Engine';
import { AdvancedViewSelectorsIDs } from './AdvancedView.testIds';

describeForPlatforms('Advanced Settings component view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns to the previous screen from the header', async () => {
    const { findByTestId, getByText, queryByTestId } =
      renderAdvancedSettingsWithBackRoute();

    fireEvent.press(getByText(SETTINGS_LAUNCHER_LABEL));
    const backButton = await findByTestId(AdvancedViewSelectorsIDs.BACK_BUTTON);

    fireEvent.press(backButton);

    await waitFor(() => {
      expect(
        queryByTestId(AdvancedViewSelectorsIDs.BACK_BUTTON),
      ).not.toBeOnTheScreen();
    });
    expect(getByText(SETTINGS_LAUNCHER_LABEL)).toBeOnTheScreen();
  });

  it('disables smart-account dapp request prompts', async () => {
    const setEnabledSpy = jest.spyOn(
      Engine.context.PreferencesController,
      'setDismissSmartAccountSuggestionEnabled',
    );
    const { findByLabelText } = renderAdvancedSettings();
    const toggle = await findByLabelText(
      strings('app_settings.smart_account_dapp_requests_heading'),
    );

    fireEvent(toggle, 'valueChange', false);

    expect(setEnabledSpy).toHaveBeenCalledWith(true);
  });

  it('disables smart transactions', async () => {
    const setOptInStatusSpy = jest.spyOn(
      Engine.context.PreferencesController,
      'setSmartTransactionsOptInStatus',
    );
    const { findByLabelText } = renderAdvancedSettings();
    const toggle = await findByLabelText(
      strings('app_settings.smart_transactions_opt_in_heading'),
    );

    fireEvent(toggle, 'valueChange', false);

    expect(setOptInStatusSpy).toHaveBeenCalledWith(false);
  });

  it('opens the smart transactions information page', async () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);
    const { getByText } = renderAdvancedSettings();

    fireEvent.press(
      getByText(strings('app_settings.smart_transactions_learn_more')),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(AppConstants.URLS.SMART_TXS);
  });

  it('opens the fiat-on-testnets friction sheet when enabling fiat', async () => {
    const { findByLabelText, findByTestId } = renderAdvancedSettings();
    const toggle = await findByLabelText(
      strings('app_settings.show_fiat_on_testnets'),
    );

    fireEvent(toggle, 'valueChange', true);

    expect(
      await findByTestId(`route-${Routes.MODAL.ROOT_MODAL_FLOW}`),
    ).toBeOnTheScreen();
  });

  it('disables the fiat-on-testnets preference', async () => {
    const { findByLabelText, store } = renderAdvancedSettings({
      overrides: {
        settings: {
          showFiatOnTestnets: true,
        },
      },
    });
    const toggle = await findByLabelText(
      strings('app_settings.show_fiat_on_testnets'),
    );

    fireEvent(toggle, 'valueChange', false);

    await waitFor(() => {
      expect(store.getState().settings.showFiatOnTestnets).toBe(false);
    });
  });
});
