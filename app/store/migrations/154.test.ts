import { cloneDeep } from 'lodash';

import migration from './154';

interface NetworkControllerState {
  selectedNetworkClientId?: string;
  networksMetadata?: Record<string, unknown>;
  networkConfigurationsByChainId: Record<
    string,
    {
      chainId: string;
      name: string;
      nativeCurrency?: string;
      defaultRpcEndpointIndex: number;
      blockExplorerUrls: string[];
      rpcEndpoints: Record<string, unknown>[];
    }
  >;
}

interface TestState {
  engine: {
    backgroundState: {
      NetworkController: NetworkControllerState;
    };
  };
}

const buildState = (
  networkControllerState: NetworkControllerState,
): TestState => ({
  engine: {
    backgroundState: {
      NetworkController: networkControllerState,
    },
  },
});

const brokenCustomEndpoint = (networkClientId: string) => ({
  failoverUrls: [],
  name: 'Arc',
  networkClientId,
  type: 'custom',
  url: 'https://arc-mainnet.infura.io/v3/{infuraProjectId}',
});

const validInfuraEndpoint = (networkClientId: string) => ({
  failoverUrls: [],
  networkClientId,
  type: 'infura',
  url: `https://${networkClientId}.infura.io/v3/{infuraProjectId}`,
});

const VERSION = 154;

describe(`migration #${VERSION}`, () => {
  const migrate = (state: TestState) => migration(state) as TestState;

  it('converts a broken custom endpoint to an infura endpoint', () => {
    const oldState = buildState({
      networkConfigurationsByChainId: {
        '0x13b0': {
          chainId: '0x13b0',
          name: 'Arc',
          nativeCurrency: 'USDC',
          defaultRpcEndpointIndex: 0,
          blockExplorerUrls: [],
          rpcEndpoints: [brokenCustomEndpoint('a-uuid')],
        },
      },
    });

    const newState = migrate(cloneDeep(oldState));
    expect(
      newState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId['0x13b0'].rpcEndpoints,
    ).toStrictEqual([
      {
        failoverUrls: [],
        name: 'Arc',
        networkClientId: 'arc-mainnet',
        type: 'infura',
        url: 'https://arc-mainnet.infura.io/v3/{infuraProjectId}',
      },
    ]);
  });

  it('remaps selectedNetworkClientId and networksMetadata', () => {
    const oldState = buildState({
      selectedNetworkClientId: 'old-uuid',
      networksMetadata: {
        'old-uuid': { status: 'available', EIPS: { 1559: true } },
      },
      networkConfigurationsByChainId: {
        '0x13b0': {
          chainId: '0x13b0',
          name: 'Arc',
          defaultRpcEndpointIndex: 0,
          blockExplorerUrls: [],
          rpcEndpoints: [brokenCustomEndpoint('old-uuid')],
        },
      },
    });

    const newState = migrate(cloneDeep(oldState));
    const networkState = newState.engine.backgroundState.NetworkController;
    expect(networkState.selectedNetworkClientId).toBe('arc-mainnet');
    expect(networkState.networksMetadata).toStrictEqual({
      'arc-mainnet': { status: 'available', EIPS: { 1559: true } },
    });
  });

  it('leaves built-in infura endpoints untouched', () => {
    const oldState = buildState({
      networkConfigurationsByChainId: {
        '0x1': {
          chainId: '0x1',
          name: 'Ethereum',
          defaultRpcEndpointIndex: 0,
          blockExplorerUrls: [],
          rpcEndpoints: [validInfuraEndpoint('mainnet')],
        },
      },
    });

    const newState = migrate(cloneDeep(oldState));
    expect(newState).toStrictEqual(oldState);
  });

  it('leaves custom endpoints with a real project ID alone', () => {
    const repairedEndpoint = {
      networkClientId: 'another-uuid',
      type: 'custom',
      url: 'https://arc-mainnet.infura.io/v3/real-project-id',
    };
    const oldState = buildState({
      networkConfigurationsByChainId: {
        '0x13b0': {
          chainId: '0x13b0',
          name: 'Arc',
          defaultRpcEndpointIndex: 0,
          blockExplorerUrls: [],
          rpcEndpoints: [repairedEndpoint],
        },
      },
    });

    const newState = migrate(cloneDeep(oldState));
    expect(newState).toStrictEqual(oldState);
  });

  it('does not mutate the input state', () => {
    const oldState = buildState({
      selectedNetworkClientId: 'old-uuid',
      networksMetadata: {
        'old-uuid': { status: 'available', EIPS: {} },
      },
      networkConfigurationsByChainId: {
        '0x13b0': {
          chainId: '0x13b0',
          name: 'Arc',
          defaultRpcEndpointIndex: 0,
          blockExplorerUrls: [],
          rpcEndpoints: [brokenCustomEndpoint('old-uuid')],
        },
      },
    });
    const snapshot = cloneDeep(oldState);

    migration(oldState);

    expect(oldState).toStrictEqual(snapshot);
  });

  it('returns state unchanged when NetworkController is missing', () => {
    const oldState = {
      engine: { backgroundState: {} },
    } as unknown as TestState;

    const newState = migrate(cloneDeep(oldState));

    expect(newState).toStrictEqual(oldState);
  });
});
