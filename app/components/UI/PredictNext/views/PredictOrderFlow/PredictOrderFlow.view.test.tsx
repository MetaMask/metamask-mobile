import '../../../../../../tests/component-view/mocks';
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { createUIQueryClient } from '@metamask/react-data-query';
import type { Json } from '@metamask/utils';
import { Text, Button } from '@metamask/design-system-react-native';

import Engine from '../../../../../core/Engine';
import { DATA_SERVICES } from '../../../../../constants/data-services';
import {
  PredictOrderFlowProvider,
  usePredictOrderFlow,
} from './PredictOrderFlowProvider';
import { PredictOrderFlowTestIds } from './internal/PredictOrderFlow.testIds';
import {
  KALSHI_VENUE_ID,
  type PredictDecimal,
  type PredictEntityId,
} from '../../types';

const PROBE_BUTTON = 'order-flow-probe-open';

/**
 * Component-view tests may only mock Engine; the Order Flow's transport is
 * exercised for real against this global fetch stub.
 */
const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;

interface FetchReply {
  status?: number;
  body: unknown;
}

const stubFetch = (reply: (url: string, init?: RequestInit) => FetchReply) => {
  fetchMock.mockImplementation(async (url, init) => {
    const { status = 200, body } = reply(String(url), init);
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    } as Response;
  });
};

const previewCalls = (): { url: string; body: unknown }[] =>
  fetchMock.mock.calls
    .filter(([url]) => String(url).endsWith('/orders/preview'))
    .map(([url, init]) => ({
      url: String(url),
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    }));

const dataServiceMessenger = {
  call: async (method: string, ...params: Json[]) =>
    (
      Engine.controllerMessenger.call as unknown as (
        method: string,
        ...params: Json[]
      ) => Promise<void | Json>
    )(method, ...params),
  subscribe: () => undefined,
  unsubscribe: () => undefined,
};

/**
 * Mirrors the app's messenger-backed query client; the shared renderer in
 * tests/component-view/render.tsx wires the same boundary around screens.
 */
const QueryClientBoundary = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = React.useState(() =>
    createUIQueryClient(DATA_SERVICES, dataServiceMessenger, {
      defaultOptions: { queries: { retry: false } },
    }),
  );
  React.useEffect(
    () => () => {
      queryClient.clear();
    },
    [queryClient],
  );
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const stubBalance = () =>
  messengerCall.mockImplementation((action: string) => {
    if (action === 'PredictPortfolioService:getBalance') {
      return Promise.resolve({
        venueId: 'kalshi',
        currency: 'USD',
        available: '123.12',
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

const renderProbe = () =>
  render(
    <QueryClientBoundary>
      <PredictOrderFlowProvider>
        <Probe />
      </PredictOrderFlowProvider>
    </QueryClientBoundary>,
  );

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
    { label: 'Kalshi fee', amount: '0.43' },
    { label: 'MetaMask fee', amount: '0.43' },
  ],
  totalDebit: '20.86',
  potentialPayout: '43.00',
  potentialProfit: '22.14',
  expiresAt: new Date(Date.now() + 30_000).toISOString(),
  ...overrides,
});

const pressKeypadKey = (key: string) => {
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.KEYPAD_KEY(key)));
};

/**
 * Enters an amount on the in-sheet keypad the way the user does: open from
 * the amount display, press one key per character, then Done to collapse the
 * keypad and reveal the summary and the Confirm control. Keys append to the
 * current amount.
 */
const typeAmount = (amount: string) => {
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT));
  for (const key of amount.split('')) {
    pressKeypadKey(key);
  }
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.KEYPAD_DONE));
};

/**
 * Changes the amount on the keypad: reopens it (the amount persists), clears
 * the previous entry with the delete key, types the new amount, and Done.
 */
const replaceAmount = (previous: string, next: string) => {
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT));
  Array.from({ length: previous.length }).forEach(() =>
    pressKeypadKey('delete'),
  );
  for (const key of next.split('')) {
    pressKeypadKey(key);
  }
  fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.KEYPAD_DONE));
};

/**
 * Stubs a Preview whose requestedAmount echoes the request body, as the
 * backend does (normalized to two decimals). The adapter rejects a Preview
 * bound to a different amount than the requested one.
 */
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
    jest.useFakeTimers();
    fetchMock.mockClear();
    stubBalance();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const openSheet = () => {
    renderProbe();
    fireEvent.press(screen.getByTestId(PROBE_BUTTON));
  };

  const flushDebounce = () =>
    act(async () => {
      jest.advanceTimersByTime(600);
    });

  /** Opens the breakdown sheet once a live quote is behind the info affordance. */
  const openBreakdown = async () => {
    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.TOTAL_INFO),
      ).toBeOnTheScreen(),
    );
    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.TOTAL_INFO));
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
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
    );

    expect(screen.getByTestId(PredictOrderFlowTestIds.TOTAL)).toHaveTextContent(
      '$20.86',
    );

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.TOTAL_INFO));

    const quote = screen.getByTestId(PredictOrderFlowTestIds.QUOTE);
    expect(
      within(quote).getByTestId(PredictOrderFlowTestIds.ESTIMATED_CONTRACTS),
    ).toHaveTextContent('43');
    expect(
      within(quote).getByTestId(PredictOrderFlowTestIds.AVERAGE_PRICE),
    ).toHaveTextContent('$0.4651');
    expect(
      within(quote).getByTestId(PredictOrderFlowTestIds.POTENTIAL_PAYOUT),
    ).toHaveTextContent('$43.00');
    expect(
      within(quote).getByTestId(PredictOrderFlowTestIds.POTENTIAL_PROFIT),
    ).toHaveTextContent('$22.14');
    expect(
      within(quote).getByTestId(PredictOrderFlowTestIds.FEE),
    ).toHaveTextContent('$0.86');
    expect(
      within(quote).getByTestId(
        PredictOrderFlowTestIds.FEE_COMPONENT('Kalshi fee'),
      ),
    ).toHaveTextContent('$0.43');
    expect(
      within(quote).getByTestId(PredictOrderFlowTestIds.TOTAL_DEBIT),
    ).toHaveTextContent('$20.86');
  });

  it('sends the exact intent with the authenticated request', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();

    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
    );

    const calls = previewCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toEqual({
      marketId: 'KXTEST-26-A',
      side: 'yes',
      amount: '20',
    });
  });

  it('keeps the Confirm control disabled until a live quote arrives', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');

    expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeDisabled();

    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
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
    // The changed amount invalidates the previous quote immediately: the
    // Total falls back to the entered amount while the fresh quote loads.
    expect(screen.getByTestId(PredictOrderFlowTestIds.TOTAL)).toHaveTextContent(
      '$50.00',
    );
    expect(screen.queryByTestId(PredictOrderFlowTestIds.TOTAL_INFO)).toBeNull();

    await flushDebounce();
    await waitFor(() => expect(previewCalls()).toHaveLength(2));
  });

  it('keeps Confirm disabled while a fresh quote loads for the changed amount', async () => {
    stubEchoingPreview();

    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
    );

    replaceAmount('20', '50');
    // The previous preview is hidden while the fresh quote loads: it must
    // not stay approvable underneath the spinner.
    expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeDisabled();

    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
    );
    expect(previewCalls()).toHaveLength(2);
  });

  it('discards an in-flight quote when the amount stops being quotable', async () => {
    // Hold the response so the quote is still in flight when the amount
    // changes; the stale response must never repopulate the preview.
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
    expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeDisabled();
    expect(screen.getByText(/Enter at least \$1/)).toBeOnTheScreen();
  });

  it('canonicalizes the amount before quoting: no leading zeros reach the API', async () => {
    stubEchoingPreview();

    openSheet();
    typeAmount('05');
    await flushDebounce();

    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
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

    replaceAmount('1.', '1.50');
    await flushDebounce();
    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.TOTAL_INFO),
      ).toBeOnTheScreen(),
    );
  });

  it('fills quick amounts and quotes them', async () => {
    stubEchoingPreview();

    openSheet();
    fireEvent.press(
      screen.getByTestId(PredictOrderFlowTestIds.QUICK_AMOUNT('$50')),
    );
    await flushDebounce();

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.TOTAL_INFO),
      ).toBeOnTheScreen(),
    );
  });

  it('enters the amount on the in-sheet keypad and collapses it on Done', async () => {
    stubEchoingPreview();

    openSheet();
    expect(screen.queryByTestId(PredictOrderFlowTestIds.KEYPAD)).toBeNull();

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT));
    expect(
      screen.getByTestId(PredictOrderFlowTestIds.KEYPAD),
    ).toBeOnTheScreen();

    fireEvent.press(
      screen.getByTestId(PredictOrderFlowTestIds.KEYPAD_KEY('2')),
    );
    fireEvent.press(
      screen.getByTestId(PredictOrderFlowTestIds.KEYPAD_KEY('0')),
    );
    // The keypad replaces the summary and the Confirm control while open.
    expect(screen.queryByTestId(PredictOrderFlowTestIds.APPROVE)).toBeNull();

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.KEYPAD_DONE));
    expect(screen.queryByTestId(PredictOrderFlowTestIds.KEYPAD)).toBeNull();
    expect(screen.getByTestId(PredictOrderFlowTestIds.TOTAL)).toHaveTextContent(
      '$20.00',
    );

    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
    );
  });

  it('deletes the last character with the keypad delete key', async () => {
    stubEchoingPreview();

    openSheet();
    // Type and clear without quoting: the Total reads the entered amount.
    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT));
    pressKeypadKey('1');
    pressKeypadKey('2');
    pressKeypadKey('delete');
    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.KEYPAD_DONE));

    expect(screen.getByTestId(PredictOrderFlowTestIds.TOTAL)).toHaveTextContent(
      '$1.00',
    );
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
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
    );

    // Advance past the preview expiry.
    act(() => {
      jest.advanceTimersByTime(31_000);
    });

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.EXPIRED),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeDisabled();

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
    expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeDisabled();

    stubFetch(() => ({ body: makePreview() }));
    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.RETRY));
    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
    );
  });

  it('submits through the stub: submitting state, then success, then dismiss', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled(),
    );

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.APPROVE));

    expect(
      screen.getByTestId(PredictOrderFlowTestIds.SUBMITTING),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(PredictOrderFlowTestIds.APPROVE)).toBeNull();

    // The stub submission resolves after its simulated delay.
    await act(async () => {
      jest.advanceTimersByTime(2_000);
    });

    await waitFor(() =>
      expect(
        screen.getByTestId(PredictOrderFlowTestIds.SUCCESS),
      ).toBeOnTheScreen(),
    );

    fireEvent.press(screen.getByTestId(PredictOrderFlowTestIds.DONE));

    await waitFor(() =>
      expect(screen.queryByTestId(PredictOrderFlowTestIds.SHEET)).toBeNull(),
    );
  });
});
