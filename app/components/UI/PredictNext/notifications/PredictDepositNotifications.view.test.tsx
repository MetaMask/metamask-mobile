import '../../../../../tests/component-view/mocks';
import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { act, screen } from '@testing-library/react-native';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';

import { routeControllerMessengerEventsTo } from '../../../../../tests/component-view/fixtures/predictNext';
import { renderPredictToastShell } from '../../../../../tests/component-view/renderers/predictNext';
import { usePredictToastRegistrations } from '../../Predict/hooks/usePredictToastRegistrations';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import cancelled from '../contracts/v1/fixtures/funding-contract/cancelled.json';
import credited from '../contracts/v1/fixtures/funding-contract/credited.json';
import needsReview from '../contracts/v1/fixtures/funding-contract/needs-review.json';
import { makeFailedDeposit } from '../funding/deposit/testUtils';
import type { PredictConfiguredVenue } from '../implementation/types';
import {
  usePredictDepositToastRegistrations,
  usePredictOrderToastRegistrations,
} from '.';

let rootMessenger: Messenger<MockAnyNamespace, never, never>;
let restoreControllerEvents: (() => void) | undefined;
let latestShell: ReturnType<typeof renderPredictToastShell> | undefined;

const useRegistrations = () => {
  const legacy = usePredictToastRegistrations();
  const orders = usePredictOrderToastRegistrations();
  const deposits = usePredictDepositToastRegistrations();
  return useMemo(
    () => [...legacy, ...orders, ...deposits],
    [legacy, orders, deposits],
  );
};

const renderApp = (venue: PredictConfiguredVenue = 'kalshi') => {
  latestShell = renderPredictToastShell({
    useRegistrations,
    screen: <Text testID="arbitrary-open-screen">Wallet home</Text>,
    venue,
    name: 'PredictDepositNotificationsProbe',
  });
  return latestShell;
};

const publishEvent = (event: string, payload: unknown) => {
  act(() => {
    (
      rootMessenger as unknown as {
        publish: (name: string, data: unknown) => void;
      }
    ).publish(event, payload);
  });
};

describe('Predict deposit completion notifications', () => {
  beforeEach(() => {
    rootMessenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
    restoreControllerEvents = routeControllerMessengerEventsTo(rootMessenger);
  });

  afterEach(() => {
    restoreControllerEvents?.();
    restoreControllerEvents = undefined;
    latestShell?.restoreEngineState();
    latestShell = undefined;
    jest.restoreAllMocks();
  });

  it('shows the completion toast on any open screen when a deposit completes', async () => {
    const view = renderApp('kalshi');
    expect(
      await screen.findByTestId('arbitrary-open-screen'),
    ).toBeOnTheScreen();

    // Switch Active Venue away from Kalshi; toast still fires on whichever screen is open.
    view.selectVenue('polymarket');

    publishEvent('PredictFundingService:depositResolved', {
      venueId: KALSHI_VENUE_ID,
      deposit: credited,
    });

    expect(view.showToast).toHaveBeenCalledTimes(1);
    expect(view.toastLabels()).toEqual([
      ['Deposit complete', '\n', '$25.50 is ready to trade.'],
    ]);
  });

  it('does not toast failed, cancelled, or under_review deposit resolutions', async () => {
    const view = renderApp('kalshi');
    expect(
      await screen.findByTestId('arbitrary-open-screen'),
    ).toBeOnTheScreen();

    for (const deposit of [makeFailedDeposit(), cancelled, needsReview]) {
      publishEvent('PredictFundingService:depositResolved', {
        venueId: KALSHI_VENUE_ID,
        deposit,
      });
    }

    expect(view.showToast).not.toHaveBeenCalled();
  });

  it('keeps legacy Polymarket notifications working alongside deposit notifications', async () => {
    const view = renderApp('kalshi');
    expect(
      await screen.findByTestId('arbitrary-open-screen'),
    ).toBeOnTheScreen();

    publishEvent('PredictController:transactionStatusChanged', {
      type: 'order',
      status: 'confirmed',
      senderAddress: '0x0000000000000000000000000000000000000001',
      marketId: 'polymarket-market-1',
    });

    expect(view.showToast).toHaveBeenCalledTimes(1);
    expect(view.toastTitles()[0]).toBe('Prediction placed');
  });
});
