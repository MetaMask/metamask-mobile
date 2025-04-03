import { rpcErrors } from '@metamask/rpc-errors';
import {
  JsonRpcParams,
  JsonRpcRequest,
  PendingJsonRpcResponse,
} from '@metamask/utils';
import { trackDappViewedEvent } from '../../util/metrics';
import requestEthereumAccounts from './eth-request-accounts';

interface DeferredPromise {
  promise: Promise<void>;
  resolve?: () => void;
  reject?: () => void;
}

jest.mock('../../util/metrics', () => ({
  shouldEmitDappViewedEvent: jest.fn(),
  trackDappViewedEvent: jest.fn(),
}));

const baseRequest = {
  jsonrpc: '2.0' as const,
  id: 0,
  method: 'eth_requestAccounts',
  networkClientId: 'mainnet',
  origin: 'http://test.com',
  params: [],
};

/**
 * Create a deferred Promise.
 *
 * @returns A deferred Promise.
 */
const deferredPromise = (): DeferredPromise => {
  let resolve: DeferredPromise['resolve'];
  let reject: DeferredPromise['reject'];
  const promise = new Promise<void>(
    (innerResolve: () => void, innerReject: () => void) => {
      resolve = innerResolve;
      reject = innerReject;
    },
  );
  return { promise, resolve, reject };
};

const flushPromises = () =>
  new Promise(jest.requireActual('timers').setImmediate);

const createMockedHandler = () => {
  const next = jest.fn();
  const end = jest.fn();
  const getAccounts = jest.fn().mockReturnValue([]);
  const getUnlockPromise = jest.fn();
  const metamaskState = {
    permissionHistory: {},
    metaMetricsId: 'metaMetricsId',
    accounts: {
      '0x1': {},
      '0x2': {},
      '0x3': {},
    },
  };
  const getCaip25PermissionFromLegacyPermissionsForOrigin = jest
    .fn()
    .mockResolvedValue({});
  const requestPermissionsForOrigin = jest.fn().mockReturnValue({});
  const response: PendingJsonRpcResponse<string[]> = {
    jsonrpc: '2.0' as const,
    id: 0,
    result: undefined,
  };
  const handler = (
    request: JsonRpcRequest<JsonRpcParams> & { origin: string },
  ) =>
    requestEthereumAccounts.implementation(request, response, next, end, {
      getAccounts,
      getUnlockPromise,
      metamaskState,
      getCaip25PermissionFromLegacyPermissionsForOrigin,
      requestPermissionsForOrigin,
    });

  return {
    response,
    next,
    end,
    getAccounts,
    getUnlockPromise,
    metamaskState,
    getCaip25PermissionFromLegacyPermissionsForOrigin,
    requestPermissionsForOrigin,
    handler,
  };
};

describe('requestEthereumAccountsHandler', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('checks if there are any eip155 accounts permissioned', async () => {
    const { handler, getAccounts } = createMockedHandler();

    await handler(baseRequest);
    expect(getAccounts).toHaveBeenCalledWith({ ignoreLock: true });
  });

  describe('eip155 account permissions exist', () => {
    it('waits for the wallet to unlock', async () => {
      const { handler, getUnlockPromise, getAccounts } = createMockedHandler();
      getAccounts.mockReturnValue(['0xdead', '0xbeef']);

      await handler(baseRequest);
      expect(getUnlockPromise).toHaveBeenCalledWith(true);
    });

    it('returns the accounts', async () => {
      const { handler, response, getAccounts } = createMockedHandler();
      getAccounts.mockReturnValue(['0xdead', '0xbeef']);

      await handler(baseRequest);
      expect(response.result).toStrictEqual(['0xdead', '0xbeef']);
    });

    it('blocks subsequent requests if there is currently a request waiting for the wallet to be unlocked', async () => {
      const { handler, getUnlockPromise, getAccounts, end, response } =
        createMockedHandler();
      const { promise, resolve } = deferredPromise();
      getUnlockPromise.mockReturnValue(promise);
      getAccounts.mockReturnValue(['0xdead', '0xbeef']);

      handler(baseRequest);
      expect(response).toStrictEqual({
        id: 0,
        jsonrpc: '2.0',
        result: undefined,
      });
      expect(end).not.toHaveBeenCalled();

      await flushPromises();

      await handler(baseRequest);
      expect(response.error).toStrictEqual(
        rpcErrors.resourceUnavailable(
          `Already processing eth_requestAccounts. Please wait.`,
        ),
      );
      expect(end).toHaveBeenCalledTimes(1);
      resolve?.();
    });
  });

  describe('eip155 account permissions do not exist', () => {
    it('gets the CAIP-25 permission object to request approval for', async () => {
      const { handler, getCaip25PermissionFromLegacyPermissionsForOrigin } =
        createMockedHandler();

      await handler({ ...baseRequest, origin: 'http://test.com' });
      expect(
        getCaip25PermissionFromLegacyPermissionsForOrigin,
      ).toHaveBeenCalledWith();
    });

    it('throws an error if the CAIP-25 approval is rejected', async () => {
      const { handler, requestPermissionsForOrigin, end } =
        createMockedHandler();
      requestPermissionsForOrigin.mockRejectedValue(
        new Error('approval rejected'),
      );

      await handler(baseRequest);
      expect(end).toHaveBeenCalledWith(new Error('approval rejected'));
    });

    it('grants the CAIP-25 approval', async () => {
      const {
        handler,
        getCaip25PermissionFromLegacyPermissionsForOrigin,
        requestPermissionsForOrigin,
      } = createMockedHandler();

      getCaip25PermissionFromLegacyPermissionsForOrigin.mockReturnValue({
        foo: 'bar',
      });

      await handler({ ...baseRequest, origin: 'http://test.com' });
      expect(requestPermissionsForOrigin).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('returns the newly granted and properly ordered eth accounts', async () => {
      const { handler, getAccounts, response } = createMockedHandler();
      getAccounts
        .mockReturnValueOnce([])
        .mockReturnValueOnce(['0xdead', '0xbeef']);

      await handler(baseRequest);
      expect(response.result).toStrictEqual(['0xdead', '0xbeef']);
      expect(getAccounts).toHaveBeenCalledTimes(2);
    });

    it('emits the dapp viewed metrics event', async () => {
      const mockAccounts = ['0xdead', '0xbeef'];
      const { handler, getAccounts } = createMockedHandler();
      getAccounts.mockReturnValueOnce([]).mockReturnValueOnce(mockAccounts);

      await handler(baseRequest);
      expect(trackDappViewedEvent).toHaveBeenCalledWith(
        'http://test.com',
        mockAccounts.length,
      );
    });
  });
});
