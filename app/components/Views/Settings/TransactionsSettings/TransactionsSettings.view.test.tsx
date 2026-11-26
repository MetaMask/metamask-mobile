import '../../../../tests/component-view/mocks';
import { Linking } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import {
  renderTransactionsSettings,
  renderTransactionsSettingsWithBackRoute,
  SETTINGS_LAUNCHER_LABEL,
} from '../../../../tests/component-view/renderers/settings';
import { describeForPlatforms } from '../../../../tests/component-view/platform';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import Engine from '../../../core/Engine';
import { TransactionsViewSelectorsIDs } from './TransactionsSettings.testIds';

const getSwitchValue = (switchElement: ReactTestInstance) =>
  switchElement.props.value ?? switchElement.props.on;

describeForPlatforms('Transactions Settings component view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns to the previous screen from the header', async () => {
    const { findByTestId, getByText, queryByTestId } =
      renderTransactionsSettingsWithBackRoute();

    fireEvent.press(getByText(SETTINGS_LAUNCHER_LABEL));
    fireEvent.press(
      await findByTestId(TransactionsViewSelectorsIDs.BACK_BUTTON),
    );

    await waitFor(() => {
      expect(
        queryByTestId(TransactionsViewSelectorsIDs.BACK_BUTTON),
      ).not.toBeOnTheScreen();
    });
    expect(getByText(SETTINGS_LAUNCHER_LABEL)).toBeOnTheScreen();
  });

  it('disables smart transactions', async () => {
    const setOptInStatusSpy = jest.spyOn(
      Engine.context.PreferencesController,
      'setSmartTransactionsOptInStatus',
    );
    const { findByTestId } = renderTransactionsSettings();

    fireEvent(
      await findByTestId(TransactionsViewSelectorsIDs.STX_OPT_IN_SWITCH),
      'valueChange',
      false,
    );

    expect(setOptInStatusSpy).toHaveBeenCalledWith(false);
  });

  it('opens the smart transactions information page', async () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValueOnce(undefined);
    const { findByText } = renderTransactionsSettings();

    fireEvent.press(
      await findByText(strings('app_settings.smart_transactions_learn_more')),
    );

    expect(openUrlSpy).toHaveBeenCalledWith(AppConstants.URLS.SMART_TXS);
  });

  it('updates the show hex data switch in the store', async () => {
    const { findByTestId } = renderTransactionsSettings();
    const hexSwitch = await findByTestId(
      TransactionsViewSelectorsIDs.SHOW_HEX_DATA_SWITCH,
    );
    expect(getSwitchValue(hexSwitch)).toBe(true);

    fireEvent(hexSwitch, 'valueChange', false);

    await waitFor(async () => {
      expect(
        getSwitchValue(
          await findByTestId(TransactionsViewSelectorsIDs.SHOW_HEX_DATA_SWITCH),
        ),
      ).toBe(false);
    });
  });
});
