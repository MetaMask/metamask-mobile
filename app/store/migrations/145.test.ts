import { captureException } from '@sentry/react-native';
import { cloneDeep } from 'lodash';

import { ensureValidState } from './util';
import migrate, { migrationVersion, ARC_CHAIN_ID } from './145';

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

interface EnablementState {
  enabledNetworkMap: {
    eip155: Record<string, boolean>;
  };
}

const popularNetworkEnablementState: EnablementState = {
  enabledNetworkMap: {
    eip155: {
      '0x1': true,
      '0xe708': true,
      '0x2105': true,
    },
  },
};

const singleNetworkEnablementState: EnablementState = {
  enabledNetworkMap: {
    eip155: {
      '0x1': true,
    },
  },
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
      NetworkEnablementController: cloneDeep(popularNetworkEnablementState),
    },
  },
};

describe(`Migration ${migrationVersion}: Add Arc network`, () => {
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
    const state = cloneDeep(baseState);
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

  it('returns state unchanged if networkConfigurationsByChainId is missing', () => {
    const state = {
      engine: {
        backgroundState: {
          NetworkController: {},
        },
      },
    };
    const result = migrate(state);
    expect(result).toEqual(state);
    expect(mockedCaptureException).toHaveBeenCalled();
  });

  it('returns state unchanged if Arc is already present', () => {
    const state = cloneDeep(baseState);
    (
      state.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId as Record<string, unknown>
    )[ARC_CHAIN_ID] = {
      chainId: ARC_CHAIN_ID,
      name: 'Arc',
      nativeCurrency: 'USDC',
      blockExplorerUrls: ['https://explorer.arc.io/'],
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [
        {
          networkClientId: 'existing-arc',
          type: 'custom',
          url: 'https://rpc.arc.network',
        },
      ],
    };

    const result = migrate(state) as typeof baseState;
    const configs =
      result.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId;
    expect((configs as Record<string, unknown>)[ARC_CHAIN_ID]).toEqual(
      (
        state.engine.backgroundState.NetworkController
          .networkConfigurationsByChainId as Record<string, unknown>
      )[ARC_CHAIN_ID],
    );
  });

  it('adds Arc network configuration when not present', () => {
    const state = cloneDeep(baseState);
    const result = migrate(state) as typeof baseState;

    const configs = result.engine.backgroundState.NetworkController
      .networkConfigurationsByChainId as Record<string, unknown>;

    expect(configs[ARC_CHAIN_ID]).toEqual({
      chainId: ARC_CHAIN_ID,
      name: 'Arc',
      nativeCurrency: 'USDC',
      blockExplorerUrls: ['https://explorer.arc.io/'],
      defaultBlockExplorerUrlIndex: 0,
      defaultRpcEndpointIndex: 0,
      rpcEndpoints: [
        {
          networkClientId: 'mock-uuid',
          type: 'custom',
          url: `https://arc-mainnet.infura.io/v3/${unitTestInfuraId}`,
          failoverUrls: [],
        },
      ],
    });
  });

  it('does not modify existing networks when adding Arc', () => {
    const state = cloneDeep(baseState);
    const result = migrate(state) as typeof baseState;

    const configs = result.engine.backgroundState.NetworkController
      .networkConfigurationsByChainId as Record<string, unknown>;

    expect(configs['0x1']).toEqual(
      baseState.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId['0x1'],
    );
  });

  it('captures exception and skips if Infura project ID is not set', () => {
    process.env.MM_INFURA_PROJECT_ID = '';
    const state = cloneDeep(baseState);
    const result = migrate(state) as typeof baseState;

    const configs = result.engine.backgroundState.NetworkController
      .networkConfigurationsByChainId as Record<string, unknown>;

    expect(configs[ARC_CHAIN_ID]).toBeUndefined();
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Infura project ID is not set'),
      }),
    );
  });

  it('returns original state on unexpected error', () => {
    mockedEnsureValidState.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const state = cloneDeep(baseState);
    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Unexpected error'),
      }),
    );
  });

  describe('NetworkEnablementController', () => {
    it('adds Arc as enabled when user is in popular networks mode (>1 enabled)', () => {
      const state = cloneDeep(baseState);
      state.engine.backgroundState.NetworkEnablementController = cloneDeep(
        popularNetworkEnablementState,
      );

      const result = migrate(state) as typeof baseState;

      const enablementMap = (
        result.engine.backgroundState as Record<string, unknown>
      ).NetworkEnablementController as EnablementState;

      expect(enablementMap.enabledNetworkMap.eip155[ARC_CHAIN_ID]).toBe(true);
    });

    it('adds Arc as disabled when user has only one network enabled', () => {
      const state = cloneDeep(baseState);
      state.engine.backgroundState.NetworkEnablementController = cloneDeep(
        singleNetworkEnablementState,
      );

      const result = migrate(state) as typeof baseState;

      const enablementMap = (
        result.engine.backgroundState as Record<string, unknown>
      ).NetworkEnablementController as EnablementState;

      expect(enablementMap.enabledNetworkMap.eip155[ARC_CHAIN_ID]).toBe(false);
    });

    it('does not overwrite Arc in enablement map if already present', () => {
      const state = cloneDeep(baseState);
      state.engine.backgroundState.NetworkEnablementController = {
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
            '0xe708': true,
            [ARC_CHAIN_ID]: false,
          },
        },
      };

      const result = migrate(state) as typeof baseState;

      const enablementMap = (
        result.engine.backgroundState as Record<string, unknown>
      ).NetworkEnablementController as EnablementState;

      expect(enablementMap.enabledNetworkMap.eip155[ARC_CHAIN_ID]).toBe(false);
    });

    it('skips enablement migration gracefully if NetworkEnablementController is missing', () => {
      const state = cloneDeep(baseState);
      delete (state.engine.backgroundState as Record<string, unknown>)
        .NetworkEnablementController;

      const result = migrate(state) as Record<string, unknown>;
      const backgroundState = (result.engine as Record<string, unknown>)
        .backgroundState as Record<string, unknown>;

      const networkController = backgroundState.NetworkController as Record<
        string,
        unknown
      >;
      const configs =
        networkController.networkConfigurationsByChainId as Record<
          string,
          unknown
        >;
      expect(configs[ARC_CHAIN_ID]).toBeDefined();
      expect(backgroundState.NetworkEnablementController).toBeUndefined();
    });

    it('skips enablement migration if enabledNetworkMap is invalid', () => {
      const state = cloneDeep(baseState);
      (
        state.engine.backgroundState as Record<string, unknown>
      ).NetworkEnablementController = { enabledNetworkMap: 'invalid' };

      const result = migrate(state) as typeof baseState;

      const configs = result.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId as Record<string, unknown>;
      expect(configs[ARC_CHAIN_ID]).toBeDefined();
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('NetworkEnablementController'),
        }),
      );
    });

    it('skips enablement migration if eip155 namespace is missing', () => {
      const state = cloneDeep(baseState);
      (
        state.engine.backgroundState as Record<string, unknown>
      ).NetworkEnablementController = {
        enabledNetworkMap: { solana: {} },
      };

      const result = migrate(state) as typeof baseState;

      const configs = result.engine.backgroundState.NetworkController
        .networkConfigurationsByChainId as Record<string, unknown>;
      expect(configs[ARC_CHAIN_ID]).toBeDefined();
      expect(mockedCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('missing property eip155'),
        }),
      );
    });
  });
});
