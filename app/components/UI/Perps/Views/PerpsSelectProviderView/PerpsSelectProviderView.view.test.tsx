/**
 * Component view tests for PerpsSelectProviderView.
 * State-driven via Redux (initialStatePerps); no hook/selector mocks.
 */
import '../../../../../util/test/component-view/mocks';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { renderPerpsSelectProviderView } from '../../../../../util/test/component-view/renderers/perpsViewRenderer';

const myxEnabledOverrides = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          perpsMyxProviderEnabled: {
            enabled: true,
            featureVersion: null,
            minimumVersion: null,
          },
        },
      },
    },
  },
};

describe('PerpsSelectProviderView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders provider selector sheet with title and HyperLiquid option', async () => {
    renderPerpsSelectProviderView();

    expect(await screen.findByTestId('perps-select-provider-sheet')).toBeOnTheScreen();
    expect(screen.getByText(strings('perps.provider_selector.title'))).toBeOnTheScreen();
    expect(
      screen.getByTestId('perps-select-provider-sheet-option-hyperliquid'),
    ).toBeOnTheScreen();
  });

  it('hides MYX option when MYX provider feature flag is disabled', async () => {
    renderPerpsSelectProviderView();

    expect(await screen.findByTestId('perps-select-provider-sheet')).toBeOnTheScreen();
    expect(
      screen.queryByTestId('perps-select-provider-sheet-option-myx'),
    ).not.toBeOnTheScreen();
  });

  it('maps aggregated active provider to HyperLiquid selected state', async () => {
    renderPerpsSelectProviderView({
      overrides: {
        ...myxEnabledOverrides,
        engine: {
          backgroundState: {
            ...myxEnabledOverrides.engine.backgroundState,
            PerpsController: {
              activeProvider: 'aggregated',
            },
          },
        },
      },
    });

    expect(
      await screen.findByTestId('perps-select-provider-sheet-check-hyperliquid'),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId('perps-select-provider-sheet-check-myx'),
    ).not.toBeOnTheScreen();
  });

  it('calls switchProvider when MYX provider is selected', async () => {
    const switchProviderMock = Engine.context.PerpsController
      .switchProvider as jest.Mock;

    renderPerpsSelectProviderView({ overrides: myxEnabledOverrides });

    const myxOption = await screen.findByTestId(
      'perps-select-provider-sheet-option-myx',
    );
    fireEvent.press(myxOption);

    await waitFor(() => {
      expect(switchProviderMock).toHaveBeenCalledWith('myx');
    });
  });
});
