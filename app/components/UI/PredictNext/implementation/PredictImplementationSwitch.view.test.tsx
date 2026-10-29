import '../../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { renderComponentViewScreen } from '../../../../../tests/component-view/render';
import { initialStatePredictNext } from '../../../../../tests/component-view/presets/predictNext';
import { PredictImplementationSwitch } from './PredictImplementationSwitch';

const LEGACY_BRANCH = 'implementation-switch-legacy';
const NEXT_BRANCH = 'implementation-switch-next';
const RESOLVING_BRANCH = 'implementation-switch-resolving';

const SwitchProbe = () => (
  <PredictImplementationSwitch
    legacy={<Text testID={LEGACY_BRANCH}>legacy</Text>}
    next={<Text testID={NEXT_BRANCH}>next</Text>}
    resolving={<Text testID={RESOLVING_BRANCH}>resolving</Text>}
  />
);

const renderSwitch = (venues: { polymarket: boolean; kalshi: boolean }) =>
  renderComponentViewScreen(
    SwitchProbe,
    { name: 'PredictImplementationSwitchProbe' },
    {
      state: initialStatePredictNext()
        .withRemoteFeatureFlags({
          predictConfig: {
            enabled: true,
            venues: {
              polymarket: { enabled: venues.polymarket },
              kalshi: { enabled: venues.kalshi },
            },
            venueSelection: { enabled: false },
          },
        })
        .build(),
    },
  );

describe('PredictImplementationSwitch', () => {
  it('mounts only the next branch for a Kalshi-only rollout', async () => {
    const view = renderSwitch({ polymarket: false, kalshi: true });

    expect(await view.findByTestId(NEXT_BRANCH)).toBeOnTheScreen();
    expect(view.queryByTestId(LEGACY_BRANCH)).not.toBeOnTheScreen();
    expect(view.queryByTestId(RESOLVING_BRANCH)).not.toBeOnTheScreen();
  });

  it('mounts only the legacy branch while Polymarket is enabled', async () => {
    const view = renderSwitch({ polymarket: true, kalshi: true });

    expect(await view.findByTestId(LEGACY_BRANCH)).toBeOnTheScreen();
    expect(view.queryByTestId(NEXT_BRANCH)).not.toBeOnTheScreen();
    expect(view.queryByTestId(RESOLVING_BRANCH)).not.toBeOnTheScreen();
  });
});
