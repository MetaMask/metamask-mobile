jest.mock('../../Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: jest.fn(),
    },
  },
}));

import type { CaipAccountId, CaipChainId } from '@metamask/utils';
import Engine from '../../Engine';
import { createSnapCaller } from './router';

const mockedCall = Engine.controllerMessenger.call as jest.Mock;

interface TestSpec {
  test_method: {
    params: { foo: string };
    response: { signature: string };
  };
}

describe('createSnapCaller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the per-session origin to the MultichainRoutingService', async () => {
    // Security invariant: the Snap-visible origin must be the unspoofable
    // per-session channel id, so each WalletConnect session remains a
    // distinct principal. It must never be replaced by a shared constant or
    // the dapp's self-reported URL.
    mockedCall.mockResolvedValue({ signature: '0xsig' });
    const callSnap = createSnapCaller<TestSpec>();

    const result = await callSnap({
      origin: 'channel-id-1',
      connectedAddresses: ['tron:728126428:TAddr' as CaipAccountId],
      scope: 'tron:728126428' as CaipChainId,
      requestId: 42,
      request: { method: 'test_method', params: { foo: 'bar' } },
    });

    expect(mockedCall).toHaveBeenCalledWith(
      'MultichainRoutingService:handleRequest',
      {
        connectedAddresses: ['tron:728126428:TAddr'],
        origin: 'channel-id-1',
        scope: 'tron:728126428',
        request: {
          jsonrpc: '2.0',
          id: 42,
          method: 'test_method',
          params: { foo: 'bar' },
        },
      },
    );
    expect(result).toStrictEqual({ signature: '0xsig' });
  });

  it('keeps distinct sessions as distinct Snap origins', async () => {
    mockedCall.mockResolvedValue({ signature: '0xsig' });
    const callSnap = createSnapCaller<TestSpec>();

    const baseArgs = {
      connectedAddresses: ['tron:728126428:TAddr' as CaipAccountId],
      scope: 'tron:728126428' as CaipChainId,
      requestId: 1,
      request: { method: 'test_method', params: { foo: 'bar' } },
    } as const;

    await callSnap({ ...baseArgs, origin: 'channel-id-1' });
    await callSnap({ ...baseArgs, origin: 'channel-id-2' });

    const origins = mockedCall.mock.calls.map(([, args]) => args.origin);
    expect(origins).toStrictEqual(['channel-id-1', 'channel-id-2']);
  });

  it('omits params when the request has none', async () => {
    mockedCall.mockResolvedValue({ signature: '0xsig' });
    const callSnap = createSnapCaller<TestSpec>();

    await callSnap({
      origin: 'channel-id-1',
      connectedAddresses: [],
      scope: 'tron:728126428' as CaipChainId,
      requestId: 7,
      request: { method: 'test_method', params: undefined },
    });

    expect(mockedCall).toHaveBeenCalledWith(
      'MultichainRoutingService:handleRequest',
      expect.objectContaining({
        request: {
          jsonrpc: '2.0',
          id: 7,
          method: 'test_method',
        },
      }),
    );
  });
});
