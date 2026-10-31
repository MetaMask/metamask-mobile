import '../../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { act, within } from '@testing-library/react-native';
import { renderComponentViewScreen } from '../../../../../tests/component-view/render';
import { initialStatePredictNext } from '../../../../../tests/component-view/presets/predictNext';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { usePredictAvailability } from '../availability';
import type { PredictConfig } from '../config/predictConfig';
import { ActiveVenueTestIds } from './ActiveVenue.testIds';
import type { PredictVenueControllerState } from './PredictVenueController';
import { PredictImplementationSwitch, useNextVenueId } from '.';
import { usePredictImplementation } from './usePredictImplementation';

const BOTH_VENUES: PredictConfig = {
  enabled: true,
  venues: {
    polymarket: { enabled: true },
    kalshi: { enabled: true },
  },
  venueSelection: { enabled: true },
};

const NO_VENUE_HISTORY: PredictVenueControllerState = {
  venueSelectionPreference: null,
  lastActiveVenue: null,
  sessionDefault: null,
};

const NextRoute = () => (
  <Text testID={ActiveVenueTestIds.ROUTE}>{`next:${useNextVenueId()}`}</Text>
);

/**
 * One screen that reads the Active Venue the three ways the app does: an
 * external entry gate, a public data API's branch, and the root route.
 */
const ActiveVenueProbe = () => {
  const available = usePredictAvailability();
  const implementation = usePredictImplementation();

  return (
    <>
      <Text testID={ActiveVenueTestIds.ENTRY_GATE}>
        {available ? 'shown' : 'hidden'}
      </Text>
      <Text testID={ActiveVenueTestIds.DATA}>
        {implementation.status === 'resolving'
          ? 'resolving'
          : implementation.implementation === 'next'
            ? `next:${implementation.venueId}`
            : 'legacy'}
      </Text>
      <PredictImplementationSwitch
        legacy={<Text testID={ActiveVenueTestIds.ROUTE}>legacy</Text>}
        next={<NextRoute />}
        resolving={<Text testID={ActiveVenueTestIds.ROUTE}>resolving</Text>}
      />
    </>
  );
};

const remoteFeatureFlags = (legacyEnabled: boolean, config: PredictConfig) => ({
  predictTradingEnabled: { enabled: legacyEnabled, minimumVersion: '0.0.1' },
  predictConfig: config,
});

const renderProbe = ({
  venueState = {},
  legacyEnabled = true,
}: {
  venueState?: Partial<PredictVenueControllerState>;
  legacyEnabled?: boolean;
} = {}) =>
  renderComponentViewScreen(
    ActiveVenueProbe,
    { name: 'ActiveVenueProbe' },
    {
      state: initialStatePredictNext()
        .withRemoteFeatureFlags(remoteFeatureFlags(legacyEnabled, BOTH_VENUES))
        .withOverrides({
          engine: {
            backgroundState: {
              PredictVenueController: { ...NO_VENUE_HISTORY, ...venueState },
            },
          },
        })
        .build(),
    },
  );

type ProbeView = ReturnType<typeof renderProbe>;

const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;

/** Publishes a controller's new state to Redux, as the Engine does. */
const publishEngineState = (
  view: ProbeView,
  key: 'PredictVenueController' | 'RemoteFeatureFlagController',
  state: Record<string, unknown>,
) => {
  act(() => {
    engine.state = { ...engine.state, [key]: state };
    view.store.dispatch(updateBgState({ key }));
  });
};

const setVenueState = (
  view: ProbeView,
  venueState: Partial<PredictVenueControllerState>,
) =>
  publishEngineState(view, 'PredictVenueController', {
    ...view.store.getState().engine.backgroundState.PredictVenueController,
    ...venueState,
  });

const setRemoteFeatureFlags = (
  view: ProbeView,
  flags: ReturnType<typeof remoteFeatureFlags>,
) => {
  const current = view.store.getState().engine.backgroundState
    .RemoteFeatureFlagController as Record<string, unknown>;
  publishEngineState(view, 'RemoteFeatureFlagController', {
    ...current,
    remoteFeatureFlags: {
      ...(current.remoteFeatureFlags as Record<string, unknown>),
      ...flags,
    },
  });
};

const expectProbe = (
  view: ProbeView,
  expected: { entryGate: string; data: string; route: string },
) => {
  expect(
    within(view.getByTestId(ActiveVenueTestIds.ENTRY_GATE)).getByText(
      expected.entryGate,
    ),
  ).toBeOnTheScreen();
  expect(
    within(view.getByTestId(ActiveVenueTestIds.DATA)).getByText(expected.data),
  ).toBeOnTheScreen();
  expect(
    within(view.getByTestId(ActiveVenueTestIds.ROUTE)).getByText(
      expected.route,
    ),
  ).toBeOnTheScreen();
};

const KALSHI = {
  entryGate: 'shown',
  data: 'next:kalshi',
  route: 'next:kalshi',
};
const LEGACY = { entryGate: 'shown', data: 'legacy', route: 'legacy' };

describe('Active Venue agreement', () => {
  afterEach(() => {
    engine.state = originalEngineState;
  });

  it('moves the gate, data and route to Kalshi together when a US location latches', () => {
    const view = renderProbe();
    expectProbe(view, {
      entryGate: 'shown',
      data: 'resolving',
      route: 'resolving',
    });

    setVenueState(view, {
      sessionDefault: { venue: 'kalshi', source: 'geolocation' },
    });

    expectProbe(view, KALSHI);
  });

  it('moves the gate, data and route to legacy together when geolocation falls back', () => {
    const view = renderProbe();

    setVenueState(view, {
      sessionDefault: { venue: 'polymarket', source: 'fallback' },
    });

    expectProbe(view, LEGACY);
  });

  it('follows a preference change everywhere, and returns when it is cleared', () => {
    const view = renderProbe({
      venueState: {
        sessionDefault: { venue: 'kalshi', source: 'geolocation' },
      },
    });
    expectProbe(view, KALSHI);

    setVenueState(view, { venueSelectionPreference: 'polymarket' });
    expectProbe(view, LEGACY);

    setVenueState(view, { venueSelectionPreference: null });
    expectProbe(view, KALSHI);
  });

  it('follows a rollout change everywhere within the session', () => {
    const view = renderProbe({
      venueState: {
        sessionDefault: { venue: 'kalshi', source: 'geolocation' },
      },
    });
    expectProbe(view, KALSHI);

    setRemoteFeatureFlags(
      view,
      remoteFeatureFlags(true, {
        ...BOTH_VENUES,
        venues: { ...BOTH_VENUES.venues, kalshi: { enabled: false } },
      }),
    );

    expectProbe(view, LEGACY);
  });

  it('applies the legacy flag to the entry gate only while Polymarket is active', () => {
    const view = renderProbe({
      legacyEnabled: false,
      venueState: {
        sessionDefault: { venue: 'polymarket', source: 'geolocation' },
      },
    });
    expectProbe(view, { entryGate: 'hidden', data: 'legacy', route: 'legacy' });

    setVenueState(view, { venueSelectionPreference: 'kalshi' });

    expectProbe(view, KALSHI);
  });
});
