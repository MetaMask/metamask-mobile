import '../../../../../tests/component-view/mocks';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderGeneralSettings } from '../../../../../tests/component-view/renderers/settings';
import {
  describeForPlatforms,
  itEach,
} from '../../../../../tests/component-view/platform';
import { strings } from '../../../../../locales/i18n';
import { AvatarAccountType } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount';

describeForPlatforms('General Settings component view', () => {
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
