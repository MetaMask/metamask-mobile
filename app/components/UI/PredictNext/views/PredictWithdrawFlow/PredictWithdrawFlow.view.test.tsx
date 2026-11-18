import '../../../../../../tests/component-view/mocks';
import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';

import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import { strings } from '../../../../../../locales/i18n';
import {
  composePredictNextFundingService,
  configurePredictNextCatalog,
  mockPredictNextMessenger,
  resetPredictNextCatalog,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import Engine from '../../../../../core/Engine';
import { KALSHI_STATIC_VENUE_CATALOG } from '../../config/venueCatalogs';
import type { PredictFundingService } from '../../services/PredictFundingService';
import { PredictAmountEntryTestIds } from '../../components/PredictAmountEntry';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictWithdrawFlowTestIds } from './internal/PredictWithdrawFlow.testIds';

const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const DESTINATION_ADDRESS = '0xcDe7CE585799F1FCA8a37C7599935ea275819B9c';
const PREVIEW_ID = 'b3c2a1d0-1111-4222-8333-444455556666';
/** A quote the screen obtains after the first one expires. */
const FRESH_PREVIEW_ID = 'e7f8a9b0-2222-4333-8444-555566667777';

const PREVIEW_URL = /\/withdrawals\/preview$/u;
const COMMIT_URL = /\/withdrawals\/([^/]+)\/commit$/u;
const OBSERVE_URL = /\/withdrawals\/[0-9a-f-]{36}$/u;

const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

interface FetchReply {
  status?: number;
  body: unknown;
}

const previewOf = (overrides: Record<string, unknown> = {}) => ({
  previewId: PREVIEW_ID,
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  requestedAmount: '5.00',
  destination: {
    address: DESTINATION_ADDRESS,
    network: 'base',
    source: 'configured_demo',
  },
  expiresAt: new Date(Date.now() + 30_000).toISOString(),
  ...overrides,
});

const receiptOf = (overrides: Record<string, unknown> = {}) => ({
  operationId: 'd4e5f6a7-1111-4222-8333-444455556666',
  previewId: PREVIEW_ID,
  venueId: 'kalshi',
  currency: 'USD',
  mode: 'fixed',
  status: 'processing',
  needsManualReview: false,
  requestedAmount: '5.00',
  withdrawnAmount: null,
  venueTransferId: null,
  destination: {
    address: DESTINATION_ADDRESS,
    network: 'base',
    source: 'configured_demo',
  },
  createdAt: new Date().toISOString(),
  resolvedAt: null,
  ...overrides,
});

const reply = ({ status = 200, body }: FetchReply): Response => {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
  response.clone = () => response;
  return response;
};

/** The withdrawal routes only: preview, commit, and the receipt read. */
const stubWithdrawals = ({
  preview = () => ({ body: previewOf() }),
  commit = () => ({ status: 201, body: receiptOf() }),
  observe = () => ({ body: receiptOf() }),
}: {
  preview?: (body: { amount?: string; sweepAll?: true }) => FetchReply;
  commit?: () => FetchReply;
  observe?: () => FetchReply;
} = {}) => {
  fetchMock.mockImplementation(async (url, init) => {
    const href = String(url);
    if (PREVIEW_URL.test(href)) {
      const body = JSON.parse(String(init?.body)) as {
        amount?: string;
        sweepAll?: true;
      };
      return reply(preview(body));
    }
    if (COMMIT_URL.test(href)) {
      return reply(commit());
    }
    if (OBSERVE_URL.test(href) && init?.method === 'GET') {
      return reply(observe());
    }
    return reply({ status: 404, body: { code: 'not_found' } });
  });
};

const previewBodies = (): { amount?: string; sweepAll?: true }[] =>
  fetchMock.mock.calls
    .filter(([url]) => PREVIEW_URL.test(String(url)))
    .map(([, init]) =>
      init?.body
        ? (JSON.parse(String(init.body)) as {
            amount?: string;
            sweepAll?: true;
          })
        : {},
    );

const commitBodies = (): unknown[] =>
  fetchMock.mock.calls
    .filter(([url]) => COMMIT_URL.test(String(url)))
    .map(([, init]) =>
      init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    );

/** The Preview each Commit referenced, read from its `/withdrawals/:id/commit`
 * route, so a replay of an expired quote is visible. */
const commitPreviewIds = (): string[] =>
  fetchMock.mock.calls
    .map(([url]) => COMMIT_URL.exec(String(url)))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => match[1]);

/** Home's Balance read, which is what the screen validates against. */
const stubBalance = (available = '12.34') =>
  mockPredictNextMessenger((action: string) => {
    if (action === 'PredictPortfolioService:getBalance') {
      return Promise.resolve({
        venueId: 'kalshi',
        currency: 'USD',
        available,
      });
    }
    if (action === 'PredictPortfolioService:invalidateQueries') {
      return Promise.resolve(undefined);
    }
    return Promise.resolve(undefined);
  });

const openWithdrawFlow = async () => {
  fireEvent.press(await screen.findByTestId(PredictHomeTestIds.WITHDRAW));
  await screen.findByTestId(PredictWithdrawFlowTestIds.SCREEN);
};

const typeAmount = (amount: string) => {
  for (const key of amount) {
    fireEvent.press(
      screen.getByTestId(PredictAmountEntryTestIds.KEYPAD_KEY(key)),
    );
  }
};

/** `Engine.context` types stateless services as optional, so the composed
 * instance is read through one named narrowing rather than an inline cast. */
const fundingServiceContext = (): {
  PredictFundingService: PredictFundingService;
} =>
  Engine.context as unknown as { PredictFundingService: PredictFundingService };

const withdrawService = (): PredictFundingService =>
  fundingServiceContext().PredictFundingService;

describe('PredictWithdrawFlow', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    // React Native's jest AppState stands in as a jest.fn, which no service
    // reads as foreground; observation only runs while the app is active.
    AppState.currentState = 'active';
    resetPredictNextCatalog();
    stubBalance();
    stubWithdrawals();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    (Engine.context as Record<string, unknown>).PredictFundingService =
      composePredictNextFundingService();
  });

  afterEach(() => {
    // Observation must not outlive its test.
    withdrawService().destroy();
    netInfoMock.__resetMockNetInfo();
    jest.restoreAllMocks();
  });

  it('quotes a fixed amount and commits it by preview id only', async () => {
    stubWithdrawals({
      commit: () => ({
        status: 201,
        body: receiptOf({
          status: 'settled',
          withdrawnAmount: '5.00',
          resolvedAt: new Date().toISOString(),
        }),
      }),
    });

    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('5.00');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));

    await screen.findByTestId(PredictWithdrawFlowTestIds.CONFIRM);
    expect(previewBodies()).toEqual([{ amount: '5.00' }]);

    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONFIRM));

    expect(
      await screen.findByTestId(PredictWithdrawFlowTestIds.STATUS_AMOUNT),
    ).toHaveTextContent('$5.00');
    // The Commit carries no identity, destination, or idempotency key.
    expect(commitBodies()).toEqual([{}]);
  });

  it('rejects an amount below the one dollar minimum without calling the backend', async () => {
    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('0.50');

    expect(
      screen.getByTestId(PredictWithdrawFlowTestIds.AMOUNT_ERROR),
    ).toHaveTextContent('The minimum withdrawal is $1.00.');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));

    await act(async () => undefined);
    expect(previewBodies()).toEqual([]);
  });

  it('rejects an amount above the available balance without calling the backend', async () => {
    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('20.00');

    expect(
      screen.getByTestId(PredictWithdrawFlowTestIds.AMOUNT_ERROR),
    ).toHaveTextContent('Enter an amount within your available balance.');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));

    await act(async () => undefined);
    expect(previewBodies()).toEqual([]);
  });

  it('sends a trailing-dot amount without the dot', async () => {
    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('5.');

    expect(
      screen.queryByTestId(PredictWithdrawFlowTestIds.AMOUNT_ERROR),
    ).not.toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));

    await screen.findByTestId(PredictWithdrawFlowTestIds.CONFIRM);
    expect(previewBodies()).toEqual([{ amount: '5' }]);
  });

  it('shows the destination read-only with the sandbox wallet notice', async () => {
    renderPredictNext();
    await openWithdrawFlow();
    // The payout account is the Venue's, so the entry step names it and
    // offers nothing to change.
    expect(
      screen.getByTestId(PredictWithdrawFlowTestIds.RECEIVE_VALUE),
    ).toHaveTextContent('Sandbox wallet');
    typeAmount('5.00');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));

    expect(
      await screen.findByTestId(PredictWithdrawFlowTestIds.DESTINATION),
    ).toHaveTextContent('0xcDe7…9B9c');
    expect(
      screen.getByTestId(PredictWithdrawFlowTestIds.SANDBOX_NOTICE),
    ).toBeOnTheScreen();
    expect(
      within(
        screen.getByTestId(PredictWithdrawFlowTestIds.NETWORK_VALUE),
      ).getByText('Base'),
    ).toBeOnTheScreen();
    // There is no edit affordance for the destination.
    expect(
      screen.queryByTestId(PredictAmountEntryTestIds.DISPLAY),
    ).not.toBeOnTheScreen();
  });

  it('masks the available balance, confirmed amount, and destination in privacy mode', async () => {
    const availableBalanceCopy = strings(
      'predict_next.withdraw.available_balance',
      { amount: '$12.34' },
    );

    renderPredictNext(true);
    await openWithdrawFlow();

    const availableBalance = screen.getByTestId(
      PredictWithdrawFlowTestIds.AVAILABLE_BALANCE,
    );
    expect(availableBalance).toHaveTextContent(/^•+$/u);
    expect(screen.queryByLabelText(/12\.34/u)).not.toBeOnTheScreen();
    expect(screen.queryByText(availableBalanceCopy)).not.toBeOnTheScreen();

    typeAmount('5.00');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));
    await screen.findByTestId(PredictWithdrawFlowTestIds.CONFIRM);

    expect(screen.queryByText('$5.00')).not.toBeOnTheScreen();
    expect(screen.queryByText('0xcDe7…9B9c')).not.toBeOnTheScreen();
  });

  it('shows the available balance in plain text when privacy mode is off', async () => {
    renderPredictNext();
    await openWithdrawFlow();

    expect(
      await screen.findByText(
        strings('predict_next.withdraw.available_balance', {
          amount: '$12.34',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('disables Continue and shows the offline banner with no connection', async () => {
    netInfoMock.__setMockNetInfo({ type: 'none', isInternetReachable: false });

    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('5.00');

    expect(
      screen.getByTestId(PredictWithdrawFlowTestIds.OFFLINE_BANNER),
    ).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));

    await act(async () => undefined);
    expect(previewBodies()).toEqual([]);
  });

  it('observes the operation on a slow cellular connection', async () => {
    netInfoMock.__setMockNetInfo({
      type: 'cellular',
      isInternetReachable: true,
      details: { cellularGeneration: '3g' },
    });
    stubWithdrawals({
      observe: () => ({
        body: receiptOf({
          status: 'settled',
          withdrawnAmount: '5.00',
          resolvedAt: new Date().toISOString(),
        }),
      }),
    });

    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('5.00');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));
    await screen.findByTestId(PredictWithdrawFlowTestIds.CONFIRM);
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONFIRM));

    // The screen hands its tier to the polling hook, which reads the receipt
    // back. The step length is a hook-level concern
    // (`useWithdrawReceipt.test.ts`); here the tier must simply not stop
    // observation short of a terminal status. Slow cellular doubles the first
    // step, so wait past the production 4s.
    expect(
      await screen.findByTestId(
        PredictWithdrawFlowTestIds.status('settled'),
        {},
        { timeout: 6_000 },
      ),
    ).toBeOnTheScreen();
    expect(
      fetchMock.mock.calls.filter(
        ([url, init]) =>
          OBSERVE_URL.test(String(url)) && init?.method === 'GET',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('explains a step-up verification rejection and invalidates nothing', async () => {
    stubWithdrawals({
      commit: () => ({
        status: 201,
        body: receiptOf({
          status: 'rejected',
          rejectionCode: 'step_up_verification_required',
          withdrawnAmount: null,
        }),
      }),
    });

    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('5.00');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));
    await screen.findByTestId(PredictWithdrawFlowTestIds.CONFIRM);
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONFIRM));

    expect(
      await screen.findByTestId(PredictWithdrawFlowTestIds.STATUS_REJECTION),
    ).toHaveTextContent('Verification required');
    expect(
      screen.getByText(
        "Withdrawals above a limit need extra verification, which isn't available in the app yet. Nothing left your account.",
      ),
    ).toBeOnTheScreen();
  });

  it('explains an insufficient balance rejection', async () => {
    stubWithdrawals({
      commit: () => ({
        status: 201,
        body: receiptOf({
          status: 'rejected',
          rejectionCode: 'insufficient_balance',
          withdrawnAmount: null,
        }),
      }),
    });

    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('5.00');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));
    await screen.findByTestId(PredictWithdrawFlowTestIds.CONFIRM);
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONFIRM));

    expect(
      await screen.findByTestId(PredictWithdrawFlowTestIds.STATUS_REJECTION),
    ).toHaveTextContent('Not enough balance');
  });

  it('returns to entry with the amount when the preview expired at commit time', async () => {
    let previewCount = 0;
    let commitCount = 0;
    stubWithdrawals({
      preview: () =>
        previewCount++ === 0
          ? { body: previewOf() }
          : { body: previewOf({ previewId: FRESH_PREVIEW_ID }) },
      commit: () =>
        commitCount++ === 0
          ? { status: 410, body: { code: 'preview_expired' } }
          : {
              status: 201,
              body: receiptOf({
                previewId: FRESH_PREVIEW_ID,
                status: 'settled',
                withdrawnAmount: '5.00',
                resolvedAt: new Date().toISOString(),
              }),
            },
    });

    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('5.00');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));
    await screen.findByTestId(PredictWithdrawFlowTestIds.CONFIRM);

    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONFIRM));

    expect(
      await screen.findByTestId(PredictWithdrawFlowTestIds.ERROR),
    ).toHaveTextContent(strings('predict_next.withdraw.error.preview_expired'));
    expect(commitPreviewIds()).toEqual([PREVIEW_ID]);
    expect(
      screen.queryByTestId(PredictWithdrawFlowTestIds.CONFIRM),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictAmountEntryTestIds.DISPLAY),
    ).toHaveTextContent('$5.00', { exact: true });

    fireEvent.press(
      screen.getByTestId(PredictAmountEntryTestIds.KEYPAD_KEY('delete')),
    );
    expect(
      screen.getByTestId(PredictAmountEntryTestIds.DISPLAY),
    ).toHaveTextContent('$5.0', { exact: true });
    typeAmount('0');

    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));
    await screen.findByTestId(PredictWithdrawFlowTestIds.CONFIRM);
    expect(previewBodies()).toEqual([{ amount: '5.00' }, { amount: '5.00' }]);
    expect(
      screen.queryByTestId(PredictWithdrawFlowTestIds.ERROR),
    ).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONFIRM));

    expect(
      await screen.findByTestId(PredictWithdrawFlowTestIds.STATUS_AMOUNT),
    ).toHaveTextContent('$5.00');
    expect(commitPreviewIds()).toEqual([PREVIEW_ID, FRESH_PREVIEW_ID]);
    expect(commitBodies()).toEqual([{}, {}]);
  });

  it('retries the same approved quote after a transient commit failure', async () => {
    let commitCount = 0;
    stubWithdrawals({
      commit: () =>
        commitCount++ === 0
          ? { status: 503, body: { code: 'venue_unavailable' } }
          : {
              status: 201,
              body: receiptOf({
                status: 'settled',
                withdrawnAmount: '5.00',
                resolvedAt: new Date().toISOString(),
              }),
            },
    });

    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('5.00');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));
    await screen.findByTestId(PredictWithdrawFlowTestIds.CONFIRM);

    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONFIRM));

    expect(
      await screen.findByTestId(PredictWithdrawFlowTestIds.ERROR),
    ).toHaveTextContent(
      strings('predict_next.withdraw.error.venue_unavailable'),
    );
    expect(
      screen.getByTestId(PredictWithdrawFlowTestIds.CONFIRM),
    ).toBeOnTheScreen();
    expect(previewBodies()).toEqual([{ amount: '5.00' }]);

    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONFIRM));

    expect(
      await screen.findByTestId(PredictWithdrawFlowTestIds.STATUS_AMOUNT),
    ).toHaveTextContent('$5.00');
    expect(commitPreviewIds()).toEqual([PREVIEW_ID, PREVIEW_ID]);
  });

  it('reports an unavailable venue on the preview', async () => {
    stubWithdrawals({
      preview: () => ({ status: 503, body: { code: 'venue_unavailable' } }),
    });

    renderPredictNext();
    await openWithdrawFlow();
    typeAmount('5.00');
    fireEvent.press(screen.getByTestId(PredictWithdrawFlowTestIds.CONTINUE));

    expect(
      await screen.findByTestId(PredictWithdrawFlowTestIds.ERROR),
    ).toHaveTextContent(
      'The venue is unavailable right now. Try again in a moment.',
    );
  });

  it('shows no entry point when the venue does not advertise withdraw', async () => {
    configurePredictNextCatalog({
      ...KALSHI_STATIC_VENUE_CATALOG,
      actions: ['buy', 'sell'],
    });

    renderPredictNext();

    await screen.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);
    expect(
      screen.queryByTestId(PredictHomeTestIds.WITHDRAW),
    ).not.toBeOnTheScreen();
  });
});
