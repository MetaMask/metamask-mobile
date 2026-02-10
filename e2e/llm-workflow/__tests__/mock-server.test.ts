import { MetaMaskMobileMockServerCapability } from '../capabilities/mock-server';
import MockServerE2E from '../../../tests/api-mocking/MockServerE2E';
import PortManager from '../../../tests/framework/PortManager';

jest.mock('../../../tests/api-mocking/MockServerE2E');
jest.mock('../../../tests/framework/PortManager');

const MockedMockServerE2E = MockServerE2E as jest.MockedClass<
  typeof MockServerE2E
>;
const MockedPortManager = PortManager as jest.Mocked<typeof PortManager>;

describe('MetaMaskMobileMockServerCapability', () => {
  let mockServerCapability: MetaMaskMobileMockServerCapability;
  let mockServer: jest.Mocked<MockServerE2E>;
  let mockPortManager: jest.Mocked<PortManager>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockServer = {
      setServerPort: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      getServerPort: jest.fn().mockReturnValue(8080),
      server: {} as never,
    } as unknown as jest.Mocked<MockServerE2E>;

    MockedMockServerE2E.mockImplementation(() => mockServer);

    mockPortManager = {
      allocatePort: jest.fn().mockResolvedValue({ port: 8080 }),
    } as unknown as jest.Mocked<PortManager>;

    MockedPortManager.getInstance = jest.fn().mockReturnValue(mockPortManager);

    mockServerCapability = new MetaMaskMobileMockServerCapability();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('start', () => {
    it('allocates port and starts mock server', async () => {
      await mockServerCapability.start();

      expect(mockPortManager.allocatePort).toHaveBeenCalled();
      expect(MockedMockServerE2E).toHaveBeenCalledWith({ events: {} });
      expect(mockServer.setServerPort).toHaveBeenCalledWith(8080);
      expect(mockServer.start).toHaveBeenCalled();
    });

    it('uses allocated port from PortManager', async () => {
      mockPortManager.allocatePort = jest
        .fn()
        .mockResolvedValue({ port: 9999 });

      await mockServerCapability.start();

      expect(mockServer.setServerPort).toHaveBeenCalledWith(9999);
    });

    it('does nothing when already running', async () => {
      await mockServerCapability.start();
      jest.clearAllMocks();

      await mockServerCapability.start();

      expect(mockPortManager.allocatePort).not.toHaveBeenCalled();
      expect(mockServer.start).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('stops mock server when running', async () => {
      await mockServerCapability.start();

      await mockServerCapability.stop();

      expect(mockServer.stop).toHaveBeenCalled();
    });

    it('does nothing when server not started', async () => {
      await mockServerCapability.stop();

      expect(mockServer.stop).not.toHaveBeenCalled();
    });
  });

  describe('isRunning', () => {
    it('returns false when not started', () => {
      const result = mockServerCapability.isRunning();

      expect(result).toBe(false);
    });

    it('returns true when started', async () => {
      await mockServerCapability.start();

      const result = mockServerCapability.isRunning();

      expect(result).toBe(true);
    });

    it('returns false after stopped', async () => {
      await mockServerCapability.start();
      await mockServerCapability.stop();

      const result = mockServerCapability.isRunning();

      expect(result).toBe(false);
    });
  });

  describe('getServer', () => {
    it('returns Mockttp server instance when running', async () => {
      await mockServerCapability.start();

      const result = mockServerCapability.getServer();

      expect(result).toBe(mockServer.server);
    });

    it('throws error when server not started', () => {
      expect(() => mockServerCapability.getServer()).toThrow(
        'Mock server not started',
      );
    });
  });

  describe('getPort', () => {
    it('returns port number when running', async () => {
      await mockServerCapability.start();

      const result = mockServerCapability.getPort();

      expect(result).toBe(8080);
      expect(mockServer.getServerPort).toHaveBeenCalled();
    });

    it('throws error when server not started', () => {
      expect(() => mockServerCapability.getPort()).toThrow(
        'Mock server not started',
      );
    });
  });
});
