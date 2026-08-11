import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  renderGeneralSettings,
  renderGeneralSettingsWithBackRoute,
  SETTINGS_LAUNCHER_LABEL,
} from '../../../../../tests/component-view/renderers/settings';
import {
  describeForPlatforms,
  itEach,
} from '../../../../../tests/component-view/platform';
import { strings } from '../../../../../locales/i18n';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';
import Engine from '../../../../core/Engine';
import { GENERAL_SETTINGS_CURRENCY_SELECTOR } from '.';
import { GeneralSettingsSelectorsIDs } from './GeneralSettings.testIds';

describeForPlatforms('General Settings component view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns to the previous screen from the header', async () => {
    const { findByTestId, getByText, queryByTestId } =
      renderGeneralSettingsWithBackRoute();

    fireEvent.press(getByText(SETTINGS_LAUNCHER_LABEL));
    const backButton = await findByTestId(
      GeneralSettingsSelectorsIDs.BACK_BUTTON,
    );

    fireEvent.press(backButton);

    await waitFor(() => {
      expect(
        queryByTestId(GeneralSettingsSelectorsIDs.BACK_BUTTON),
      ).not.toBeOnTheScreen();
    });
    expect(getByText(SETTINGS_LAUNCHER_LABEL)).toBeOnTheScreen();
  });

  it('updates both currency controllers', () => {
    const setCurrentCurrencySpy = jest.spyOn(
      Engine.context.CurrencyRateController,
      'setCurrentCurrency',
    );
    const setSelectedCurrencySpy = jest.spyOn(
      Engine.context.AssetsController,
      'setSelectedCurrency',
    );
    const { getByTestId, getByText } = renderGeneralSettings();

    fireEvent.press(getByTestId(GENERAL_SETTINGS_CURRENCY_SELECTOR));
    fireEvent.press(getByText('EUR - Euro'));

    expect(setCurrentCurrencySpy).toHaveBeenCalledWith('eur');
    expect(setSelectedCurrencySpy).toHaveBeenCalledWith('eur');
  });

  itEach([
    { label: 'Polycons', type: AvatarAccountType.Maskicon },
    {
      label: strings('app_settings.jazzicons'),
      type: AvatarAccountType.JazzIcon,
    },
    {
      label: strings('app_settings.blockies'),
      type: AvatarAccountType.Blockies,
    },
  ])('selects the $label account avatar', async ({ label, type }) => {
    const { getByText, store } = renderGeneralSettings();

    fireEvent.press(getByText(label));

    await waitFor(() => {
      expect(store.getState().settings.avatarAccountType).toBe(type);
    });
  });

  it('updates the primary currency preference', async () => {
    const { getByText, store } = renderGeneralSettings();

    fireEvent.press(
      getByText(strings('app_settings.primary_currency_text_second')),
    );

    await waitFor(() => {
      expect(store.getState().settings.primaryCurrency).toBe('Fiat');
    });
  });

  it('updates the zero-balance token preference', async () => {
    const { findByLabelText, store } = renderGeneralSettings();
    const toggle = await findByLabelText(
      strings('app_settings.hide_zero_balance_tokens_title'),
    );

    fireEvent(toggle, 'valueChange', true);

    await waitFor(() => {
      expect(store.getState().settings.hideZeroBalanceTokens).toBe(true);
    });
  });

  it('updates the haptics preference', async () => {
    const { findByLabelText, store } = renderGeneralSettings();
    const toggle = await findByLabelText(
      strings('app_settings.haptic_feedback_title'),
    );

    fireEvent(toggle, 'valueChange', false);

    await waitFor(() => {
      expect(store.getState().settings.hapticsEnabled).toBe(false);
    });
  });
});
