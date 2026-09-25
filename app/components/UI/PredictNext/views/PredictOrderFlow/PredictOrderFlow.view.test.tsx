import '../../../../../../tests/component-view/mocks';
import React from 'react';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { Linking } from 'react-native';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import { Text, Button } from '@metamask/design-system-react-native';

import { renderPredictOrderFlow } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { KalshiRemoteAdapter } from '../../adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../../adapters/remote/PredictApiReadClient';
import {
  PREDICT_ORDER_SERVICE_NAME,
  PredictOrderService,
} from '../../services/PredictOrderService';
import { getPredictOrderServiceMessenger } from '../../../../../core/Engine/messengers/predict-order-service-messenger';
import { usePredictOrderFlow } from './PredictOrderFlowProvider';
import { PredictOrderFlowTestIds } from './internal/PredictOrderFlow.testIds';
import {
  KALSHI_VENUE_ID,
  type PredictDecimal,
  type PredictEntityId,
} from '../../types';

// The provider resolves the Order workflow service from Engine.context, the
// way the real Engine init composes it: the concrete trading adapter is
// composed here (in the test), against the stubbed globalThis.fetch below.
// Composition happens per-test (not at module scope) because the read client
// binds the fetch implementation at construction time.
const composeOrderService = (): PredictOrderService => {
  const rootMessenger = new Messenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });
  // The real Engine messenger wiring, including the delegated portfolio
  // invalidation action the Order workflow consumes after a terminal receipt.
  const messenger = getPredictOrderServiceMessenger(
    rootMessenger as unknown as Parameters<
      typeof getPredictOrderServiceMessenger
    >[0],
  );
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: 'https://predict.example',
      clientVersion: '1.0.0',
      getBearerToken: () =>
        Engine.context.AuthenticationController.getBearerToken(),
    }),
  );
  return new PredictOrderService({
    messenger,
    trading: adapter.trading,
    venueId: adapter.venueId,
  });
};

const PROBE_BUTTON = 'order-flow-probe-open';
const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;

interface FetchReply {
  status?: number;
  body: unknown;
}

const makeReceipt = (overrides: Record<string, unknown> = {}) => ({
  operationId: 'd4e5f6a7-1111-4222-8333-444455556666',
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
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
  ...overrides,
});

/** An unresolved receipt: the venue has not reported fills yet, so every
 * fill and spend field arrives as an explicit null. */
const makeUnresolvedReceipt = (status: string) =>
  makeReceipt({
    status,
    venueOrderId: null,
    filledContracts: null,
    actualSpend: null,
    averageFillPrice: null,
    fee: null,
    payoutExposure: null,
  });

const pressKeypadKey = (key: string) => {
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.KEYPAD_KEY(key)));
};

const stubFetch = (
  reply: (url: string, init?: RequestInit) => FetchReply,
  {
    commitDelayMs = 0,
    commit,
  }: { commitDelayMs?: number; commit?: () => FetchReply } = {},
) => {
  fetchMock.mockImplementation(async (url, init) => {
    // The commit route returns the canonical Order Receipt; previews are
    // quoted by the preview route only.
    const isCommit = String(url).endsWith('/orders/commit');
    if (isCommit && commitDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, commitDelayMs));
    }
    const { status = 200, body } = isCommit
      ? (commit?.() ?? { status: 200, body: makeReceipt() })
      : reply(String(url), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  });
};

const commitCalls = (): { url: string; body: unknown }[] =>
  fetchMock.mock.calls
    .filter(([url]) => String(url).endsWith('/orders/commit'))
    .map(([url, init]) => ({
      url: String(url),
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    }));

const previewCalls = (): { url: string; body: unknown }[] =>
  fetchMock.mock.calls
    .filter(([url]) => String(url).endsWith('/orders/preview'))
    .map(([url, init]) => ({
      url: String(url),
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    }));

const stubBalance = (venueStatus?: { termsUrl?: string }) =>
  messengerCall.mockImplementation((action: string) => {
    if (action === 'PredictPortfolioService:getBalance') {
      return Promise.resolve({
        venueId: 'kalshi',
        currency: 'USD',
        available: '123.12',
      });
    }
    if (action === 'PredictMarketDataService:getVenueStatus') {
      return Promise.resolve({
        venueId: 'kalshi',
        status: 'available',
        checkedAt: new Date().toISOString(),
        ...(venueStatus === undefined
          ? {}
          : { termsUrl: venueStatus.termsUrl }),
      });
    }
    return Promise.resolve(undefined);
  });

const Probe = () => {
  const { openOrderFlow } = usePredictOrderFlow();
  return (
    <Button
      testID={PROBE_BUTTON}
      onPress={() =>
        openOrderFlow({
          venueId: KALSHI_VENUE_ID,
          marketId: 'KXTEST-26-A' as PredictEntityId,
          side: 'yes',
          outcomeLabel: 'Buffalo Bills',
          eventTitle: 'Buffalo Bills vs. Kansas City Chiefs',
          eventImageUrl: 'https://predict.example/bills.png',
          askPrice: '0.53' as PredictDecimal,
        })
      }
    >
      <Text>Open order flow</Text>
    </Button>
  );
};

const renderProbe = () => renderPredictOrderFlow(Probe);

const makePreview = (overrides: Record<string, unknown> = {}) => ({
  previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
  venueId: 'kalshi',
  marketId: 'KXTEST-26-A',
  side: 'yes',
  requestedAmount: '20.00',
  orderAmount: '20.00',
  estimatedContracts: 43,
  averagePrice: '0.4651',
  fee: '0.86',
  feeBreakdown: [
    { source: 'venue', amount: '0.43' },
    { source: 'metamask', amount: '0.43' },
  ],
  totalDebit: '20.86',
  potentialPayout: '43.00',
  potentialProfit: '22.14',
  expiresAt: new Date(Date.now() + 30_000).toISOString(),
  ...overrides,
});

const typeAmount = (amount: string) => {
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT));
  for (const key of amount.split('')) {
    pressKeypadKey(key);
  }
};

const replaceAmount = (previous: string, next: string) => {
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT));
  Array.from({ length: previous.length }).forEach(() =>
    pressKeypadKey('delete'),
  );
  for (const key of next.split('')) {
    pressKeypadKey(key);
  }
};

const stubEchoingPreview = () =>
  stubFetch((_url, init) => {
    const body = JSON.parse(String(init?.body)) as { amount: string };
    return {
      body: makePreview({
        requestedAmount: Number(body.amount).toFixed(2),
      }),
    };
  });

describe('PredictOrderFlow', () => {
  beforeEach(() => {
    fetchMock.mockClear();
    stubBalance();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    (Engine.context as Record<string, unknown>).PredictOrderService =
      composeOrderService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const openSheet = () => {
    renderProbe();
    fireEvent.press(screen.getByTestId(PROBE_BUTTON));
  };

  const flushDebounce = () =>
    act(() => new Promise((resolve) => setTimeout(resolve, 600)));

  /** Drives the flow to the approval step: type the amount, wait for the
   * quote, and open the review. */
  const reviewOrder = async () => {
    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
    );
    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.REVIEW));
    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.APPROVAL),
      ).toBeOnTheScreen(),
    );
  };

  /** Drives the flow through approval into the commit. */
  const approveOrder = async () => {
    await reviewOrder();
    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.APPROVE));
  };

  it('renders the event snapshot with the outcome priced in cents', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    expect(
      screen.getByText('Buffalo Bills vs. Kansas City Chiefs'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.OUTCOME_LABEL),
    ).toHaveTextContent('Buffalo Bills · 53¢');

    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.OUTCOME_LABEL),
      ).toHaveTextContent('Buffalo Bills · 46.5¢'),
    );
  });

  it('shows the Predict balance on the Pay with row', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    await flushDebounce();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.PAY_WITH),
      ).toHaveTextContent('Predict balance ($123.12)'),
    );
  });

  it('requests a quote for the entered amount and renders the distinct canonical values in the breakdown', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
    );

    expect(screen.getByTestId(PredictOrderFlowTestIds.TOTAL)).toHaveTextContent(
      '$20.86',
    );

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.TOTAL_INFO));
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.BREAKDOWN),
    ).toBeOnTheScreen();
    expect(screen.getByText('Price details')).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.AVERAGE_PRICE),
    ).toHaveTextContent('46.5¢');
    expect(screen.getByText('Exchange fee')).toBeOnTheScreen();
    expect(screen.getByText('MetaMask fee')).toBeOnTheScreen();
  });

  it('sends the exact intent with the authenticated request', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
    );

    const calls = previewCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toEqual({
      marketId: 'KXTEST-26-A',
      side: 'yes',
      amount: '20',
    });
  });

  it('keeps the Review control disabled until a live quote arrives', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');

    expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeDisabled();

    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
    );
  });

  it('re-quotes and discards the old preview when the amount changes', async () => {
    stubEchoingPreview();

    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.TOTAL_INFO),
      ).toBeOnTheScreen(),
    );
    expect(previewCalls()).toHaveLength(1);

    replaceAmount('20', '50');
    expect(screen.getByTestId(PredictOrderFlowTestIds.TOTAL)).toHaveTextContent(
      '$50.00',
    );
    expect(screen.queryByTestId(PredictOrderFlowTestIds.TOTAL_INFO)).toBeNull();

    await flushDebounce();
    await waitFor(() => expect(previewCalls()).toHaveLength(2));
  });

  it('keeps Review disabled while a fresh quote loads for the changed amount', async () => {
    stubEchoingPreview();

    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
    );

    replaceAmount('20', '50');
    expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeDisabled();

    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
    );
    expect(previewCalls()).toHaveLength(2);
  });

  it('discards an in-flight quote when the amount stops being quotable', async () => {
    let resolveQuote: (reply: FetchReply) => void = () => undefined;
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveQuote = (reply) =>
            resolve({
              ok: true,
              status: 200,
              json: async () => reply.body,
            } as Response);
        }),
    );

    openSheet();
    typeAmount('20');
    await flushDebounce();
    replaceAmount('20', '0.50');
    await act(async () => {
      resolveQuote({ body: makePreview() });
    });

    expect(previewCalls()).toHaveLength(1);
    expect(screen.getByTestId(PredictOrderFlowTestIds.TOTAL)).toHaveTextContent(
      '$0.50',
    );
    expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeDisabled();
    expect(screen.getByText(/Enter at least \$1/)).toBeOnTheScreen();
  });

  it('canonicalizes the amount before quoting: no leading zeros reach the API', async () => {
    stubEchoingPreview();

    openSheet();
    typeAmount('05');
    await flushDebounce();

    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
    );
    expect(previewCalls()[0]?.body).toEqual({
      marketId: 'KXTEST-26-A',
      side: 'yes',
      amount: '5',
    });
  });

  it('treats partial input as typing, not as a minimum error', async () => {
    stubEchoingPreview();

    openSheet();
    typeAmount('1.');

    expect(screen.queryByText(/Enter at least \$1/)).toBeNull();
    expect(previewCalls()).toHaveLength(0);
  });

  it('adds quick amounts to the entered amount and quotes the sum', async () => {
    stubEchoingPreview();

    openSheet();
    fireEvent.press(
      screen.getByTestId(PredictOrderFlowTestIds.QUICK_AMOUNT('5')),
    );
    fireEvent.press(
      screen.getByTestId(PredictOrderFlowTestIds.QUICK_AMOUNT('10')),
    );
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT),
    ).toHaveTextContent('$15');

    await flushDebounce();
    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.TOTAL_INFO),
      ).toBeOnTheScreen(),
    );
    expect(previewCalls()).toHaveLength(1);
    expect(previewCalls()[0]?.body).toEqual({
      marketId: 'KXTEST-26-A',
      side: 'yes',
      amount: '15',
    });
  });

  it('enters the amount on the in-sheet keypad', async () => {
    stubEchoingPreview();

    openSheet();
    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT));
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.KEYPAD),
    ).toBeOnTheScreen();

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT),
    ).toHaveTextContent('$0');
  });

  it('refuses to quote below the minimum amount', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('0.50');
    await flushDebounce();
    await flushDebounce();

    expect(previewCalls()).toHaveLength(0);
    expect(screen.getByText(/Enter at least \$1/)).toBeOnTheScreen();
  });

  it('marks an expired preview, refuses approval, and refreshes', async () => {
    stubFetch(() => ({
      body: makePreview({
        expiresAt: new Date(Date.now() + 500).toISOString(),
      }),
    }));

    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
    );

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.EXPIRED),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.REFRESH),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(PredictOrderFlowTestIds.REVIEW)).toBeNull();

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.REFRESH));
    await flushDebounce();
    await waitFor(() => expect(previewCalls()).toHaveLength(2));
  });

  it('renders a quote failure as a product state with a retry', async () => {
    stubFetch(() => ({
      status: 422,
      body: {
        code: 'insufficient_balance',
        message: 'Estimated total debit exceeds the available balance.',
      },
    }));

    openSheet();
    typeAmount('20');
    await flushDebounce();

    expect(screen.getByTestId(PredictOrderFlowTestIds.ERROR)).toBeOnTheScreen();
    expect(
      screen.getByText('Not enough balance for this order.'),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.REFRESH),
    ).toBeOnTheScreen();
  });

  it('presents the exact quoted values for approval before committing', async () => {
    stubFetch(() => ({ body: makePreview() }));

    await reviewOrder();

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.ESTIMATED_CONTRACTS),
    ).toHaveTextContent('43');
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.TOTAL_DEBIT),
    ).toHaveTextContent('$20.86');
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.EXPIRY),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(PredictOrderFlowTestIds.REVIEW)).toBeNull();

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.BACK));
    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.REVIEW),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT),
    ).toHaveTextContent('$20');
  }, 30000);

  it('degrades an expired preview in the approval step to a re-quote affordance', async () => {
    stubFetch(() => ({
      body: makePreview({
        expiresAt: new Date(Date.now() + 1200).toISOString(),
      }),
    }));

    await reviewOrder();

    await waitFor(
      () =>
        expect(
          screen.getByTestId(PredictOrderFlowTestIds.EXPIRED),
        ).toBeOnTheScreen(),
      { timeout: 3000 },
    );
    expect(screen.queryByTestId(PredictOrderFlowTestIds.APPROVE)).toBeNull();
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.REFRESH),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.REFRESH));
    await flushDebounce();
    await waitFor(() => expect(previewCalls()).toHaveLength(2));
  }, 30000);

  it('degrades a venue-expired preview at commit time to a re-quote affordance', async () => {
    stubFetch(() => ({ body: makePreview() }), {
      commit: () => ({
        status: 410,
        body: {
          code: 'preview_expired',
          message: 'Order Preview has expired; request a fresh quote.',
        },
      }),
    });

    await approveOrder();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.EXPIRED),
      ).toBeOnTheScreen(),
    );
    expect(screen.queryByTestId(PredictOrderFlowTestIds.APPROVE)).toBeNull();
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.REFRESH),
    ).toBeOnTheScreen();
    expect(commitCalls()).toHaveLength(1);
  }, 30000);

  it('commits only the previewId and renders the full Fill receipt with the reported execution values', async () => {
    stubFetch(() => ({ body: makePreview() }));

    await approveOrder();

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.SUBMITTING),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.RECEIPT_FILLED),
      ).toBeOnTheScreen(),
    );
    expect(commitCalls()).toEqual([
      {
        url: expect.stringContaining('/orders/commit'),
        body: { previewId: 'b3c2a1d0-1111-4222-8333-444455556666' },
      },
    ]);
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.FILLED_CONTRACTS),
    ).toHaveTextContent('43');
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.ACTUAL_SPEND),
    ).toHaveTextContent('$20.86');
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.AVERAGE_FILL_PRICE),
    ).toHaveTextContent('46.5¢');
    expect(screen.getByTestId(PredictOrderFlowTestIds.FEE)).toHaveTextContent(
      '$0.86',
    );
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.PAYOUT_EXPOSURE),
    ).toHaveTextContent('$43.00');
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.POSITION_CONTEXT),
    ).toHaveTextContent('You now own 43 Buffalo Bills contracts');

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.DONE));
    await waitFor(() =>
      expect(screen.queryByTestId(PredictOrderFlowTestIds.SHEET)).toBeNull(),
    );
  }, 30000);

  it('locks the submit while committing: repeated taps do nothing', async () => {
    stubFetch(() => ({ body: makePreview() }), { commitDelayMs: 150 });

    await approveOrder();

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.SUBMITTING),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(PredictOrderFlowTestIds.APPROVE)).toBeNull();
    expect(screen.queryByTestId(PredictOrderFlowTestIds.REVIEW)).toBeNull();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.RECEIPT_FILLED),
      ).toBeOnTheScreen(),
    );
    expect(commitCalls()).toHaveLength(1);
  }, 30000);

  it('renders a partial Fill as success with the filled quantity and canceled remainder', async () => {
    stubFetch(() => ({ body: makePreview() }), {
      commit: () => ({
        body: makeReceipt({
          status: 'partially_filled',
          filledContracts: '12.00',
          actualSpend: '5.83',
          averageFillPrice: '0.4855',
          fee: '0.23',
          payoutExposure: '12.00',
        }),
      }),
    });

    await approveOrder();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.RECEIPT_PARTIALLY_FILLED),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.REMAINDER),
    ).toHaveTextContent(/12 of 43 contracts filled/);
    expect(screen.getByText(/remaining 31 were canceled/)).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.ACTUAL_SPEND),
    ).toHaveTextContent('$5.83');
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.PAYOUT_EXPOSURE),
    ).toHaveTextContent('$12.00');
  }, 30000);

  it('renders a zero Fill with the Order-not-filled treatment and a re-quote', async () => {
    stubFetch(() => ({ body: makePreview() }), {
      commit: () => ({ body: makeUnresolvedReceipt('not_filled') }),
    });

    await approveOrder();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.RECEIPT_NOT_FILLED),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByText(/couldn't buy at 46.5¢/)).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.REQUOTE),
    ).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.REQUOTE));
    await flushDebounce();
    await waitFor(() => expect(previewCalls()).toHaveLength(2));
  }, 30000);

  it('renders a rejection honestly: nothing filled, balance untouched, re-quote offered', async () => {
    stubFetch(() => ({ body: makePreview() }), {
      commit: () => ({ body: makeUnresolvedReceipt('rejected') }),
    });

    await approveOrder();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.RECEIPT_REJECTED),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.getByText(/Nothing was filled and your balance is untouched/),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.REQUOTE),
    ).toBeOnTheScreen();
  }, 30000);

  it('keeps checking a reconciliation-required receipt by re-committing until it resolves', async () => {
    let commits = 0;
    stubFetch(() => ({ body: makePreview() }), {
      commit: () => {
        commits += 1;
        return commits === 1
          ? { body: makeUnresolvedReceipt('reconciliation_required') }
          : { body: makeReceipt() };
      },
    });

    await approveOrder();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.RECEIPT_RECONCILING),
      ).toBeOnTheScreen(),
    );
    expect(
      within(
        screen.getByTestId(PredictOrderFlowTestIds.RECEIPT_RECONCILING),
      ).getByText(/still confirming what happened/i),
    ).toBeOnTheScreen();
    expect(commitCalls()).toHaveLength(1);

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.KEEP_CHECKING));
    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.RECEIPT_FILLED),
      ).toBeOnTheScreen(),
    );
    expect(commitCalls()).toHaveLength(2);
  }, 30000);

  it('renders a failed commit on the approval step with re-approval that re-POSTs the same previewId', async () => {
    stubFetch(() => ({ body: makePreview() }), {
      commit: () => ({
        status: 500,
        body: { code: 'venue_unavailable', message: 'Venue unavailable.' },
      }),
    });

    await approveOrder();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.ERROR),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.getByText('Unable to reach the prediction service.'),
    ).toBeOnTheScreen();
    // The quoted values stay approved: re-approving re-POSTs the same
    // idempotent Preview reference instead of placing another Order.
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.APPROVE),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(PredictOrderFlowTestIds.BACK)).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.APPROVE));
    await waitFor(() => expect(commitCalls()).toHaveLength(2));
    expect(commitCalls()[0]?.body).toEqual(commitCalls()[1]?.body);
  }, 30000);

  it('keeps the original previewId after a failed commit even when the quote later expires', async () => {
    stubFetch(
      () => ({
        body: makePreview({
          expiresAt: new Date(Date.now() + 4000).toISOString(),
        }),
      }),
      {
        commit: () => ({
          status: 500,
          body: { code: 'venue_unavailable', message: 'Venue unavailable.' },
        }),
      },
    );

    await approveOrder();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.ERROR),
      ).toBeOnTheScreen(),
    );
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.APPROVE),
    ).toBeOnTheScreen();

    await act(() => new Promise((resolve) => setTimeout(resolve, 4500)));

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.APPROVE),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(PredictOrderFlowTestIds.REFRESH)).toBeNull();

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.APPROVE));
    await waitFor(() => expect(commitCalls()).toHaveLength(2));
    expect(commitCalls()[0]?.body).toEqual({
      previewId: 'b3c2a1d0-1111-4222-8333-444455556666',
    });
    expect(commitCalls()[1]?.body).toEqual(commitCalls()[0]?.body);
  }, 30000);

  it('links the backend-owned terms URL when the venue publishes one', async () => {
    stubBalance({ termsUrl: 'https://kalshi.com/regulatory/agreement' });
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();

    fireEvent.press(screen.getByText('Learn more'));

    expect(openURL).toHaveBeenCalledWith(
      'https://kalshi.com/regulatory/agreement',
    );
  });

  it('renders no terms link when the venue publishes none, and survives open failures', async () => {
    stubBalance({ termsUrl: undefined });
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();

    expect(screen.queryByText('Learn more')).toBeNull();
    expect(screen.getByText(/platform terms/)).toBeOnTheScreen();
  });

  it('does not break the Order flow when the terms URL fails to open', async () => {
    stubBalance({ termsUrl: 'https://kalshi.com/regulatory/agreement' });
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('cannot open'));
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();

    fireEvent.press(screen.getByText('Learn more'));

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.REVIEW),
    ).toBeOnTheScreen();
  });
});
