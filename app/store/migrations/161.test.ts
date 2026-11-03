import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './161';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const createState = (networkConfigurationsByChainId: unknown) => ({
  engine: {
    backgroundState: {
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networkConfigurationsByChainId,
      },
      OtherController: { preserved: true },
    },
  },
});

describe(`Migration ${migrationVersion}: remove RPC endpoint failoverUrls`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports migration version 161', () => {
    expect(migrationVersion).toBe(161);
  });

  it('returns state unchanged when ensureValidState fails', () => {
    mockedEnsureValidState.mockReturnValue(false);
    const state = { some: 'state' };

    expect(migrate(state)).toBe(state);
  });

  it('removes failoverUrls from Infura and custom endpoints and keeps other fields', () => {
    const state = createState({
      '0x1': {
        chainId: '0x1',
        name: 'Ethereum',
        defaultRpcEndpointIndex: 0,
        rpcEndpoints: [
          {
            type: 'infura',
            networkClientId: 'mainnet',
            url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
            failoverUrls: ['https://failover.example.com'],
          },
          {
            type: 'custom',
            networkClientId: 'abc',
            url: 'https://custom.example.com',
            name: 'Custom',
            failoverUrls: [],
          },
        ],
      },
      '0xa': {
        chainId: '0xa',
        rpcEndpoints: [
          { type: 'custom', networkClientId: 'def', url: 'https://op.example' },
        ],
      },
    });

    expect(migrate(state)).toStrictEqual(
      createState({
        '0x1': {
          chainId: '0x1',
          name: 'Ethereum',
          defaultRpcEndpointIndex: 0,
          rpcEndpoints: [
            {
              type: 'infura',
              networkClientId: 'mainnet',
              url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
            },
            {
              type: 'custom',
              networkClientId: 'abc',
              url: 'https://custom.example.com',
              name: 'Custom',
            },
          ],
        },
        '0xa': {
          chainId: '0xa',
          rpcEndpoints: [
            {
              type: 'custom',
              networkClientId: 'def',
              url: 'https://op.example',
            },
          ],
        },
      }),
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('skips invalid network configurations and endpoints without throwing', () => {
    const state = createState({
      '0x1': null,
      '0x2': { rpcEndpoints: 'invalid' },
      '0x3': { rpcEndpoints: [null, 'invalid', { failoverUrls: ['x'] }] },
    });

    expect(migrate(state)).toStrictEqual(
      createState({
        '0x1': null,
        '0x2': { rpcEndpoints: 'invalid' },
        '0x3': { rpcEndpoints: [null, 'invalid', {}] },
      }),
    );
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('does nothing when NetworkController state is missing or invalid', () => {
    const missing = { engine: { backgroundState: {} } };
    expect(migrate(missing)).toStrictEqual({ engine: { backgroundState: {} } });

    const invalid = { engine: { backgroundState: { NetworkController: 1 } } };
    expect(migrate(invalid)).toStrictEqual(invalid);

    const noConfigs = createState(undefined);
    expect(migrate(noConfigs)).toStrictEqual(createState(undefined));
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('reports errors to Sentry and returns state', () => {
    const state = createState({});
    Object.defineProperty(
      state.engine.backgroundState.NetworkController,
      'networkConfigurationsByChainId',
      {
        get() {
          throw new Error('boom');
        },
      },
    );

    expect(migrate(state)).toBe(state);
    expect(mockedCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('boom') }),
    );
  });
});
