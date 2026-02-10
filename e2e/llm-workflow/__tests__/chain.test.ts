import { MetaMaskMobileChainCapability } from '../capabilities/chain';
import { AnvilManager } from '../../../tests/seeder/anvil-manager';
import PortManager from '../../../tests/framework/PortManager';

jest.mock('../../../tests/seeder/anvil-manager');
jest.mock('../../../tests/framework/PortManager');

const MockedAnvilManager = AnvilManager as jest.MockedClass<
  typeof AnvilManager
>;
const MockedPortManager = PortManager as jest.Mocked<typeof PortManager>;

describe('MetaMaskMobileChainCapability', () => {
  let chainCapability: MetaMaskMobileChainCapability;
  let mockAnvilManager: jest.Mocked<AnvilManager>;
  let mockPortManager: jest.Mocked<PortManager>;

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

    mockPortManager = {
      allocatePort: jest.fn().mockResolvedValue({ port: 8545 }),
    } as unknown as jest.Mocked<PortManager>;

    MockedPortManager.getInstance = jest.fn().mockReturnValue(mockPortManager);

    chainCapability = new MetaMaskMobileChainCapability();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('creates instance with AnvilManager', () => {
      expect(chainCapability).toBeDefined();
      expect(MockedAnvilManager).toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('allocates port and starts Anvil with default chainId', async () => {
      await chainCapability.start();

      expect(mockPortManager.allocatePort).toHaveBeenCalled();
      expect(mockAnvilManager.setServerPort).toHaveBeenCalledWith(8545);
      expect(mockAnvilManager.start).toHaveBeenCalledWith({ chainId: 1337 });
    });

    it('uses allocated port from PortManager', async () => {
      mockPortManager.allocatePort = jest
        .fn()
        .mockResolvedValue({ port: 9999 });

      await chainCapability.start();

      expect(mockAnvilManager.setServerPort).toHaveBeenCalledWith(9999);
    });
  });

  describe('stop', () => {
    it('stops AnvilManager', async () => {
      await chainCapability.stop();

      expect(mockAnvilManager.stop).toHaveBeenCalled();
    });
  });

  describe('isRunning', () => {
    it('returns true when Anvil is started', () => {
      mockAnvilManager.isStarted.mockReturnValue(true);

      const result = chainCapability.isRunning();

      expect(result).toBe(true);
      expect(mockAnvilManager.isStarted).toHaveBeenCalled();
    });

    it('returns false when Anvil is not started', () => {
      mockAnvilManager.isStarted.mockReturnValue(false);

      const result = chainCapability.isRunning();

      expect(result).toBe(false);
    });
  });

  describe('setPort', () => {
    it('sets port on AnvilManager', () => {
      chainCapability.setPort(7777);

      expect(mockAnvilManager.setServerPort).toHaveBeenCalledWith(7777);
    });
  });

  describe('getAnvilManager', () => {
    it('returns AnvilManager instance', () => {
      const result = chainCapability.getAnvilManager();

      expect(result).toBe(mockAnvilManager);
    });
  });
});
