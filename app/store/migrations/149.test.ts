import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate, { migrationVersion } from './149';
import migrateArc, { ARC_CHAIN_ID } from './145';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const unitTestInfuraId = 'unitTestInfuraId';
const defaultArcUrl = `https://arc-mainnet.infura.io/v3/${unitTestInfuraId}`;

interface EnablementState {
  enabledNetworkMap: {
    eip155: Record<string, boolean>;
  };
}

const defaultArcRpcEndpoint = {
  networkClientId: 'arc-network-client-id',
  type: 'custom',
  url: defaultArcUrl,
  failoverUrls: [] as string[],
};

const defaultArcConfiguration = {
  chainId: ARC_CHAIN_ID,
  name: 'Arc',
  nativeCurrency: 'USDC',
  blockExplorerUrls: ['https://explorer.arc.io/'],
  defaultBlockExplorerUrlIndex: 0,
  defaultRpcEndpointIndex: 0,
  rpcEndpoints: [defaultArcRpcEndpoint],
};

const baseState = {
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            name: 'Ethereum',
            nativeCurrency: 'ETH',
            blockExplorerUrls: ['https://etherscan.io'],
            defaultRpcEndpointIndex: 0,
            defaultBlockExplorerUrlIndex: 0,
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
                type: 'custom',
                url: 'https://mainnet.infura.io/v3/test',
              },
            ],
          },
        },
        selectedNetworkClientId: 'mainnet',
      },
      NetworkEnablementController: {
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
            '0xe708': true,
            '0x2105': true,
          },
        },
      },
    },
  },
};

function stateWithArc(
  overrides: Partial<typeof defaultArcConfiguration> = {},
  enablementValue: boolean | undefined = true,
) {
  const state = cloneDeep(baseState);
  (
    state.engine.backgroundState.NetworkController
      .networkConfigurationsByChainId as Record<string, unknown>
  )[ARC_CHAIN_ID] = {
    ...cloneDeep(defaultArcConfiguration),
    ...overrides,
  };
  if (enablementValue !== undefined) {
    (
      state.engine.backgroundState.NetworkEnablementController
        .enabledNetworkMap.eip155 as Record<string, boolean>
    )[ARC_CHAIN_ID] = enablementValue;
  }
  return state;
}

describe(`Migration ${migrationVersion}: Revert unreleased Arc default-add`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
    process.env.MM_INFURA_PROJECT_ID = unitTestInfuraId;
  });

  afterEach(() => {
    delete process.env.MM_INFURA_PROJECT_ID;
  });

  it('returns state unchanged if ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = stateWithArc();
    const result = migrate(state);
    expect(result).toStrictEqual(state);
  });

  it('returns state unchanged if NetworkController is missing', () => {
    const state = {
      engine: {
        backgroundState: {},
      },
    };
    const result = migrate(state);
    expect(result).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('missing NetworkController'),
      }),
    );
  });

  it('returns state unchanged if Arc is not present', () => {
    const state = cloneDeep(baseState);
    const result = migrate(state);
    expect(result).toEqual(state);
  });

  it('removes the Arc network configuration when it exactly matches the migration 145 default', () => {
    const state = stateWithArc();
    const result = migrate(state) as typeof baseState;

    const configs =
      result.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId;
    expect(
      (configs as Record<string, unknown>)[ARC_CHAIN_ID],
    ).toBeUndefined();
  });

  it('removes the Arc entry from the enablement map', () => {
    const state = stateWithArc();
    const result = migrate(state) as typeof baseState;

    expect(
      result.engine.backgroundState.NetworkEnablementController
        .enabledNetworkMap.eip155,
    ).not.toHaveProperty(ARC_CHAIN_ID);
  });

  it('force-enables mainnet if Arc was the only enabled EVM network', () => {
    const state = stateWithArc();
    state.engine.backgroundState.NetworkEnablementController.enabledNetworkMap.eip155 =
      {
        '0x1': false,
        '0xe708': false,
        '0x2105': false,
        [ARC_CHAIN_ID]: true,
      };

    const result = migrate(state) as typeof baseState;

    const eip155Map =
      result.engine.backgroundState.NetworkEnablementController
        .enabledNetworkMap.eip155;
    expect(eip155Map).not.toHaveProperty(ARC_CHAIN_ID);
    expect(eip155Map['0x1']).toBe(true);
    expect(
      result.engine.backgroundState.NetworkController.selectedNetworkClientId,
    ).toBe('mainnet');
  });

  it('does not force-enable mainnet if another network was already enabled alongside Arc', () => {
    const state = stateWithArc();
    state.engine.backgroundState.NetworkEnablementController.enabledNetworkMap.eip155 =
      {
        '0x1': false,
        '0xe708': true,
        '0x2105': false,
        [ARC_CHAIN_ID]: true,
      };

    const result = migrate(state) as typeof baseState;

    const eip155Map =
      result.engine.backgroundState.NetworkEnablementController
        .enabledNetworkMap.eip155;
    expect(eip155Map).not.toHaveProperty(ARC_CHAIN_ID);
    expect(eip155Map['0x1']).toBe(false);
    expect(eip155Map['0xe708']).toBe(true);
  });

  it('does not touch unrelated networks', () => {
    const state = stateWithArc();
    const result = migrate(state) as typeof baseState;

    const configs = result.engine.backgroundState.NetworkController
      .networkConfigurationsByChainId as Record<string, unknown>;
    expect(configs['0x1']).toEqual(
      baseState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId['0x1'],
    );
  });

  it('falls back selectedNetworkClientId to mainnet if the user was on the Arc client', () => {
    const state = stateWithArc();
    state.engine.backgroundState.NetworkController.selectedNetworkClientId =
      defaultArcRpcEndpoint.networkClientId;

    const result = migrate(state) as typeof baseState;

    expect(
      result.engine.backgroundState.NetworkController.selectedNetworkClientId,
    ).toBe('mainnet');
  });

  it('leaves selectedNetworkClientId untouched if the user was on a different network', () => {
    const state = stateWithArc();

    const result = migrate(state) as typeof baseState;

    expect(
      result.engine.backgroundState.NetworkController.selectedNetworkClientId,
    ).toBe('mainnet');
  });

  it.each([
    ['renamed by the user', { name: 'My Arc' }],
    ['currency changed by the user', { nativeCurrency: 'ARC' }],
    [
      'RPC URL replaced by the user',
      {
        rpcEndpoints: [
          { ...defaultArcRpcEndpoint, url: 'https://rpc.arc.network' },
        ],
      },
    ],
    [
      'failover URL added by the user',
      {
        rpcEndpoints: [
          {
            ...defaultArcRpcEndpoint,
            failoverUrls: ['https://failover.example.com'],
          },
        ],
      },
    ],
    [
      'extra RPC endpoint added by the user',
      {
        rpcEndpoints: [
          defaultArcRpcEndpoint,
          {
            networkClientId: 'user-added',
            type: 'custom',
            url: 'https://second-endpoint.example.com',
            failoverUrls: [],
          },
        ],
      },
    ],
    ['block explorer changed by the user', { blockExplorerUrls: ['https://custom-explorer.example.com'] }],
  ])(
    'leaves the Arc network configuration untouched when %s',
    (_description, overrides) => {
      const state = stateWithArc(overrides);
      const before = cloneDeep(state);

      const result = migrate(state) as typeof baseState;

      const configs = result.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId as Record<string, unknown>;
      expect(configs[ARC_CHAIN_ID]).toEqual(
        (
          before.engine.backgroundState.NetworkController
            .networkConfigurationsByChainId as Record<string, unknown>
        )[ARC_CHAIN_ID],
      );
      expect(
        result.engine.backgroundState.NetworkEnablementController
          .enabledNetworkMap.eip155,
      ).toHaveProperty(ARC_CHAIN_ID);
    },
  );

  it('leaves a manually-added Arc network (added before the auto-migration existed) untouched', () => {
    const state = stateWithArc(
      {
        rpcEndpoints: [
          {
            networkClientId: 'user-added-arc',
            type: 'custom',
            url: 'https://rpc.arc.network',
            failoverUrls: [],
          },
        ],
      },
      undefined,
    );

    const result = migrate(state) as typeof baseState;

    const configs = result.engine.backgroundState.NetworkController
      .networkConfigurationsByChainId as Record<string, unknown>;
    expect(configs[ARC_CHAIN_ID]).toBeDefined();
  });

  it('does not revert if the Infura project ID is unset (nothing of ours to recognize)', () => {
    process.env.MM_INFURA_PROJECT_ID = '';
    const state = stateWithArc();

    const result = migrate(state) as typeof baseState;

    const configs = result.engine.backgroundState.NetworkController
      .networkConfigurationsByChainId as Record<string, unknown>;
    expect(configs[ARC_CHAIN_ID]).toBeDefined();
  });

  it('skips the NetworkEnablementController cleanup gracefully if it is missing', () => {
    const state = stateWithArc();
    delete (state.engine.backgroundState as Record<string, unknown>)
      .NetworkEnablementController;

    const result = migrate(state) as Record<string, unknown>;
    const backgroundState = (result.engine as Record<string, unknown>)
      .backgroundState as Record<string, unknown>;
    const networkController = backgroundState.NetworkController as Record<
      string,
      unknown
    >;
    const configs = networkController.networkConfigurationsByChainId as Record<
      string,
      unknown
    >;

    expect(configs[ARC_CHAIN_ID]).toBeUndefined();
    expect(backgroundState.NetworkEnablementController).toBeUndefined();
  });

  it('returns original state on unexpected error', () => {
    mockedEnsureValidState.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const state = stateWithArc();
    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Unexpected error'),
      }),
    );
  });

  describe('running after migration 145, in sequence', () => {
    it('removes Arc for a user who never touched the auto-added network', () => {
      mockedEnsureValidState.mockReturnValue(true);

      const stateAfter145 = migrateArc(cloneDeep(baseState)) as typeof baseState;
      const configsAfter145 =
        stateAfter145.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId as Record<string, unknown>;
      expect(configsAfter145[ARC_CHAIN_ID]).toBeDefined();

      const stateAfter149 = migrate(stateAfter145) as typeof baseState;
      const configsAfter149 =
        stateAfter149.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId as Record<string, unknown>;
      expect(configsAfter149[ARC_CHAIN_ID]).toBeUndefined();
      expect(
        stateAfter149.engine.backgroundState.NetworkEnablementController
          .enabledNetworkMap.eip155,
      ).not.toHaveProperty(ARC_CHAIN_ID);
    });

    it('keeps Arc for a user who had already customized it between the two migrations', () => {
      mockedEnsureValidState.mockReturnValue(true);

      const stateAfter145 = migrateArc(cloneDeep(baseState)) as typeof baseState;
      const configs =
        stateAfter145.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId as Record<string, unknown>;
      // Simulate the user renaming the network before 149 ever runs.
      (configs[ARC_CHAIN_ID] as { name: string }).name = 'My Custom Arc';

      const stateAfter149 = migrate(stateAfter145) as typeof baseState;
      const configsAfter149 =
        stateAfter149.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId as Record<string, unknown>;
      expect(configsAfter149[ARC_CHAIN_ID]).toBeDefined();
      expect(
        (configsAfter149[ARC_CHAIN_ID] as { name: string }).name,
      ).toBe('My Custom Arc');
    });
  });
});
