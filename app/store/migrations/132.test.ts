import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './132';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

const SEI_MAINNET_CHAIN_ID = '0x531';

interface SeiNetworkConfiguration {
  blockExplorerUrls: string[];
  chainId: string;
  defaultBlockExplorerUrlIndex?: number;
  defaultRpcEndpointIndex: number;
  name: string;
  nativeCurrency: string;
  rpcEndpoints: {
    networkClientId: string;
    url: string;
    type: string;
    failoverUrls?: string[];
  }[];
}

interface TestState {
  engine: {
    backgroundState: {
      NetworkController?: {
        networkConfigurationsByChainId?: Record<
          string,
          SeiNetworkConfiguration
        >;
        selectedNetworkClientId?: string;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
  };
  [key: string]: unknown;
}

function buildSeiConfig(blockExplorerUrls: string[]): SeiNetworkConfiguration {
  return {
    blockExplorerUrls,
    chainId: SEI_MAINNET_CHAIN_ID,
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    name: 'Sei',
    nativeCurrency: 'SEI',
    rpcEndpoints: [
      {
        networkClientId: 'sei-mainnet',
        url: 'https://sei-mainnet.infura.io/v3/fake',
        type: 'custom',
      },
    ],
  };
}

function buildState(seiConfig?: SeiNetworkConfiguration): TestState {
  return {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: seiConfig
            ? { [SEI_MAINNET_CHAIN_ID]: seiConfig }
            : {},
          selectedNetworkClientId: 'mainnet',
        },
      },
    },
  };
}

describe(`Migration ${migrationVersion}: Replace Seitrace with Seiscan for Sei Mainnet`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(132);
  });

  it('rewrites Seitrace block explorer URL to Seiscan for Sei Mainnet', () => {
    const state = buildState(buildSeiConfig(['https://seitrace.com']));

    const result = migrate(state) as TestState;

    const seiConfig =
      result.engine.backgroundState.NetworkController
        ?.networkConfigurationsByChainId?.[SEI_MAINNET_CHAIN_ID];
    expect(seiConfig?.blockExplorerUrls).toStrictEqual(['https://seiscan.io']);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves state unchanged when Sei Mainnet is not configured', () => {
    const state: TestState = {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': buildSeiConfig(['https://etherscan.io']),
            },
            selectedNetworkClientId: 'mainnet',
          },
        },
      },
    };
    const snapshotBefore = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(snapshotBefore);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('silently skips when NetworkController is missing (upgrade-from-old-version)', () => {
    const state = {
      engine: {
        backgroundState: {
          SomeOtherController: { foo: 'bar' },
        },
      },
    };
    const snapshotBefore = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(snapshotBefore);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not touch user-customized block explorer URLs', () => {
    const state = buildState(buildSeiConfig(['https://seistream.app']));

    const result = migrate(state) as TestState;

    const seiConfig =
      result.engine.backgroundState.NetworkController
        ?.networkConfigurationsByChainId?.[SEI_MAINNET_CHAIN_ID];
    expect(seiConfig?.blockExplorerUrls).toStrictEqual([
      'https://seistream.app',
    ]);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
