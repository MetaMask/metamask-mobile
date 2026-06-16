import type { WalletState } from '@metamask/client-mcp-core';
import { MetaMaskMobileFixtureCapability } from '../capabilities/fixture';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import FixtureServer from '../../../tests/framework/fixtures/FixtureServer';

jest.mock('@metamask/client-mcp-core', () => ({}));
jest.mock('../../../tests/framework/fixtures/FixtureBuilder');
jest.mock('../../../tests/framework/fixtures/FixtureServer');

const VALID_FIXTURE_STATE_DATA: Record<string, unknown> = {
  engine: {},
  browser: {},
  user: {},
  fiatOrders: {},
  legalNotices: {},
};

const MockedFixtureBuilder = FixtureBuilder as jest.MockedClass<
  typeof FixtureBuilder
>;
const MockedFixtureServer = FixtureServer as jest.MockedClass<
  typeof FixtureServer
>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type MockFixtureBuilderInstance = {
  withDefaultFixture: jest.Mock;
  withOnboardingFixture: jest.Mock;
  withTokensForAllPopularNetworks: jest.Mock;
  withPopularNetworks: jest.Mock;
  build: jest.Mock;
};

const createBuilder = (fixture: {
  state: Record<string, unknown>;
  asyncState: Record<string, unknown>;
}): MockFixtureBuilderInstance => {
  const builder: MockFixtureBuilderInstance = {
    withDefaultFixture: jest.fn(),
    withOnboardingFixture: jest.fn(),
    withTokensForAllPopularNetworks: jest.fn(),
    withPopularNetworks: jest.fn(),
    build: jest.fn().mockReturnValue(fixture),
  };
  builder.withDefaultFixture.mockReturnValue(builder);
  builder.withOnboardingFixture.mockReturnValue(builder);
  builder.withTokensForAllPopularNetworks.mockReturnValue(builder);
  builder.withPopularNetworks.mockReturnValue(builder);
  return builder;
};

describe('MetaMaskMobileFixtureCapability', () => {
  let fixtureCapability: MetaMaskMobileFixtureCapability;
  let mockServer: jest.Mocked<FixtureServer>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServer = {
      setServerPort: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      loadJsonState: jest.fn(),
    } as unknown as jest.Mocked<FixtureServer>;
    MockedFixtureServer.mockImplementation(() => mockServer);
    MockedFixtureBuilder.mockImplementation(
      () => createBuilder({ state: {}, asyncState: {} }) as never,
    );
    fixtureCapability = new MetaMaskMobileFixtureCapability({ port: 12345 });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('start', () => {
    it('starts fixture server with constructor port and wallet state', async () => {
      const walletState: WalletState = {
        data: { ...VALID_FIXTURE_STATE_DATA, accounts: ['0x123'] },
        meta: { version: 1 },
      };

      await fixtureCapability.start(walletState);

      expect(mockServer.setServerPort).toHaveBeenCalledWith(12345);
      expect(mockServer.start).toHaveBeenCalled();
      expect(mockServer.loadJsonState).toHaveBeenCalledWith(
        {
          state: { ...VALID_FIXTURE_STATE_DATA, accounts: ['0x123'] },
          asyncState: { version: '1' },
        },
        null,
      );
    });

    it('uses empty async state when wallet state omits meta', async () => {
      const walletState = {
        data: { ...VALID_FIXTURE_STATE_DATA, accounts: ['0x123'] },
      } as WalletState;

      await fixtureCapability.start(walletState);

      expect(mockServer.loadJsonState).toHaveBeenCalledWith(
        {
          state: { ...VALID_FIXTURE_STATE_DATA, accounts: ['0x123'] },
          asyncState: {},
        },
        null,
      );
    });
  });

  describe('stop', () => {
    it('stops fixture server when running', async () => {
      await fixtureCapability.start({
        data: VALID_FIXTURE_STATE_DATA,
        meta: { version: 1 },
      });

      await fixtureCapability.stop();

      expect(mockServer.stop).toHaveBeenCalled();
    });

    it('skips stop when server not started', async () => {
      await fixtureCapability.stop();

      expect(mockServer.stop).not.toHaveBeenCalled();
    });
  });

  describe('getDefaultState', () => {
    it('returns default wallet state', () => {
      const builder = createBuilder({
        state: { accounts: ['0xdefault'] },
        asyncState: { version: '2' },
      });
      MockedFixtureBuilder.mockImplementation(() => builder as never);

      const result = fixtureCapability.getDefaultState();

      expect(builder.withDefaultFixture).toHaveBeenCalled();
      expect(result).toEqual({
        data: { accounts: ['0xdefault'] },
        meta: { version: 2 },
      });
    });
  });

  describe('getOnboardingState', () => {
    it('returns onboarding wallet state', () => {
      const builder = createBuilder({
        state: {},
        asyncState: { version: '1' },
      });
      MockedFixtureBuilder.mockImplementation(() => builder as never);

      const result = fixtureCapability.getOnboardingState();

      expect(builder.withOnboardingFixture).toHaveBeenCalled();
      expect(result).toEqual({ data: {}, meta: { version: 1 } });
    });
  });

  describe('resolvePreset', () => {
    it('resolves default preset', () => {
      const builder = createBuilder({
        state: { accounts: ['0xdefault'] },
        asyncState: {},
      });
      MockedFixtureBuilder.mockImplementation(() => builder as never);

      const result = fixtureCapability.resolvePreset('default');

      expect(builder.withDefaultFixture).toHaveBeenCalled();
      expect(result.data).toEqual({ accounts: ['0xdefault'] });
    });

    it('resolves onboarding preset', () => {
      const builder = createBuilder({
        state: {},
        asyncState: { version: '3' },
      });
      MockedFixtureBuilder.mockImplementation(() => builder as never);

      const result = fixtureCapability.resolvePreset('onboarding');

      expect(builder.withOnboardingFixture).toHaveBeenCalled();
      expect(result.meta).toEqual({ version: 3 });
    });

    it('resolves with-tokens preset', () => {
      const builder = createBuilder({
        state: { tokens: ['DAI'] },
        asyncState: {},
      });
      MockedFixtureBuilder.mockImplementation(() => builder as never);

      const result = fixtureCapability.resolvePreset('with-tokens');

      expect(builder.withDefaultFixture).toHaveBeenCalled();
      expect(builder.withTokensForAllPopularNetworks).toHaveBeenCalledWith([
        {
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          symbol: 'DAI',
          decimals: 18,
          name: 'Dai Stablecoin',
        },
      ]);
      expect(result.data).toEqual({ tokens: ['DAI'] });
    });

    it('resolves with-popular-networks preset', () => {
      const builder = createBuilder({
        state: { networks: ['mainnet', 'polygon'] },
        asyncState: {},
      });
      MockedFixtureBuilder.mockImplementation(() => builder as never);

      const result = fixtureCapability.resolvePreset('with-popular-networks');

      expect(builder.withDefaultFixture).toHaveBeenCalled();
      expect(builder.withPopularNetworks).toHaveBeenCalled();
      expect(result.data).toEqual({ networks: ['mainnet', 'polygon'] });
    });

    it('throws for unknown preset', () => {
      expect(() => fixtureCapability.resolvePreset('unknown')).toThrow(
        'Unknown fixture preset: unknown',
      );
    });
  });
});
