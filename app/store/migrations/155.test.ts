import { captureException } from '@sentry/react-native';

import migrate, { migrationVersion } from './155';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

const ROBINHOOD_CHAIN_ID = '0x1237';
const OLD_URL = 'https://robinhoodchain.blockscout.com';
const NEW_URL = 'https://robin.etherscan.io/';

interface NetworkConfiguration {
  blockExplorerUrls: string[];
  chainId: string;
  defaultBlockExplorerUrlIndex: number;
  defaultRpcEndpointIndex: number;
  name: string;
  nativeCurrency: string;
  rpcEndpoints: {
    networkClientId: string;
    type: string;
    url: string;
  }[];
}

interface TestState {
  engine: {
    backgroundState: {
      NetworkController?: {
        networkConfigurationsByChainId: Record<string, NetworkConfiguration>;
        selectedNetworkClientId: string;
      };
      [key: string]: unknown;
    };
  };
}

function buildRobinhoodConfiguration(
  blockExplorerUrls: string[],
): NetworkConfiguration {
  return {
    blockExplorerUrls,
    chainId: ROBINHOOD_CHAIN_ID,
    defaultBlockExplorerUrlIndex: 1,
    defaultRpcEndpointIndex: 0,
    name: 'Robinhood Chain',
    nativeCurrency: 'ETH',
    rpcEndpoints: [
      {
        networkClientId: 'robinhood-mainnet',
        type: 'custom',
        url: 'https://robinhood-mainnet.infura.io/v3/test',
      },
    ],
  };
}

function buildState(robinhoodConfiguration?: NetworkConfiguration): TestState {
  return {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: robinhoodConfiguration
            ? { [ROBINHOOD_CHAIN_ID]: robinhoodConfiguration }
            : {},
          selectedNetworkClientId: 'robinhood-mainnet',
        },
      },
    },
  };
}

function getRobinhoodConfiguration(state: TestState) {
  return state.engine.backgroundState.NetworkController
    ?.networkConfigurationsByChainId[ROBINHOOD_CHAIN_ID];
}

describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(155);
  });

  it('replaces deprecated Robinhood explorer URLs and preserves their indexes', () => {
    const customUrl = 'https://custom-explorer.example';
    const state = buildState(
      buildRobinhoodConfiguration([customUrl, OLD_URL, `${OLD_URL}/`]),
    );

    const result = migrate(state) as TestState;

    expect(getRobinhoodConfiguration(result)).toMatchObject({
      blockExplorerUrls: [customUrl, NEW_URL, NEW_URL],
      defaultBlockExplorerUrlIndex: 1,
    });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('leaves custom and lookalike explorer URLs unchanged', () => {
    const urls = [
      'https://custom-explorer.example',
      'https://robinhoodchain.blockscout.com.attacker.example',
    ];
    const state = buildState(buildRobinhoodConfiguration(urls));

    const result = migrate(state) as TestState;

    expect(getRobinhoodConfiguration(result)?.blockExplorerUrls).toStrictEqual(
      urls,
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('is a no-op when Robinhood Chain is not configured', () => {
    const state = buildState();
    const stateBeforeMigration = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(stateBeforeMigration);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('is a no-op when NetworkController is missing', () => {
    const state: TestState = {
      engine: { backgroundState: { OtherController: {} } },
    };
    const stateBeforeMigration = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(stateBeforeMigration);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
