import { MetaMaskMobileChainCapability } from '../capabilities/chain';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';

jest.mock('@metamask/client-mcp-core', () => ({}));
jest.mock('../../../tests/seeder/anvil-manager');

const MockedAnvilManager = AnvilManager as jest.MockedClass<
  typeof AnvilManager
>;

describe('MetaMaskMobileChainCapability', () => {
  let chainCapability: MetaMaskMobileChainCapability;
  let mockAnvilManager: jest.Mocked<AnvilManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAnvilManager = {
      setServerPort: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      isStarted: jest.fn().mockReturnValue(false),
      getProvider: jest.fn().mockReturnValue({}),
    } as unknown as jest.Mocked<AnvilManager>;
    MockedAnvilManager.mockImplementation(() => mockAnvilManager);
    chainCapability = new MetaMaskMobileChainCapability({ port: 8545 });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('start', () => {
    it('uses the port passed in constructor when starting', async () => {
      await chainCapability.start();

      expect(mockAnvilManager.setServerPort).toHaveBeenCalledWith(8545);
    });

    it('uses default chainId 1337 when not specified', async () => {
      await chainCapability.start();

      expect(mockAnvilManager.start).toHaveBeenCalledWith({ chainId: 1337 });
    });

    it('uses custom chainId when specified', async () => {
      chainCapability = new MetaMaskMobileChainCapability({
        port: 8545,
        chainId: 31337,
      });

      await chainCapability.start();

      expect(mockAnvilManager.start).toHaveBeenCalledWith({ chainId: 31337 });
    });
  });

  describe('stop', () => {
    it('stops AnvilManager when started', async () => {
      await chainCapability.start();

      await chainCapability.stop();

      expect(mockAnvilManager.stop).toHaveBeenCalled();
    });

    it('skips AnvilManager stop when not started', async () => {
      await chainCapability.stop();

      expect(mockAnvilManager.stop).not.toHaveBeenCalled();
    });
  });

  describe('isRunning', () => {
    it('returns true when capability started and Anvil is started', async () => {
      mockAnvilManager.isStarted.mockReturnValue(true);
      await chainCapability.start();

      const result = chainCapability.isRunning();

      expect(result).toBe(true);
    });

    it('returns false when capability is not started', () => {
      mockAnvilManager.isStarted.mockReturnValue(true);

      const result = chainCapability.isRunning();

      expect(result).toBe(false);
    });
  });

  describe('setPort', () => {
    it('sets port on initialized AnvilManager', async () => {
      await chainCapability.start();

      chainCapability.setPort(7777);

      expect(mockAnvilManager.setServerPort).toHaveBeenLastCalledWith(7777);
    });
  });

  describe('getAnvilManager', () => {
    it('returns AnvilManager instance after start', async () => {
      await chainCapability.start();

      const result = chainCapability.getAnvilManager();

      expect(result).toBe(mockAnvilManager);
    });

    it('throws when AnvilManager is not initialized', () => {
      expect(() => chainCapability.getAnvilManager()).toThrow(
        'Anvil manager not initialized',
      );
    });
  });
});
