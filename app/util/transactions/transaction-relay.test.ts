import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex, Json } from '@metamask/utils';
import {
  RELAY_RPC_METHOD,
  RelayStatus,
  RelaySubmitRequest,
  RelayWaitRequest,
  RelayWaitResponse,
  isRelaySupported,
  submitRelayTransaction,
  validateRelayRequest,
  waitForRelayResult,
} from './transaction-relay';

import jsonRpcRequest from '../../util/jsonRpcRequest';
import {
  getSentinelApiHeadersAsync,
  getSentinelNetworkFlags,
} from './sentinel-api';

jest.useFakeTimers();

jest.mock('../../util/jsonRpcRequest');
jest.mock('./sentinel-api', () => ({
  ...jest.requireActual('./sentinel-api'),
  getSentinelNetworkFlags: jest.fn(),
  getSentinelApiHeadersAsync: jest.fn().mockResolvedValue({}),
}));

describe('Transaction Relay (mobile)', () => {
  const jsonRpcRequestMock = jest.mocked(jsonRpcRequest);
  const getSentinelApiHeadersAsyncMock = jest.mocked(
    getSentinelApiHeadersAsync,
  );
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
    getSentinelApiHeadersAsyncMock.mockResolvedValue({});
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
        expect.objectContaining({ headers: expect.any(Object) }),
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
        expect.objectContaining({ headers: expect.any(Object) }),
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

  describe('validateRelayRequest', () => {
    it('returns empty array for valid request', () => {
      const request: RelaySubmitRequest = {
        chainId: '0x1',
        data: '0xabcdef',
        to: '0x1234567890abcdef1234567890abcdef12345678',
      };
      expect(validateRelayRequest(request)).toEqual([]);
    });

    it('detects non-hex chainId', () => {
      const request = {
        chainId: 12345,
        data: '0xabcdef',
        to: '0x1234567890abcdef1234567890abcdef12345678',
      } as unknown as RelaySubmitRequest;
      const violations = validateRelayRequest(request);
      expect(violations).toContainEqual(
        expect.stringContaining('chainId: expected hex string, got number'),
      );
    });

    it('detects non-hex data', () => {
      const request = {
        chainId: '0x1',
        data: undefined,
        to: '0x1234567890abcdef1234567890abcdef12345678',
      } as unknown as RelaySubmitRequest;
      const violations = validateRelayRequest(request);
      expect(violations).toContainEqual(
        expect.stringContaining('data: expected hex string'),
      );
    });

    it('detects non-hex authorization list fields', () => {
      const request: RelaySubmitRequest = {
        chainId: '0x1',
        data: '0xabcdef',
        to: '0x1234567890abcdef1234567890abcdef12345678',
        authorizationList: [
          {
            address: '0xabc',
            chainId: 1 as unknown as Hex,
            nonce: 3 as unknown as Hex,
            r: '0xabc',
            s: '0xdef',
            yParity: 0 as unknown as Hex,
          },
        ],
      };
      const violations = validateRelayRequest(request);
      expect(violations).toContainEqual(
        expect.stringContaining('authorizationList[0].chainId'),
      );
      expect(violations).toContainEqual(
        expect.stringContaining('authorizationList[0].nonce'),
      );
      expect(violations).toContainEqual(
        expect.stringContaining('authorizationList[0].yParity'),
      );
    });

    it('passes valid authorization list', () => {
      const request: RelaySubmitRequest = {
        chainId: '0x1',
        data: '0xabcdef',
        to: '0x1234567890abcdef1234567890abcdef12345678',
        authorizationList: [
          {
            address: '0xabc',
            chainId: '0x1',
            nonce: '0x3',
            r: '0xabc',
            s: '0xdef',
            yParity: '0x0',
          },
        ],
      };
      expect(validateRelayRequest(request)).toEqual([]);
    });

    it('detects key mismatch from undefined values dropped by JSON roundtrip', () => {
      const request = {
        chainId: '0x1',
        data: '0xabcdef',
        to: '0x1234',
        someProp: undefined,
      } as unknown as RelaySubmitRequest;
      Object.defineProperty(request, 'someProp', {
        value: undefined,
        enumerable: true,
      });
      const violations = validateRelayRequest(request);
      expect(violations).toContainEqual(
        expect.stringContaining('key mismatch after roundtrip'),
      );
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
