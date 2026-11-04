import { captureException } from '@sentry/react-native';

import migrate, { migrationVersion } from './161';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedEnsureValidState = jest.mocked(ensureValidState);
const mockedCaptureException = jest.mocked(captureException);

const buildState = (networkConfigurationsByChainId: unknown) => ({
  engine: {
    backgroundState: {
      NetworkController: {
        networkConfigurationsByChainId,
        selectedNetworkClientId: 'mainnet',
      },
    },
  },
});

const getConfigurations = (state: unknown) =>
  (
    state as {
      engine: {
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: Record<
              string,
              Record<string, unknown>
            >;
          };
        };
      };
    }
  ).engine.backgroundState.NetworkController.networkConfigurationsByChainId;

describe(`migration #${migrationVersion}`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports the expected migration version', () => {
    expect(migrationVersion).toBe(161);
  });

  it('returns the state unchanged when it is invalid', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { engine: 'invalid' };

    expect(migrate(state)).toBe(state);
  });

  it('returns the state unchanged when NetworkController is missing', () => {
    const state = { engine: { backgroundState: {} } };

    expect(migrate(state)).toEqual({ engine: { backgroundState: {} } });
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('removes null block explorers and drops the default index when none remain', () => {
    const state = buildState({
      '0x64': {
        chainId: '0x64',
        blockExplorerUrls: [null],
        defaultBlockExplorerUrlIndex: 0,
      },
    });

    const configurations = getConfigurations(migrate(state));

    expect(configurations['0x64'].blockExplorerUrls).toStrictEqual([]);
    expect(configurations['0x64']).not.toHaveProperty(
      'defaultBlockExplorerUrlIndex',
    );
  });

  it('keeps the default index on the same explorer after removing a null before it', () => {
    const state = buildState({
      '0xa': {
        chainId: '0xa',
        blockExplorerUrls: [null, 'https://a.example', 'https://b.example'],
        defaultBlockExplorerUrlIndex: 2,
      },
    });

    const configurations = getConfigurations(migrate(state));

    expect(configurations['0xa'].blockExplorerUrls).toStrictEqual([
      'https://a.example',
      'https://b.example',
    ]);
    expect(configurations['0xa'].defaultBlockExplorerUrlIndex).toBe(1);
  });

  it('points the default index at the first explorer when it was the null entry', () => {
    const state = buildState({
      '0xa': {
        chainId: '0xa',
        blockExplorerUrls: ['https://a.example', null],
        defaultBlockExplorerUrlIndex: 1,
      },
    });

    const configurations = getConfigurations(migrate(state));

    expect(configurations['0xa'].blockExplorerUrls).toStrictEqual([
      'https://a.example',
    ]);
    expect(configurations['0xa'].defaultBlockExplorerUrlIndex).toBe(0);
  });

  it('removes the derived caipChainId field', () => {
    const state = buildState({
      '0x89': {
        chainId: '0x89',
        caipChainId: 'eip155:137',
        blockExplorerUrls: ['https://a.example'],
        defaultBlockExplorerUrlIndex: 0,
      },
    });

    const configurations = getConfigurations(migrate(state));

    expect(configurations['0x89']).not.toHaveProperty('caipChainId');
    expect(configurations['0x89'].blockExplorerUrls).toStrictEqual([
      'https://a.example',
    ]);
  });

  it('leaves valid configurations untouched', () => {
    const valid = {
      chainId: '0x1',
      blockExplorerUrls: ['https://a.example'],
      defaultBlockExplorerUrlIndex: 0,
    };
    const state = buildState({ '0x1': { ...valid } });

    expect(getConfigurations(migrate(state))['0x1']).toStrictEqual(valid);
  });

  it('skips configurations that are not objects or have no explorer array', () => {
    const state = buildState({
      '0x1': 'invalid',
      '0x2': { chainId: '0x2', blockExplorerUrls: 'invalid' },
    });

    const configurations = getConfigurations(migrate(state));

    expect(configurations['0x1']).toBe('invalid');
    expect(configurations['0x2'].blockExplorerUrls).toBe('invalid');
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does not throw when networkConfigurationsByChainId is not an object', () => {
    const state = buildState(null);

    expect(() => migrate(state)).not.toThrow();
  });
});
