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
import { Text, Button } from '@metamask/design-system-react-native';

import {
  PredictOrderFlowProvider,
  usePredictOrderFlow,
} from './PredictOrderFlowProvider';
import { PredictOrderFlowTestIds } from './internal/PredictOrderFlow.testIds';
import { KALSHI_VENUE_ID, type PredictEntityId } from '../../types';

const PROBE_BUTTON = 'order-flow-probe-open';
const PREDICT_API_ORIGIN = 'https://predict.api.test';

/**
 * Component-view tests may only mock Engine; the Order Flow's transport is
 * exercised for real against this global fetch stub.
 */
const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();

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
        })
      }
    >
      <Text>Open order flow</Text>
    </Button>
  );
};

const renderProbe = () =>
  render(
    <PredictOrderFlowProvider>
      <Probe />
    </PredictOrderFlowProvider>,
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

const typeAmount = (amount: string) => {
  const input = screen.getByTestId(PredictOrderFlowTestIds.AMOUNT_INPUT);
  const textInput = input.findByProps({ keyboardType: 'decimal-pad' });
  fireEvent.changeText(textInput, amount);
};

describe('PredictOrderFlow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockClear();
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

  it('requests a quote for the entered amount and renders the distinct canonical values', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();

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
    expect(screen.getByTestId(PredictOrderFlowTestIds.APPROVE)).toBeEnabled();
  });

  it('sends the exact intent with the authenticated request', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();

    await waitFor(() =>
      expect(
        screen.queryByTestId(PredictOrderFlowTestIds.QUOTE),
      ).not.toBeNull(),
    );

    const calls = previewCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toEqual({
      marketId: 'KXTEST-26-A',
      side: 'yes',
      amount: '20',
    });
  });

  it('keeps the Approve control disabled until a live quote arrives', async () => {
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
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    typeAmount('20');
    await flushDebounce();
    await waitFor(() =>
      expect(
        screen.queryByTestId(PredictOrderFlowTestIds.QUOTE),
      ).not.toBeNull(),
    );
    expect(previewCalls()).toHaveLength(1);

    typeAmount('50');
    // The changed amount invalidates the previous quote immediately: its
    // rows are gone while the fresh quote loads.
    expect(
      screen.queryByTestId(PredictOrderFlowTestIds.TOTAL_DEBIT),
    ).toBeNull();

    await flushDebounce();
    await waitFor(() => expect(previewCalls()).toHaveLength(2));
  });

  it('fills quick amounts and quotes them', async () => {
    stubFetch(() => ({ body: makePreview() }));

    openSheet();
    fireEvent.press(
      screen.getByTestId(PredictOrderFlowTestIds.QUICK_AMOUNT('$50')),
    );
    await flushDebounce();

    await waitFor(() =>
      expect(
        screen.queryByTestId(PredictOrderFlowTestIds.QUOTE),
      ).not.toBeNull(),
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
