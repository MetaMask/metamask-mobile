import '../../../../../tests/component-view/mocks';
import React, { useMemo } from 'react';
import { Text } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Button } from '@metamask/design-system-react-native';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';

import { renderComponentViewScreen } from '../../../../../tests/component-view/render';
import { initialStatePredict } from '../../../../../tests/component-view/presets/predict';
import {
  composePredictNextOrderService,
  mockPredictNextMessenger,
  resetPredictNextCatalog,
} from '../../../../../tests/component-view/fixtures/predictNext';
import Engine from '../../../../core/Engine';
import { updateBgState } from '../../../../core/redux/slices/engine';
import { ToastContext } from '../../../../component-library/components/Toast';
import type { ToastRef } from '../../../../component-library/components/Toast/Toast.types';
import { ControllerEventToastBridge } from '../../../Nav/App/ControllerEventToastBridge';
import { usePredictToastRegistrations } from '../../Predict/hooks/usePredictToastRegistrations';
import { KALSHI_VENUE_ID } from '../adapters/remote/KalshiRemoteAdapter';
import type { PredictConfig } from '../config/predictConfig';
import { PredictImplementationSwitch } from '../implementation';
import type { PredictVenueControllerState } from '../implementation/PredictVenueController';
import type { PredictConfiguredVenue } from '../implementation/types';
import type { PredictOrderService } from '../services/PredictOrderService';
import type { PredictDecimal, PredictEntityId } from '../types';
import {
  PredictOrderFlowProvider,
  usePredictOrderFlow,
} from '../views/PredictOrderFlow';
import { PredictOrderFlowTestIds } from '../views/PredictOrderFlow/internal/PredictOrderFlow.testIds';
import { usePredictOrderToastRegistrations } from '.';

/**
 * Notification continuity across Active Venue changes (PRED-1383,
 * PRED-1390). The toast bridge and both Predict registrations are mounted
 * the way App.tsx mounts them: outside the Predict navigator, whatever the
 * Active Venue. The Order sheet is mounted under the real implementation
 * switch, so a Venue change unmounts it the way it does in production.
 */

const BOTH_VENUES: PredictConfig = {
  enabled: true,
  venues: { polymarket: { enabled: true }, kalshi: { enabled: true } },
  venueSelection: { enabled: true },
};

const PROBE_BUTTON = 'order-notification-probe-open';
const LEGACY_HOME = 'order-notification-legacy-home';
const PREVIEW_ID = 'b3c2a1d0-1111-4222-8333-444455556666';

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
const showToast = jest.fn();
const toastRef = {
  current: { showToast, closeToast: jest.fn() },
} as unknown as React.RefObject<ToastRef>;

/** One root for the Order service and the toast bridge, standing in for
 * Engine.controllerMessenger. */
let rootMessenger: Messenger<MockAnyNamespace, never, never>;

/** A $20 buy the device can actually sign: 41 contracts at 0.4651 plus the
 * 2¢/contract fee ceiling is $19.89, inside the approved $20. */
const makePreview = () => ({
  previewId: PREVIEW_ID,
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  requestedAmount: '20.00',
  orderAmount: '19.07',
  estimatedContracts: 41,
  averagePrice: '0.4651',
  limitPrice: '0.4651',
  fee: '0.82',
  feeBreakdown: [
    { source: 'venue', amount: '0.41' },
    { source: 'metamask', amount: '0.41' },
  ],
  totalDebit: '19.89',
  potentialPayout: '41.00',
  potentialProfit: '21.11',
  expiresAt: new Date(Date.now() + 30_000).toISOString(),
});

const filledReceipt = {
  operationId: 'd4e5f6a7-1111-4222-8333-444455556666',
  previewId: PREVIEW_ID,
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  status: 'filled',
  requestedMaxSpend: '20.00',
  quotedContracts: 43,
  venueOrderId: 'venue-order-1',
  filledContracts: '43',
  actualSpend: '20.86',
  averageFillPrice: '0.4651',
  fee: '0.86',
  payoutExposure: '43.00',
};

const jsonResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

/** Serves quotes at once and holds every Commit until the test answers it. */
const stubOrderRoutes = () => {
  const commits: ((body: unknown) => void)[] = [];
  fetchMock.mockImplementation(async (url) => {
    if (/\/orders\/[^/]+\/commit$/u.test(String(url))) {
      return new Promise<Response>((resolve) => {
        commits.push((body) => resolve(jsonResponse(body)));
      });
    }
    return jsonResponse(makePreview());
  });
  return {
    answerCommit: (body: unknown) => commits.shift()?.(body),
    commitCount: () =>
      fetchMock.mock.calls.filter(([url]) =>
        /\/orders\/[^/]+\/commit$/u.test(String(url)),
      ).length,
  };
};

const OrderProbe = () => {
  const { openOrderFlow } = usePredictOrderFlow();
  return (
    <Button
      testID={PROBE_BUTTON}
      onPress={() =>
        openOrderFlow({
          action: 'buy',
          eventId: 'event-1' as PredictEntityId,
          venueId: KALSHI_VENUE_ID,
          marketId: 'KXTEST-26-A' as PredictEntityId,
          side: 'yes',
          outcomeLabel: 'Buffalo Bills',
          eventTitle: 'Buffalo Bills vs. Kansas City Chiefs',
          askPrice: '0.53' as PredictDecimal,
        })
      }
    >
      <Text>Open order flow</Text>
    </Button>
  );
};

/** App.tsx's toast composition, reduced to the two Predict lanes. */
const PredictToasts = () => {
  const legacy = usePredictToastRegistrations();
  const next = usePredictOrderToastRegistrations();
  const registrations = useMemo(() => [...legacy, ...next], [legacy, next]);
  return <ControllerEventToastBridge registrations={registrations} />;
};

const AppShell = () => (
  <ToastContext.Provider value={{ toastRef }}>
    <PredictToasts />
    <PredictImplementationSwitch
      legacy={<Text testID={LEGACY_HOME}>Polymarket</Text>}
      next={
        <PredictOrderFlowProvider>
          <OrderProbe />
        </PredictOrderFlowProvider>
      }
      resolving={null}
    />
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
    { name: 'PredictOrderNotificationsProbe' },
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

/** Writes the Venue Selection Preference the way the picker does. */
const selectVenue = (
  view: ReturnType<typeof renderApp>,
  venue: PredictConfiguredVenue,
) =>
  act(() => {
    engine.state = {
      ...engine.state,
      PredictVenueController: venueState(venue),
    };
    view.store.dispatch(updateBgState({ key: 'PredictVenueController' }));
  });

const toastTitles = (): string[] =>
  showToast.mock.calls.map(
    ([options]: [{ labelOptions: { label: string }[] }]) =>
      options.labelOptions[0].label,
  );

/** Opens the sheet, quotes $20 and approves it: the Commit is on the wire. */
const approveOrder = async () => {
  fireEvent.press(await screen.findByTestId(PROBE_BUTTON));
  await screen.findByTestId(PredictOrderFlowTestIds.SHEET);
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT));
  for (const key of ['2', '0']) {
    fireEvent.press(
      screen.getByTestId(PredictOrderFlowTestIds.KEYPAD_KEY(key)),
    );
  }
  await act(() => new Promise((resolve) => setTimeout(resolve, 600)));
  await waitFor(() =>
    expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
  );
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.REVIEW));
  fireEvent.press(await screen.findByTestId(PredictOrderFlowTestIds.APPROVE));
  await screen.findByTestId(PredictOrderFlowTestIds.SUBMITTING);
};

describe('Predict order notifications across Active Venue changes', () => {
  let orderService: PredictOrderService;

  beforeEach(() => {
    fetchMock.mockReset();
    showToast.mockReset();
    resetPredictNextCatalog();
    mockPredictNextMessenger(() => Promise.resolve(undefined));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    rootMessenger = new Messenger({ namespace: MOCK_ANY_NAMESPACE });
    // The bridge subscribes on Engine.controllerMessenger; route it to the
    // root the services publish on.
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
    orderService = composePredictNextOrderService(rootMessenger);
    (Engine.context as Record<string, unknown>).PredictOrderService =
      orderService;
  });

  afterEach(() => {
    orderService.destroy();
    engine.state = originalEngineState;
    jest.restoreAllMocks();
  });

  it('fires the Kalshi completion notification exactly once after a switch to Polymarket mid-commit', async () => {
    const routes = stubOrderRoutes();
    const view = renderApp('kalshi');
    await approveOrder();

    selectVenue(view, 'polymarket');
    // The Kalshi branch, and the sheet with it, is gone.
    expect(await screen.findByTestId(LEGACY_HOME)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PredictOrderFlowTestIds.SHEET),
    ).not.toBeOnTheScreen();

    await act(async () => {
      routes.answerCommit(filledReceipt);
    });

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    expect(toastTitles()).toEqual(['Order filled']);

    // Nothing is observed or notified again.
    await act(() => new Promise((resolve) => setTimeout(resolve, 700)));
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(routes.commitCount()).toBe(1);
  });

  it('does not repeat a completion the open Order sheet already shows', async () => {
    const routes = stubOrderRoutes();
    renderApp('kalshi');
    await approveOrder();

    await act(async () => {
      routes.answerCommit(filledReceipt);
    });

    expect(
      await screen.findByTestId(PredictOrderFlowTestIds.RECEIPT_FILLED),
    ).toBeOnTheScreen();
    expect(showToast).not.toHaveBeenCalled();
  });

  it('still toasts a pending Polymarket completion after switching to Kalshi', async () => {
    stubOrderRoutes();
    const view = renderApp('polymarket');
    expect(await screen.findByTestId(LEGACY_HOME)).toBeOnTheScreen();

    selectVenue(view, 'kalshi');
    expect(await screen.findByTestId(PROBE_BUTTON)).toBeOnTheScreen();

    // The legacy controller reports the Order it was already working on.
    act(() => {
      (
        rootMessenger as unknown as {
          publish: (event: string, payload: unknown) => void;
        }
      ).publish('PredictController:transactionStatusChanged', {
        type: 'order',
        status: 'confirmed',
        senderAddress: '0x0000000000000000000000000000000000000001',
        marketId: 'polymarket-market-1',
      });
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(toastTitles()).toEqual(['Prediction placed']);
  });
});
