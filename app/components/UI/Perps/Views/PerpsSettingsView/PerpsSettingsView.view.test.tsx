/**
 * Component view tests for Perps settings.
 * The default-exchange row is shown only while Lighter can be chosen.
 */
import '../../../../../../tests/component-view/mocks';

import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { renderPerpsSettingsView } from '../../../../../../tests/component-view/renderers/perpsViewRenderer';
import {
  PerpsDefaultExchangeSheetSelectorsIDs,
  PerpsSettingsViewSelectorsIDs,
} from '../../Perps.testIds';

const lighterFlag = {
  enabled: true,
  minimumVersion: '0.0.0',
};

const settingsState = (
  lighterEnabled: boolean,
  perps: Record<string, unknown> = {},
): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      PerpsController: {
        isEligible: true,
        isFirstTimeUser: { mainnet: false, testnet: false },
        ...perps,
      },
      ...(lighterEnabled
        ? {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                perpsLighterProviderEnabled: lighterFlag,
              },
            },
          }
        : {}),
    },
  },
});

describe('PerpsSettingsView', () => {
  afterEach(() => {
    delete (
      Engine.context.PerpsController as { setDefaultProvider?: jest.Mock }
    ).setDefaultProvider;
    cleanup();
  });

  it('shows Hyperliquid until the user saves a default exchange', async () => {
    renderPerpsSettingsView({ overrides: settingsState(true) });

    expect(
      await screen.findByTestId(PerpsSettingsViewSelectorsIDs.DEFAULT_EXCHANGE),
    ).toHaveTextContent(/HyperLiquid/);
    expect(
      screen.getByTestId(PerpsSettingsViewSelectorsIDs.SAVE),
    ).toBeOnTheScreen();
  });

  it('shows the saved default exchange', async () => {
    renderPerpsSettingsView({
      overrides: settingsState(true, {
        defaultProvider: 'lighter',
        hasExplicitDefaultProviderSelection: true,
      }),
    });

    expect(
      await screen.findByTestId(PerpsSettingsViewSelectorsIDs.DEFAULT_EXCHANGE),
    ).toHaveTextContent(/Lighter/);
  });

  it('hides the default exchange row when Lighter is off', async () => {
    renderPerpsSettingsView({ overrides: settingsState(false) });

    expect(
      await screen.findByTestId(PerpsSettingsViewSelectorsIDs.SUPPORT_BUTTON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PerpsSettingsViewSelectorsIDs.DEFAULT_EXCHANGE),
    ).toBeNull();
  });

  it('saves the chosen default exchange from the sheet', async () => {
    const setDefaultProvider = jest.fn().mockReturnValue({
      success: true,
      defaultProvider: 'lighter',
    });
    const perpsController = Engine.context.PerpsController as {
      setDefaultProvider?: jest.Mock;
    };
    perpsController.setDefaultProvider = setDefaultProvider;

    renderPerpsSettingsView({ overrides: settingsState(true) });

    expect(
      await screen.findByTestId(PerpsSettingsViewSelectorsIDs.DEFAULT_EXCHANGE),
    ).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(PerpsSettingsViewSelectorsIDs.DEFAULT_EXCHANGE),
    );

    const lighterOptionId = `${PerpsDefaultExchangeSheetSelectorsIDs.OPTION}-lighter`;
    expect(await screen.findByTestId(lighterOptionId)).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(lighterOptionId));
    fireEvent.press(
      screen.getByTestId(PerpsDefaultExchangeSheetSelectorsIDs.SAVE),
    );

    expect(setDefaultProvider).toHaveBeenCalledWith('lighter');
    await waitFor(() => {
      expect(
        screen.queryByTestId(PerpsDefaultExchangeSheetSelectorsIDs.SHEET),
      ).toBeNull();
    });
  });
});
