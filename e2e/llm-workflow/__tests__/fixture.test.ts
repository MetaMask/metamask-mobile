import { MetaMaskMobileFixtureCapability } from '../capabilities/fixture';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import FixtureServer from '../../../tests/framework/fixtures/FixtureServer';
import PortManager from '../../../tests/framework/PortManager';

jest.mock('../../../tests/framework/fixtures/FixtureBuilder');
jest.mock('../../../tests/framework/fixtures/FixtureServer');
jest.mock('../../../tests/framework/PortManager');

const MockedFixtureBuilder = FixtureBuilder as jest.MockedClass<
  typeof FixtureBuilder
>;
const MockedFixtureServer = FixtureServer as jest.MockedClass<
  typeof FixtureServer
>;
const MockedPortManager = PortManager as jest.Mocked<typeof PortManager>;

describe('MetaMaskMobileFixtureCapability', () => {
  let fixtureCapability: MetaMaskMobileFixtureCapability;
  let mockServer: jest.Mocked<FixtureServer>;
  let mockPortManager: jest.Mocked<PortManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServer = {
      setServerPort: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      loadJsonState: jest.fn(),
    } as unknown as jest.Mocked<FixtureServer>;

    MockedFixtureServer.mockImplementation(() => mockServer);

    mockPortManager = {
      allocatePort: jest.fn().mockResolvedValue({ port: 12345 }),
    } as unknown as jest.Mocked<PortManager>;

    MockedPortManager.getInstance = jest.fn().mockReturnValue(mockPortManager);

    fixtureCapability = new MetaMaskMobileFixtureCapability();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('start', () => {
    it('starts fixture server with allocated port', async () => {
      const walletState = {
        data: { accounts: ['0x123'] },
        meta: { version: 1 },
      };

      await fixtureCapability.start(walletState);

      expect(mockPortManager.allocatePort).toHaveBeenCalled();
      expect(mockServer.setServerPort).toHaveBeenCalledWith(12345);
      expect(mockServer.start).toHaveBeenCalled();
      expect(mockServer.loadJsonState).toHaveBeenCalledWith(
        {
          state: { accounts: ['0x123'] },
          asyncState: { version: 1 },
        },
        null,
      );
    });

    it('handles wallet state without meta', async () => {
      const walletState = {
        data: { accounts: ['0x123'] },
        meta: { version: 1 },
      };

      await fixtureCapability.start(walletState);

      expect(mockServer.loadJsonState).toHaveBeenCalledWith(
        {
          state: { accounts: ['0x123'] },
          asyncState: { version: 1 },
        },
        null,
      );
    });
  });

  describe('stop', () => {
    it('stops fixture server when running', async () => {
      const walletState = { data: {}, meta: { version: 1 } };
      await fixtureCapability.start(walletState);

      await fixtureCapability.stop();

      expect(mockServer.stop).toHaveBeenCalled();
    });

    it('does nothing when server not started', async () => {
      await fixtureCapability.stop();

      expect(mockServer.stop).not.toHaveBeenCalled();
    });
  });

  describe('getDefaultState', () => {
    it('returns default wallet state', () => {
      const mockFixture = {
        state: { accounts: ['0xdefault'] },
        asyncState: { initialized: true },
      };

      const mockBuilder = {
        withDefaultFixture: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockFixture),
      };

      MockedFixtureBuilder.mockImplementation(() => mockBuilder as never);

      const result = fixtureCapability.getDefaultState();

      expect(mockBuilder.withDefaultFixture).toHaveBeenCalled();
      expect(mockBuilder.build).toHaveBeenCalled();
      expect(result).toEqual({
        data: { accounts: ['0xdefault'] },
        meta: { initialized: true },
      });
    });
  });

  describe('getOnboardingState', () => {
    it('returns onboarding wallet state', () => {
      const mockFixture = {
        state: {},
        asyncState: { onboarding: true },
      };

      const mockBuilder = {
        withOnboardingFixture: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockFixture),
      };

      MockedFixtureBuilder.mockImplementation(() => mockBuilder as never);

      const result = fixtureCapability.getOnboardingState();

      expect(mockBuilder.withOnboardingFixture).toHaveBeenCalled();
      expect(mockBuilder.build).toHaveBeenCalled();
      expect(result).toEqual({
        data: {},
        meta: { onboarding: true },
      });
    });
  });

  describe('resolvePreset', () => {
    it('resolves default preset', () => {
      const mockFixture = {
        state: { accounts: ['0xdefault'] },
        asyncState: {},
      };

      const mockBuilder = {
        withDefaultFixture: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockFixture),
      };

      MockedFixtureBuilder.mockImplementation(() => mockBuilder as never);

      const result = fixtureCapability.resolvePreset('default');

      expect(mockBuilder.withDefaultFixture).toHaveBeenCalled();
      expect(result.data).toEqual({ accounts: ['0xdefault'] });
    });

    it('resolves onboarding preset', () => {
      const mockFixture = {
        state: {},
        asyncState: { onboarding: true },
      };

      const mockBuilder = {
        withOnboardingFixture: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockFixture),
      };

      MockedFixtureBuilder.mockImplementation(() => mockBuilder as never);

      const result = fixtureCapability.resolvePreset('onboarding');

      expect(mockBuilder.withOnboardingFixture).toHaveBeenCalled();
      expect(result.meta).toEqual({ onboarding: true });
    });

    it('resolves with-tokens preset', () => {
      const mockFixture = {
        state: { tokens: ['DAI'] },
        asyncState: {},
      };

      const mockBuilder = {
        withDefaultFixture: jest.fn().mockReturnThis(),
        withTokensForAllPopularNetworks: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockFixture),
      };

      MockedFixtureBuilder.mockImplementation(() => mockBuilder as never);

      const result = fixtureCapability.resolvePreset('with-tokens');

      expect(mockBuilder.withDefaultFixture).toHaveBeenCalled();
      expect(mockBuilder.withTokensForAllPopularNetworks).toHaveBeenCalledWith([
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
      const mockFixture = {
        state: { networks: ['mainnet', 'polygon'] },
        asyncState: {},
      };

      const mockBuilder = {
        withDefaultFixture: jest.fn().mockReturnThis(),
        withPopularNetworks: jest.fn().mockReturnThis(),
        build: jest.fn().mockReturnValue(mockFixture),
      };

      MockedFixtureBuilder.mockImplementation(() => mockBuilder as never);

      const result = fixtureCapability.resolvePreset('with-popular-networks');

      expect(mockBuilder.withDefaultFixture).toHaveBeenCalled();
      expect(mockBuilder.withPopularNetworks).toHaveBeenCalled();
      expect(result.data).toEqual({ networks: ['mainnet', 'polygon'] });
    });

    it('throws error for unknown preset', () => {
      expect(() => fixtureCapability.resolvePreset('unknown')).toThrow(
        'Unknown fixture preset: unknown',
      );
    });
  });
});
