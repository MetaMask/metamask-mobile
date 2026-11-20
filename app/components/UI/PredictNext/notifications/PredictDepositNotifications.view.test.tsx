import '../../../../../tests/component-view/mocks';
import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';

import { renderComponentViewScreen } from '../../../../../tests/component-view/render';
import { initialStatePredict } from '../../../../../tests/component-view/presets/predict';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { ToastContext } from '../../../../component-library/components/Toast';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import { ControllerEventToastBridge } from '../../../Nav/App/ControllerEventToastBridge';
import { usePredictToastRegistrations } from '../../Predict/hooks/usePredictToastRegistrations';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import type { PredictConfig } from '../config/predictConfig';
import cancelled from '../contracts/v1/fixtures/funding-contract/cancelled.json';
import credited from '../contracts/v1/fixtures/funding-contract/credited.json';
import needsReview from '../contracts/v1/fixtures/funding-contract/needs-review.json';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';
import type { PredictConfiguredVenue } from '../implementation/types';
import {
  usePredictDepositToastRegistrations,
  usePredictOrderToastRegistrations,
} from '.';

const BOTH_VENUES: PredictConfig = {
  enabled: true,
  venues: { polymarket: { enabled: true }, kalshi: { enabled: true } },
  venueSelection: { enabled: true },
};

const showToast = jest.fn();
const toastRef = {
  current: { showToast, closeToast: jest.fn() },
} as unknown as React.RefObject<ToastRef>;

let rootMessenger: Messenger<MockAnyNamespace, never, never>;

/** App.tsx's toast composition across legacy, order, and deposit lanes. */
const PredictToasts = () => {
  const legacy = usePredictToastRegistrations();
  const orders = usePredictOrderToastRegistrations();
  const deposits = usePredictDepositToastRegistrations();
  const registrations = useMemo(
    () => [...legacy, ...orders, ...deposits],
    [legacy, orders, deposits],
  );
  return <ControllerEventToastBridge registrations={registrations} />;
};

const AppShell = () => (
  <ToastContext.Provider value={{ toastRef }}>
    <PredictToasts />
    <Text testID="arbitrary-open-screen">Wallet home</Text>
  </ToastContext.Provider>
);

const venueState = (
  venue: PredictConfiguredVenue,
): PredictVenueControllerState => ({
  venueSelectionPreference: venue,
  lastActiveVenue: venue,
  sessionDefault: null,
});

const renderApp = (venue: PredictConfiguredVenue) =>
  renderComponentViewScreen(
    AppShell,
    { name: 'PredictDepositNotificationsProbe' },
    {
      state: initialStatePredict()
        .withRemoteFeatureFlags({ predictConfig: BOTH_VENUES })
        .withOverrides({
          engine: {
            backgroundState: { PredictVenueController: venueState(venue) },
          },
        })
        .build(),
    },
  );

const engine = Engine as unknown as { state: Record<string, unknown> };
const originalEngineState = engine.state;

const publishEvent = (event: string, payload: unknown) => {
  act(() => {
    (
      rootMessenger as unknown as {
        publish: (name: string, data: unknown) => void;
      }
    ).publish(event, payload);
  });
};

const toastLabels = (): string[][] =>
  showToast.mock.calls.map(
    ([options]: [{ labelOptions: { label: string }[] }]) =>
      options.labelOptions.map((item) => item.label),
  );

describe('Predict deposit completion notifications', () => {
  beforeEach(() => {
    showToast.mockReset();
    rootMessenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
    const controllerMessenger = Engine.controllerMessenger as unknown as {
      subscribe: jest.Mock;
      unsubscribe: jest.Mock;
    };
    controllerMessenger.subscribe.mockImplementation(
      (event: string, handler: () => void) =>
        (
          rootMessenger as unknown as {
            subscribe: (e: string, h: () => void) => void;
          }
        ).subscribe(event, handler),
    );
    controllerMessenger.unsubscribe.mockImplementation(
      (event: string, handler: () => void) =>
        (
          rootMessenger as unknown as {
            unsubscribe: (e: string, h: () => void) => void;
          }
        ).unsubscribe(event, handler),
    );
  });

  afterEach(() => {
    engine.state = originalEngineState;
    jest.restoreAllMocks();
  });

  it('shows the completion toast on any open screen when a deposit completes', async () => {
    const view = renderApp('kalshi');
    expect(
      await screen.findByTestId('arbitrary-open-screen'),
    ).toBeOnTheScreen();

    // Switch Active Venue away from Kalshi; toast still fires on whichever screen is open.
    act(() => {
      engine.state = {
        ...engine.state,
        PredictVenueController: venueState('polymarket'),
      };
      view.store.dispatch(updateBgState({ key: 'PredictVenueController' }));
    });

    publishEvent('PredictFundingService:depositResolved', {
      venueId: KALSHI_VENUE_ID,
      deposit: credited,
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(toastLabels()).toEqual([
      ['Deposit complete', '\n', '$25.50 is ready to trade.'],
    ]);
  });

  it('does not toast failed, cancelled, or under_review deposit resolutions', async () => {
    renderApp('kalshi');
    expect(
      await screen.findByTestId('arbitrary-open-screen'),
    ).toBeOnTheScreen();

    for (const deposit of [
      { ...cancelled, status: 'failed', next: null },
      cancelled,
      needsReview,
    ]) {
      publishEvent('PredictFundingService:depositResolved', {
        venueId: KALSHI_VENUE_ID,
        deposit,
      });
    }

    expect(showToast).not.toHaveBeenCalled();
  });

  it('keeps legacy Polymarket notifications working alongside deposit notifications', async () => {
    renderApp('kalshi');
    expect(
      await screen.findByTestId('arbitrary-open-screen'),
    ).toBeOnTheScreen();

    publishEvent('PredictController:transactionStatusChanged', {
      type: 'order',
      status: 'confirmed',
      senderAddress: '0x0000000000000000000000000000000000000001',
      marketId: 'polymarket-market-1',
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(toastLabels()[0][0]).toBe('Prediction placed');
  });
});
