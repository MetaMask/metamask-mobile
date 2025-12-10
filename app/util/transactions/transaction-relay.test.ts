import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Json } from '@metamask/utils';
import {
  RELAY_RPC_METHOD,
  RelayStatus,
  RelaySubmitRequest,
  RelayWaitRequest,
  RelayWaitResponse,
  isRelaySupported,
  submitRelayTransaction,
  waitForRelayResult,
} from './transaction-relay';

import jsonRpcRequest from '../../util/jsonRpcRequest';
import { getSentinelNetworkFlags } from './sentinel-api';

jest.useFakeTimers();

jest.mock('../../util/jsonRpcRequest');
jest.mock('./sentinel-api', () => ({
  ...jest.requireActual('./sentinel-api'),
  getSentinelNetworkFlags: jest.fn(),
}));

describe('Transaction Relay (mobile)', () => {
  const jsonRpcRequestMock = jest.mocked(jsonRpcRequest);
  const getSentinelNetworkFlagsMock = jest.mocked(getSentinelNetworkFlags);

  const TRANSACTION_HASH_MOCK = '0x123';
  const UUID_MOCK = 'uuid-123';
  const INTERVAL_MS = 1000;
  const ERROR_BODY_MOCK = 'test error';

  const SUBMIT_REQUEST_MOCK: RelaySubmitRequest = {
    chainId: CHAIN_IDS.MAINNET,
    data: '0x1',
    to: '0x4',
  };

  const WAIT_REQUEST_MOCK: RelayWaitRequest = {
    chainId: CHAIN_IDS.MAINNET,
    interval: INTERVAL_MS,
    uuid: UUID_MOCK,
  };

  function mockRelaySupported(network = 'testnet') {
    getSentinelNetworkFlagsMock.mockResolvedValue({
      relayTransactions: true,
      network,
    } as unknown as ReturnType<typeof getSentinelNetworkFlags>);
  }

  function mockRelayUnsupported() {
    getSentinelNetworkFlagsMock.mockResolvedValue({
      relayTransactions: false,
      network: 'testnet',
    } as unknown as ReturnType<typeof getSentinelNetworkFlags>);
  }

  function mockRelayUnknown() {
    getSentinelNetworkFlagsMock.mockResolvedValue(
      undefined as unknown as ReturnType<typeof getSentinelNetworkFlags>,
    );
  }

  function mockFetchSuccess(response: Json) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: async () => response,
      ok: true,
    } as Response);
  }

  function mockFetchError(body: string, status = 500) {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      text: async () => body,
      ok: false,
      status,
    } as unknown as Response);
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllTimers();
    global.fetch = jest.fn() as unknown as typeof fetch;
    mockRelaySupported();
    jsonRpcRequestMock.mockResolvedValue({
      uuid: UUID_MOCK,
    } as unknown as Json);
  });

  describe('submitRelayTransaction', () => {
    it('throws when chain is not supported by relay', async () => {
      mockRelayUnsupported();
      await expect(submitRelayTransaction(SUBMIT_REQUEST_MOCK)).rejects.toThrow(
        `Chain not supported by transaction relay - ${SUBMIT_REQUEST_MOCK.chainId}`,
      );
    });

    it('submit JSON-RPC relay request when chain is supported', async () => {
      await submitRelayTransaction(SUBMIT_REQUEST_MOCK);

      expect(jsonRpcRequestMock).toHaveBeenCalledWith(
        expect.any(String),
        RELAY_RPC_METHOD,
        [expect.objectContaining(SUBMIT_REQUEST_MOCK)],
      );
    });

    it('returns uuid from JSON-RPC response', async () => {
      jsonRpcRequestMock.mockResolvedValueOnce({
        uuid: UUID_MOCK,
      } as unknown as Json);
      const result = await submitRelayTransaction(SUBMIT_REQUEST_MOCK);
      expect(result).toEqual({ uuid: UUID_MOCK });
    });
  });

  describe('waitForRelayResult', () => {
    it('throws when chain is not supported by relay', async () => {
      mockRelayUnsupported();
      await expect(waitForRelayResult(WAIT_REQUEST_MOCK)).rejects.toThrow(
        `Chain not supported by transaction relay - ${WAIT_REQUEST_MOCK.chainId}`,
      );
    });

    it('resolves with transactionHash when status is Success', async () => {
      mockRelaySupported('mainnet');
      mockFetchSuccess({
        transactions: [
          { hash: TRANSACTION_HASH_MOCK, status: RelayStatus.Success },
        ],
      });

      const resultPromise = waitForRelayResult(WAIT_REQUEST_MOCK);

      await jest.advanceTimersByTimeAsync(INTERVAL_MS);

      const result = await resultPromise;
      expect(result).toEqual<RelayWaitResponse>({
        status: RelayStatus.Success,
        transactionHash: TRANSACTION_HASH_MOCK,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://tx-sentinel-mainnet.api.cx.metamask.io/smart-transactions/uuid-123',
      );
    });

    it('resolves with status only (no hash) when transaction hash is missing', async () => {
      mockFetchSuccess({
        transactions: [{ status: 'TEST_STATUS' }],
      });

      const resultPromise = waitForRelayResult(WAIT_REQUEST_MOCK);

      await jest.advanceTimersByTimeAsync(INTERVAL_MS);

      const result = await resultPromise;
      expect(result).toEqual<RelayWaitResponse>({
        status: 'TEST_STATUS',
        transactionHash: undefined,
      });
    });

    it('rejects when polling responds with non-ok status', async () => {
      mockFetchError(ERROR_BODY_MOCK, 502);
      const resultPromise = waitForRelayResult(WAIT_REQUEST_MOCK);

      // eslint-disable-next-line jest/valid-expect
      expect(resultPromise).rejects.toThrow(
        'Failed to fetch relay transaction status: 502 - test error',
      );
      await jest.advanceTimersByTimeAsync(INTERVAL_MS);
    });

    it('polls repeatedly on interval until a non-pending status is returned', async () => {
      mockFetchSuccess({ transactions: [{ status: RelayStatus.Pending }] });
      mockFetchSuccess({ transactions: [{ status: RelayStatus.Pending }] });
      mockFetchSuccess({
        transactions: [
          { status: RelayStatus.Success, hash: TRANSACTION_HASH_MOCK },
        ],
      });

      const resultPromise = waitForRelayResult(WAIT_REQUEST_MOCK);

      await jest.advanceTimersByTimeAsync(INTERVAL_MS);
      await jest.advanceTimersByTimeAsync(INTERVAL_MS);
      await jest.advanceTimersByTimeAsync(INTERVAL_MS);

      const result = await resultPromise;
      expect(result).toEqual<RelayWaitResponse>({
        status: RelayStatus.Success,
        transactionHash: TRANSACTION_HASH_MOCK,
      });

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('isRelaySupported', () => {
    it('returns true when sentinel flags indicate relay support and a URL can be built', async () => {
      mockRelaySupported('eth-mainnet');
      const result = await isRelaySupported(CHAIN_IDS.MAINNET);
      expect(getSentinelNetworkFlagsMock).toHaveBeenCalledWith(
        CHAIN_IDS.MAINNET,
      );
      expect(result).toBe(true);
    });

    it('returns false when sentinel flags are missing for the chain', async () => {
      mockRelayUnknown();
      const result = await isRelaySupported(CHAIN_IDS.MAINNET);
      expect(result).toBe(false);
    });

    it('returns false when relayTransactions is false for the chain', async () => {
      mockRelayUnsupported();
      const result = await isRelaySupported(CHAIN_IDS.MAINNET);
      expect(result).toBe(false);
    });
  });
});
