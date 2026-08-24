import { captureException } from '@sentry/react-native';
import migrate, { migrationVersion } from './149';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

const mockedCaptureException = jest.mocked(captureException);
const mockedEnsureValidState = jest.mocked(ensureValidState);

const INFURA_IPFS_GATEWAY = 'https://ipfs.infura.io/ipfs/';
const DEFAULT_IPFS_GATEWAY = 'https://dweb.link/ipfs/';

const createState = (preferencesController: unknown) => ({
  engine: {
    backgroundState: {
      PreferencesController: preferencesController,
      OtherController: { preserved: true },
    },
    preserved: true,
  },
  preserved: true,
});

describe(`Migration ${migrationVersion}: replace the Infura IPFS gateway`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureValidState.mockReturnValue(true);
  });

  it('reports migration version 149', () => {
    expect(migrationVersion).toBe(149);
  });

  it('replaces the Infura IPFS gateway with the default gateway', () => {
    const state = createState({
      ipfsGateway: INFURA_IPFS_GATEWAY,
      useTokenDetection: true,
    });

    const result = migrate(state) as ReturnType<typeof createState>;

    expect(result.engine.backgroundState.PreferencesController).toStrictEqual({
      ipfsGateway: DEFAULT_IPFS_GATEWAY,
      useTokenDetection: true,
    });
  });

  it('preserves unrelated persisted state when replacing the gateway', () => {
    const state = createState({ ipfsGateway: INFURA_IPFS_GATEWAY });

    const result = migrate(state) as ReturnType<typeof createState>;

    expect(result.preserved).toBe(true);
    expect(result.engine.preserved).toBe(true);
    expect(result.engine.backgroundState.OtherController).toStrictEqual({
      preserved: true,
    });
  });

  it('returns the same state when another IPFS gateway is selected', () => {
    const state = createState({ ipfsGateway: 'https://ipfs.io/ipfs/' });

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it('returns the same state when the IPFS gateway is absent', () => {
    const state = createState({ useTokenDetection: true });

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });

  it.each([null, 'invalid'])(
    'captures an exception when PreferencesController is %p',
    (preferencesController) => {
      const state = createState(preferencesController);

      const result = migrate(state);

      expect(result).toBe(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          `Migration ${migrationVersion}: Invalid PreferencesController state: '${typeof preferencesController}'`,
        ),
      );
    },
  );

  it('returns the same state when state validation fails', () => {
    const state = createState({ ipfsGateway: INFURA_IPFS_GATEWAY });
    mockedEnsureValidState.mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
    expect(mockedCaptureException).not.toHaveBeenCalled();
  });
});
