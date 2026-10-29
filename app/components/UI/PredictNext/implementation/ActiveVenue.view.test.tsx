import '../../../../../tests/component-view/mocks';
import React from 'react';
import { Text } from 'react-native';
import { renderComponentViewScreen } from '../../../../../tests/component-view/render';
import { initialStatePredictNext } from '../../../../../tests/component-view/presets/predictNext';
import { usePredictAvailability } from '../availability';
import type { PredictVenueControllerState } from './PredictVenueController';
import { PredictImplementationSwitch, useNextVenueId } from '.';
import { usePredictImplementation } from './usePredictImplementation';

const ENTRY_GATE = 'active-venue-entry-gate';
const DATA = 'active-venue-data';
const ROUTE = 'active-venue-route';

const NextRoute = () => (
  <Text testID={ROUTE}>{`next:${useNextVenueId()}`}</Text>
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
      <Text testID={ENTRY_GATE}>{available ? 'shown' : 'hidden'}</Text>
      <Text testID={DATA}>
        {implementation.status === 'resolving'
          ? 'resolving'
          : implementation.implementation === 'next'
            ? `next:${implementation.venueId}`
            : 'legacy'}
      </Text>
      <PredictImplementationSwitch
        legacy={<Text testID={ROUTE}>legacy</Text>}
        next={<NextRoute />}
        resolving={<Text testID={ROUTE}>resolving</Text>}
      />
    </>
  );
};

const renderProbe = ({
  venueState,
  legacyEnabled = true,
}: {
  venueState: Partial<PredictVenueControllerState>;
  legacyEnabled?: boolean;
}) =>
  renderComponentViewScreen(
    ActiveVenueProbe,
    { name: 'ActiveVenueProbe' },
    {
      state: initialStatePredictNext()
        .withRemoteFeatureFlags({
          predictTradingEnabled: {
            enabled: legacyEnabled,
            minimumVersion: '0.0.1',
          },
          predictConfig: {
            enabled: true,
            venues: {
              polymarket: { enabled: true },
              kalshi: { enabled: true },
            },
            venueSelection: { enabled: true },
          },
        })
        .withOverrides({
          engine: {
            backgroundState: {
              PredictVenueController: {
                venueSelectionPreference: null,
                lastActiveVenue: null,
                sessionDefault: null,
                ...venueState,
              },
            },
          },
        })
        .build(),
    },
  );

const readProbe = (view: ReturnType<typeof renderProbe>) => ({
  entryGate: view.getByTestId(ENTRY_GATE).props.children,
  data: view.getByTestId(DATA).props.children,
  route: view.getByTestId(ROUTE).props.children,
});

describe('Active Venue agreement', () => {
  it('serves Kalshi everywhere for a US location', () => {
    const view = renderProbe({
      venueState: {
        sessionDefault: { venue: 'kalshi', source: 'geolocation' },
      },
    });

    expect(readProbe(view)).toEqual({
      entryGate: 'shown',
      data: 'next:kalshi',
      route: 'next:kalshi',
    });
  });

  it('serves legacy Polymarket everywhere for a non-US location', () => {
    const view = renderProbe({
      venueState: {
        sessionDefault: { venue: 'polymarket', source: 'geolocation' },
      },
    });

    expect(readProbe(view)).toEqual({
      entryGate: 'shown',
      data: 'legacy',
      route: 'legacy',
    });
  });

  it('lets a preference override a US location everywhere', () => {
    const view = renderProbe({
      venueState: {
        venueSelectionPreference: 'polymarket',
        sessionDefault: { venue: 'kalshi', source: 'geolocation' },
      },
    });

    expect(readProbe(view)).toEqual({
      entryGate: 'shown',
      data: 'legacy',
      route: 'legacy',
    });
  });

  it('hides the entry gate with the legacy flag only while Polymarket is active', () => {
    const polymarket = readProbe(
      renderProbe({
        legacyEnabled: false,
        venueState: {
          sessionDefault: { venue: 'polymarket', source: 'fallback' },
        },
      }),
    );
    const kalshi = readProbe(
      renderProbe({
        legacyEnabled: false,
        venueState: {
          sessionDefault: { venue: 'kalshi', source: 'lastActiveVenue' },
        },
      }),
    );

    expect(polymarket).toEqual({
      entryGate: 'hidden',
      data: 'legacy',
      route: 'legacy',
    });
    expect(kalshi).toEqual({
      entryGate: 'shown',
      data: 'next:kalshi',
      route: 'next:kalshi',
    });
  });

  it('holds the data and the route while geolocation is pending', () => {
    const view = renderProbe({ venueState: { sessionDefault: null } });

    expect(readProbe(view)).toEqual({
      entryGate: 'shown',
      data: 'resolving',
      route: 'resolving',
    });
  });
});
