import '../../../../../tests/component-view/mocks';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderAdvancedSettings } from '../../../../../tests/component-view/renderers/settings';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { strings } from '../../../../../locales/i18n';
import AppConstants from '../../../../core/AppConstants';
import Routes from '../../../../constants/navigation/Routes';

describeForPlatforms('Advanced Settings component view', () => {
  it('opens the smart transactions information page', async () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);
    const { getByText } = renderAdvancedSettings();

    fireEvent.press(
      getByText(strings('app_settings.smart_transactions_learn_more')),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(AppConstants.URLS.SMART_TXS);
    openUrlSpy.mockRestore();
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
