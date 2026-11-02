import { captureException } from '@sentry/react-native';

import migrate, { migrationVersion } from './156';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

const TEMPO_CHAIN_ID = '0x1079';
const OTHER_CHAIN_ID = '0x1';

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

function buildNetworkConfiguration(
  chainId: string,
  nativeCurrency: string,
): NetworkConfiguration {
  return {
    blockExplorerUrls: ['https://explorer.example'],
    chainId,
    defaultBlockExplorerUrlIndex: 0,
    defaultRpcEndpointIndex: 0,
    name: 'Test Network',
    nativeCurrency,
    rpcEndpoints: [
      {
        networkClientId: 'test-network',
        type: 'custom',
        url: 'https://rpc.example',
      },
    ],
  };
}

function buildState(tempoNativeCurrency?: string): TestState {
  return {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurationsByChainId: {
            [OTHER_CHAIN_ID]: buildNetworkConfiguration(OTHER_CHAIN_ID, 'ETH'),
            ...(tempoNativeCurrency !== undefined && {
              [TEMPO_CHAIN_ID]: buildNetworkConfiguration(
                TEMPO_CHAIN_ID,
                tempoNativeCurrency,
              ),
            }),
          },
          selectedNetworkClientId: 'mainnet',
        },
      },
    },
  };
}

function getConfiguration(state: TestState, chainId: string) {
  return state.engine.backgroundState.NetworkController
    ?.networkConfigurationsByChainId[chainId];
}

describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(156);
  });

  it.each(['pathUSD', 'PATHUSD'])(
    'replaces the Tempo native currency %s with USD',
    (nativeCurrency) => {
      const state = buildState(nativeCurrency);

      const result = migrate(state) as TestState;

      expect(getConfiguration(result, TEMPO_CHAIN_ID)?.nativeCurrency).toBe(
        'USD',
      );
      expect(mockedCaptureException).not.toHaveBeenCalled();
    },
  );

  it('does not modify other networks', () => {
    const state = buildState('pathUSD');

    const result = migrate(state) as TestState;

    expect(getConfiguration(result, OTHER_CHAIN_ID)).toStrictEqual(
      buildNetworkConfiguration(OTHER_CHAIN_ID, 'ETH'),
    );
  });

  it.each(['USD', 'CUSTOM'])(
    'leaves Tempo unchanged when the native currency is %s',
    (nativeCurrency) => {
      const state = buildState(nativeCurrency);

      const result = migrate(state) as TestState;

      expect(getConfiguration(result, TEMPO_CHAIN_ID)?.nativeCurrency).toBe(
        nativeCurrency,
      );
      expect(mockedCaptureException).not.toHaveBeenCalled();
    },
  );

  it('is a no-op when Tempo is not configured', () => {
    const state = buildState();
    const stateBeforeMigration = JSON.stringify(state);

    const result = migrate(state);

    expect(JSON.stringify(result)).toBe(stateBeforeMigration);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('is a no-op when the Tempo configuration is invalid', () => {
    const state = buildState();
    (
      state.engine.backgroundState.NetworkController
        ?.networkConfigurationsByChainId as Record<string, unknown>
    )[TEMPO_CHAIN_ID] = { chainId: TEMPO_CHAIN_ID };
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
