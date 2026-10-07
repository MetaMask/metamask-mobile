import { RpcEndpointType } from '@metamask/network-controller';
import { ApiEnv, getApiEnv } from '../../../apiEnv';

import {
  resolveMonadRpcConfig,
  shouldUseTenderlyMonadRpc,
  TENDERLY_MONAD_RPC_ENDPOINT_NAME,
} from './tenderly-monad-rpc';

jest.mock('../../../apiEnv', () => ({
  ApiEnv: { Dev: 'dev', Uat: 'uat', Prod: 'prod' },
  getApiEnv: jest.fn(() => 'prod'),
}));

const TENDERLY_URL = 'https://virtual.monad.example/fork';
const PUBLIC_URL = 'https://monad.example/rpc';

const publicEndpoint = {
  url: PUBLIC_URL,
  name: 'Monad',
  type: RpcEndpointType.Custom,
  networkClientId: 'monad-public',
};

describe('shouldUseTenderlyMonadRpc', () => {
  it('is true only for a dev build with the neobank flag on', () => {
    jest.mocked(getApiEnv).mockReturnValue(ApiEnv.Dev);

    expect(shouldUseTenderlyMonadRpc(true)).toBe(true);
  });

  it('is false for a production build even when the neobank flag is on', () => {
    jest.mocked(getApiEnv).mockReturnValue(ApiEnv.Prod);

    expect(shouldUseTenderlyMonadRpc(true)).toBe(false);
  });

  it('is false for a dev build when the neobank flag is off', () => {
    jest.mocked(getApiEnv).mockReturnValue(ApiEnv.Dev);

    expect(shouldUseTenderlyMonadRpc(false)).toBe(false);
  });
});

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
