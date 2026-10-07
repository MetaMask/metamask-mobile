import { RpcEndpointType } from '@metamask/network-controller';

import {
  resolveMonadRpcConfig,
  TENDERLY_MONAD_RPC_ENDPOINT_NAME,
} from './tenderly-monad-rpc';

const TENDERLY_URL = 'https://virtual.monad.example/fork';
const PUBLIC_URL = 'https://monad.example/rpc';

const publicEndpoint = {
  url: PUBLIC_URL,
  name: 'Monad',
  type: RpcEndpointType.Custom,
  networkClientId: 'monad-public',
};

describe('resolveMonadRpcConfig', () => {
  it('adds the Tenderly endpoint and selects it when enabled', () => {
    expect(
      resolveMonadRpcConfig({
        enabled: true,
        tenderlyRpcUrl: TENDERLY_URL,
        rpcEndpoints: [publicEndpoint],
        defaultRpcEndpointIndex: 0,
      }),
    ).toEqual({
      rpcEndpoints: [
        publicEndpoint,
        {
          url: TENDERLY_URL,
          name: TENDERLY_MONAD_RPC_ENDPOINT_NAME,
          type: RpcEndpointType.Custom,
        },
      ],
      defaultRpcEndpointIndex: 1,
    });
  });

  it('returns undefined when the Tenderly endpoint is already selected', () => {
    const tenderlyEndpoint = {
      url: TENDERLY_URL,
      name: TENDERLY_MONAD_RPC_ENDPOINT_NAME,
      type: RpcEndpointType.Custom,
    };

    expect(
      resolveMonadRpcConfig({
        enabled: true,
        tenderlyRpcUrl: TENDERLY_URL,
        rpcEndpoints: [publicEndpoint, tenderlyEndpoint],
        defaultRpcEndpointIndex: 1,
      }),
    ).toBeUndefined();
  });

  it('removes the Tenderly endpoint and restores the public default when disabled', () => {
    const tenderlyEndpoint = {
      url: TENDERLY_URL,
      name: TENDERLY_MONAD_RPC_ENDPOINT_NAME,
      type: RpcEndpointType.Custom,
    };

    expect(
      resolveMonadRpcConfig({
        enabled: false,
        tenderlyRpcUrl: TENDERLY_URL,
        rpcEndpoints: [publicEndpoint, tenderlyEndpoint],
        defaultRpcEndpointIndex: 1,
      }),
    ).toEqual({
      rpcEndpoints: [publicEndpoint],
      defaultRpcEndpointIndex: 0,
    });
  });

  it('removes a stored Tenderly endpoint by name when the dev URL is absent', () => {
    const tenderlyEndpoint = {
      url: TENDERLY_URL,
      name: TENDERLY_MONAD_RPC_ENDPOINT_NAME,
      type: RpcEndpointType.Custom,
    };

    expect(
      resolveMonadRpcConfig({
        enabled: false,
        tenderlyRpcUrl: undefined,
        rpcEndpoints: [publicEndpoint, tenderlyEndpoint],
        defaultRpcEndpointIndex: 1,
      }),
    ).toEqual({
      rpcEndpoints: [publicEndpoint],
      defaultRpcEndpointIndex: 0,
    });
  });

  it('returns undefined when disabled and no Tenderly endpoint is stored', () => {
    expect(
      resolveMonadRpcConfig({
        enabled: false,
        tenderlyRpcUrl: TENDERLY_URL,
        rpcEndpoints: [publicEndpoint],
        defaultRpcEndpointIndex: 0,
      }),
    ).toBeUndefined();
  });
});
