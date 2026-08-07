import { getNetworkControllerInstanceOptions } from './network-controller';

describe('getNetworkControllerInstanceOptions', () => {
  it('returns the infura project id and failover urls', () => {
    const options = getNetworkControllerInstanceOptions();

    expect(options.infuraProjectId).toBeDefined();
    expect(options.failoverUrls).toBeDefined();
  });

  it('returns analytics options so the controller emits RPC service events', () => {
    const options = getNetworkControllerInstanceOptions();

    expect(options.analyticsOptions).toStrictEqual({
      isRpcEndpointUrlPublic: expect.any(Function),
      rpcServiceEventsSampleRate: expect.any(Number),
    });
  });

  it('treats a private endpoint url as not public', () => {
    const { analyticsOptions } = getNetworkControllerInstanceOptions();

    expect(
      analyticsOptions?.isRpcEndpointUrlPublic?.('http://localhost:8545'),
    ).toBe(false);
  });
});
