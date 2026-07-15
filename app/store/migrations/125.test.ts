import migrate from './125';
import { captureException } from '@sentry/react-native';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));
const mockedCaptureException = jest.mocked(captureException);

const migrationVersion = 125;

const createValidState = (preferencesController?: unknown) => ({
  engine: {
    backgroundState: {
      ...(preferencesController !== undefined && {
        PreferencesController: preferencesController,
      }),
    },
  },
});

describe(`Migration ${migrationVersion}: Remove deprecated PreferencesController properties`, () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('invalid PreferencesController state', () => {
    it('captures exception and returns state if PreferencesController is not an object', async () => {
      const state = createValidState('invalid');
      const result = await migrate(state);

      expect(result).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          `Migration ${migrationVersion}: Invalid PreferencesController state: 'string'`,
        ),
      );
    });

    it('captures exception and returns state if PreferencesController is null', async () => {
      const state = createValidState(null);
      const result = await migrate(state);

      expect(result).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          `Migration ${migrationVersion}: Invalid PreferencesController state: 'object'`,
        ),
      );
    });
  });

  describe('no-op when properties are absent', () => {
    it('captures exception and returns state if PreferencesController is missing', async () => {
      const state = createValidState();
      const result = await migrate(state);

      expect(result).toStrictEqual(state);
      expect(mockedCaptureException).toHaveBeenCalledWith(
        new Error(
          `Migration ${migrationVersion}: Invalid PreferencesController state: 'undefined'`,
        ),
      );
    });

    it('does not modify state if none of the deprecated properties exist', async () => {
      const state = createValidState({
        featureFlags: {},
        ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
      });
      const result = await migrate(state);

      expect(result).toStrictEqual(state);
    });
  });

  describe('removes deprecated properties', () => {
    it('removes smartAccountOptInForAccounts', async () => {
      const state = createValidState({
        featureFlags: {},
        smartAccountOptInForAccounts: { '0x1': true },
      });

      const result = await migrate(state);
      const prefs = (result as ReturnType<typeof createValidState>).engine
        .backgroundState.PreferencesController as Record<string, unknown>;

      expect(prefs).not.toHaveProperty('smartAccountOptInForAccounts');
      expect(prefs.featureFlags).toStrictEqual({});
    });

    it('removes identities', async () => {
      const state = createValidState({
        featureFlags: {},
        identities: { '0xabc': { name: 'Account 1', address: '0xabc' } },
      });

      const result = await migrate(state);
      const prefs = (result as ReturnType<typeof createValidState>).engine
        .backgroundState.PreferencesController as Record<string, unknown>;

      expect(prefs).not.toHaveProperty('identities');
      expect(prefs.featureFlags).toStrictEqual({});
    });

    it('removes selectedAddress', async () => {
      const state = createValidState({
        featureFlags: {},
        selectedAddress: '0xabc',
      });

      const result = await migrate(state);
      const prefs = (result as ReturnType<typeof createValidState>).engine
        .backgroundState.PreferencesController as Record<string, unknown>;

      expect(prefs).not.toHaveProperty('selectedAddress');
      expect(prefs.featureFlags).toStrictEqual({});
    });

    it('removes lostIdentities', async () => {
      const state = createValidState({
        featureFlags: {},
        lostIdentities: { '0xdef': { name: 'Lost', address: '0xdef' } },
      });

      const result = await migrate(state);
      const prefs = (result as ReturnType<typeof createValidState>).engine
        .backgroundState.PreferencesController as Record<string, unknown>;

      expect(prefs).not.toHaveProperty('lostIdentities');
      expect(prefs.featureFlags).toStrictEqual({});
    });

    it('removes all four deprecated properties at once', async () => {
      const state = createValidState({
        featureFlags: {},
        ipfsGateway: 'https://cloudflare-ipfs.com/ipfs/',
        smartAccountOptInForAccounts: { '0x1': true },
        identities: { '0xabc': { name: 'Account 1', address: '0xabc' } },
        selectedAddress: '0xabc',
        lostIdentities: { '0xdef': { name: 'Lost', address: '0xdef' } },
      });

      const result = await migrate(state);
      const prefs = (result as ReturnType<typeof createValidState>).engine
        .backgroundState.PreferencesController as Record<string, unknown>;

      expect(prefs).not.toHaveProperty('smartAccountOptInForAccounts');
      expect(prefs).not.toHaveProperty('identities');
      expect(prefs).not.toHaveProperty('selectedAddress');
      expect(prefs).not.toHaveProperty('lostIdentities');
      expect(prefs.featureFlags).toStrictEqual({});
      expect(prefs.ipfsGateway).toBe('https://cloudflare-ipfs.com/ipfs/');
    });
  });
});
