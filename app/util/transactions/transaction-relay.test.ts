import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  RelayStatus,
  RelaySubmitRequest,
  RelayWaitRequest,
  RelayWaitResponse,
  isRelaySupported,
  submitRelayTransaction,
  waitForRelaySuccess,
} from './transaction-relay';
import {
  type SentinelApiMessenger,
  getSentinelApiMessenger,
  getSentinelNetworkFlags,
} from './sentinel-api';

jest.useFakeTimers();

jest.mock('./sentinel-api');

describe('Transaction Relay (mobile)', () => {
  const callMock = jest.fn();
  const getSentinelNetworkFlagsMock = jest.mocked(getSentinelNetworkFlags);

  const TRANSACTION_HASH_MOCK = '0x123';
  const UUID_MOCK = 'uuid-123';
  const INTERVAL_MS = 1000;

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

  function mockNetworkFlags(
    flags: Awaited<ReturnType<typeof getSentinelNetworkFlags>>,
  ) {
    getSentinelNetworkFlagsMock.mockResolvedValue(flags);
  }

  function mockRelaySupported(network = 'testnet') {
    mockNetworkFlags({ relayTransactions: true, network } as Awaited<
      ReturnType<typeof getSentinelNetworkFlags>
    >);
  }

  function mockRelayUnsupported() {
    mockNetworkFlags({
      relayTransactions: false,
      network: 'testnet',
    } as Awaited<ReturnType<typeof getSentinelNetworkFlags>>);
  }

  function mockSmartTransaction(transaction: {
    errorReason?: string | null;
    hash?: string;
    status: string;
  }) {
    callMock.mockResolvedValueOnce({ transactions: [transaction] });
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllTimers();

    jest.mocked(getSentinelApiMessenger).mockReturnValue({
      call: callMock,
    } as unknown as SentinelApiMessenger);

    mockRelaySupported();
  });

  describe('submitRelayTransaction', () => {
    it('throws when chain is not supported by relay', async () => {
      mockRelayUnsupported();

      await expect(submitRelayTransaction(SUBMIT_REQUEST_MOCK)).rejects.toThrow(
        `Sentinel: Relay: Chain not supported - ${SUBMIT_REQUEST_MOCK.chainId}`,
      );
      expect(callMock).not.toHaveBeenCalled();
    });

    it('prefixes relay submission errors', async () => {
      const error = new Error('submission failed');
      callMock.mockRejectedValueOnce(error);

      await expect(submitRelayTransaction(SUBMIT_REQUEST_MOCK)).rejects.toThrow(
        'Sentinel: Relay: submission failed',
      );
      expect(error.message).toBe('Sentinel: Relay: submission failed');
    });

    it('converts non-Error relay submission rejections', async () => {
      callMock.mockRejectedValueOnce('submission failed');

      await expect(submitRelayTransaction(SUBMIT_REQUEST_MOCK)).rejects.toThrow(
        'Sentinel: Relay: submission failed',
      );
    });

    it('submits relay request to service when chain is supported', async () => {
      callMock.mockResolvedValueOnce({ uuid: UUID_MOCK });

      await submitRelayTransaction(SUBMIT_REQUEST_MOCK);

      expect(callMock).toHaveBeenCalledWith(
        'SentinelApiService:submitRelayTransaction',
        SUBMIT_REQUEST_MOCK,
      );
    });

    it('returns uuid from service response', async () => {
      callMock.mockResolvedValueOnce({ uuid: UUID_MOCK });

      const result = await submitRelayTransaction(SUBMIT_REQUEST_MOCK);

      expect(result).toEqual({ uuid: UUID_MOCK });
    });
  });

  describe('waitForRelaySuccess', () => {
    it('throws when chain is not supported by relay', async () => {
      mockRelayUnsupported();

      await expect(waitForRelaySuccess(WAIT_REQUEST_MOCK)).rejects.toThrow(
        `Sentinel: Relay: Chain not supported - ${WAIT_REQUEST_MOCK.chainId}`,
      );
    });

    it('resolves with transactionHash and errorReason when status is Success', async () => {
      mockSmartTransaction({
        hash: TRANSACTION_HASH_MOCK,
        status: RelayStatus.Success,
      });

      const resultPromise = waitForRelaySuccess(WAIT_REQUEST_MOCK);

      await jest.advanceTimersByTimeAsync(INTERVAL_MS);

      const result = await resultPromise;

      expect(result).toEqual<RelayWaitResponse>({
        errorReason: 'Unknown error',
        status: RelayStatus.Success,
        transactionHash: TRANSACTION_HASH_MOCK,
      });

      expect(callMock).toHaveBeenCalledWith(
        'SentinelApiService:getSmartTransaction',
        { chainId: CHAIN_IDS.MAINNET, uuid: UUID_MOCK },
      );
    });

    it('throws when relay status is not Success', async () => {
      mockSmartTransaction({ status: 'TEST_STATUS' });

      const errorPromise = waitForRelaySuccess(WAIT_REQUEST_MOCK).catch(
        (error) => error,
      );

      await jest.advanceTimersByTimeAsync(INTERVAL_MS);

      await expect(errorPromise).resolves.toMatchObject({
        message:
          'Sentinel: Relay: Transaction failed - TEST_STATUS - Unknown error',
      });
    });

    it('includes error reason when relay status is not Success', async () => {
      mockSmartTransaction({ errorReason: 'Test reason', status: 'FAILED' });

      const errorPromise = waitForRelaySuccess(WAIT_REQUEST_MOCK).catch(
        (error) => error,
      );

      await jest.advanceTimersByTimeAsync(INTERVAL_MS);

      await expect(errorPromise).resolves.toMatchObject({
        message: 'Sentinel: Relay: Transaction failed - FAILED - Test reason',
      });
    });

    it('prefixes polling errors', async () => {
      callMock.mockRejectedValueOnce(new Error('poll failed'));

      const errorPromise = waitForRelaySuccess(WAIT_REQUEST_MOCK).catch(
        (error) => error,
      );

      await jest.advanceTimersByTimeAsync(INTERVAL_MS);

      await expect(errorPromise).resolves.toMatchObject({
        message: 'Sentinel: Relay: poll failed',
      });
    });

    it('polls repeatedly on interval until a non-pending status is returned', async () => {
      mockSmartTransaction({ status: RelayStatus.Pending });
      mockSmartTransaction({ status: RelayStatus.Pending });
      mockSmartTransaction({
        hash: TRANSACTION_HASH_MOCK,
        status: RelayStatus.Success,
      });

      const resultPromise = waitForRelaySuccess(WAIT_REQUEST_MOCK);

      await jest.advanceTimersByTimeAsync(INTERVAL_MS);
      await jest.advanceTimersByTimeAsync(INTERVAL_MS);
      await jest.advanceTimersByTimeAsync(INTERVAL_MS);

      const result = await resultPromise;

      expect(result).toEqual<RelayWaitResponse>({
        errorReason: 'Unknown error',
        status: RelayStatus.Success,
        transactionHash: TRANSACTION_HASH_MOCK,
      });

      expect(callMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('isRelaySupported', () => {
    it('returns true when sentinel flags indicate relay support', async () => {
      mockRelaySupported('eth-mainnet');

      const result = await isRelaySupported(CHAIN_IDS.MAINNET);

      expect(getSentinelNetworkFlagsMock).toHaveBeenCalledWith(
        CHAIN_IDS.MAINNET,
      );
      expect(result).toBe(true);
    });

    it('returns false when sentinel flags are missing for the chain', async () => {
      mockNetworkFlags(undefined);

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
