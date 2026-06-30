import {
  appendFeesToQuotes,
  fetchBridgeQuoteStream,
  type FeatureId,
  type GenericQuoteRequest,
} from '@metamask/bridge-controller';
import Engine from '../../../../../../../core/Engine';
import { getBaseSemVerVersion } from '../../../../../../../util/version';
import {
  isQuoteStreamingEnabled,
  streamQuickBuyQuotes,
} from './streamQuickBuyQuotes';

jest.mock('@metamask/bridge-controller', () => ({
  appendFeesToQuotes: jest.fn(),
  fetchBridgeQuoteStream: jest.fn(),
  BridgeClientId: { MOBILE: 'mobile' },
}));

jest.mock(
  '../../../../../../../core/Engine/controllers/bridge-controller/bridge-controller-init',
  () => ({ handleBridgeFetch: jest.fn() }),
);

jest.mock('../../../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      AuthenticationController: { getBearerToken: jest.fn() },
      AccountsController: { getAccountByAddress: jest.fn() },
      TransactionController: { getLayer1GasFee: jest.fn() },
    },
    controllerMessenger: { call: jest.fn() },
  },
}));

jest.mock('../../../../../../../constants/bridge', () => ({
  BRIDGE_API_BASE_URL: 'https://bridge.test',
}));

jest.mock('../../../../../../../util/version', () => ({
  getBaseSemVerVersion: jest.fn(() => '10.0.0'),
}));

const fetchStreamMock = fetchBridgeQuoteStream as jest.Mock;
const appendFeesMock = appendFeesToQuotes as jest.Mock;
const getVersionMock = getBaseSemVerVersion as jest.Mock;
const getBearerTokenMock = Engine.context.AuthenticationController
  .getBearerToken as jest.Mock;
const getAccountByAddressMock = Engine.context.AccountsController
  .getAccountByAddress as jest.Mock;

const buildParams = (
  overrides: Partial<GenericQuoteRequest> = {},
): GenericQuoteRequest =>
  ({
    walletAddress: '0xWALLET',
    srcChainId: 1,
    destChainId: 8453,
    srcTokenAddress: '0xSRC',
    destTokenAddress: '0xDEST',
    srcTokenAmount: '1000',
    gasIncluded: false,
    gasIncluded7702: false,
    ...overrides,
  }) as GenericQuoteRequest;

const FEATURE_ID = 'quick_buy_follow_trading' as FeatureId;

describe('isQuoteStreamingEnabled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getVersionMock.mockReturnValue('10.0.0');
  });

  it('returns false when feature flags are undefined', () => {
    expect(isQuoteStreamingEnabled(undefined)).toBe(false);
  });

  it('returns false when the sse flag is absent', () => {
    expect(isQuoteStreamingEnabled({})).toBe(false);
  });

  it('returns false when sse is explicitly disabled', () => {
    expect(
      isQuoteStreamingEnabled({
        sse: { enabled: false, minimumVersion: '1.0.0' },
      }),
    ).toBe(false);
  });

  it('returns true when enabled and the client meets the minimum version', () => {
    getVersionMock.mockReturnValue('10.0.0');
    expect(
      isQuoteStreamingEnabled({
        sse: { enabled: true, minimumVersion: '9.5.0' },
      }),
    ).toBe(true);
  });

  it('returns false when the client is below the minimum version', () => {
    getVersionMock.mockReturnValue('8.0.0');
    expect(
      isQuoteStreamingEnabled({
        sse: { enabled: true, minimumVersion: '9.0.0' },
      }),
    ).toBe(false);
  });

  it('returns false when the minimum version is unparseable', () => {
    getVersionMock.mockReturnValue('10.0.0');
    expect(
      isQuoteStreamingEnabled({
        sse: { enabled: true, minimumVersion: 'not-a-version' },
      }),
    ).toBe(false);
  });
});

describe('streamQuickBuyQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getBearerTokenMock.mockResolvedValue('jwt-token');
    getAccountByAddressMock.mockReturnValue({ id: 'account-1' });
    appendFeesMock.mockImplementation(async (quotes) =>
      quotes.map((q: object) => ({ ...q, feesAppended: true })),
    );
  });

  it('forwards fee-enriched quotes to onQuote as the stream emits them', async () => {
    fetchStreamMock.mockImplementation(async (...args: unknown[]) => {
      const handlers = args[7] as {
        onValidQuoteReceived: (q: unknown) => Promise<void>;
      };
      await handlers.onValidQuoteReceived({ quote: { requestId: 'r1' } });
      await handlers.onValidQuoteReceived({ quote: { requestId: 'r2' } });
    });

    const onQuote = jest.fn();
    const signal = new AbortController().signal;

    await streamQuickBuyQuotes(buildParams(), FEATURE_ID, signal, { onQuote });

    expect(onQuote).toHaveBeenCalledTimes(2);
    expect(onQuote).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        feesAppended: true,
        quote: { requestId: 'r1' },
      }),
    );
    expect(appendFeesMock).toHaveBeenCalledWith(
      [{ quote: { requestId: 'r1' } }],
      Engine.controllerMessenger,
      expect.any(Function),
      { id: 'account-1' },
    );
  });

  it('passes client id, jwt and base url to fetchBridgeQuoteStream', async () => {
    fetchStreamMock.mockResolvedValue(undefined);

    const signal = new AbortController().signal;
    await streamQuickBuyQuotes(buildParams(), FEATURE_ID, signal, {
      onQuote: jest.fn(),
    });

    const callArgs = fetchStreamMock.mock.calls[0];
    expect(callArgs[1]).toEqual([buildParams()]);
    expect(callArgs[3]).toBe(FEATURE_ID);
    expect(callArgs[4]).toBe('mobile');
    expect(callArgs[5]).toBe('jwt-token');
    expect(callArgs[6]).toBe('https://bridge.test');
  });

  it('does not resolve a selected account when wallet address is absent', async () => {
    fetchStreamMock.mockResolvedValue(undefined);

    const signal = new AbortController().signal;
    await streamQuickBuyQuotes(
      buildParams({ walletAddress: undefined as unknown as string }),
      FEATURE_ID,
      signal,
      { onQuote: jest.fn() },
    );

    expect(getAccountByAddressMock).not.toHaveBeenCalled();
  });

  it('propagates stream errors to the caller', async () => {
    fetchStreamMock.mockRejectedValue(new Error('stream failed'));

    const signal = new AbortController().signal;
    await expect(
      streamQuickBuyQuotes(buildParams(), FEATURE_ID, signal, {
        onQuote: jest.fn(),
      }),
    ).rejects.toThrow('stream failed');
  });
});
