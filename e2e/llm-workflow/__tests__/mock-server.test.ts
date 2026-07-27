import type { Mockttp } from 'mockttp';
import { MetaMaskMobileMockServerCapability } from '../capabilities/mock-server';
import MockServerE2E from '../../../tests/api-mocking/MockServerE2E';

jest.mock('@metamask/client-mcp-core', () => ({}));
jest.mock('mockttp', () => ({}));
jest.mock('../../../tests/api-mocking/MockServerE2E');

const MockedMockServerE2E = MockServerE2E as jest.MockedClass<
  typeof MockServerE2E
>;

describe('MetaMaskMobileMockServerCapability', () => {
  let mockServerCapability: MetaMaskMobileMockServerCapability;
  let mockServer: jest.Mocked<MockServerE2E>;
  let mockttpServer: Mockttp;

  beforeEach(() => {
    jest.clearAllMocks();

    mockttpServer = { url: 'http://localhost:8080' } as unknown as Mockttp;
    mockServer = {
      setServerPort: jest.fn(),
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      server: mockttpServer,
    } as unknown as jest.Mocked<MockServerE2E>;
    MockedMockServerE2E.mockImplementation(() => mockServer);
    mockServerCapability = new MetaMaskMobileMockServerCapability({
      port: 8080,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('start', () => {
    it('starts mock server on constructor port', async () => {
      await mockServerCapability.start();

      expect(MockedMockServerE2E).toHaveBeenCalledWith({ events: {} });
      expect(mockServer.setServerPort).toHaveBeenCalledWith(8080);
      expect(mockServer.start).toHaveBeenCalled();
    });

    it('skips start when already running', async () => {
      await mockServerCapability.start();
      jest.clearAllMocks();

      await mockServerCapability.start();

      expect(MockedMockServerE2E).not.toHaveBeenCalled();
      expect(mockServer.start).not.toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('stops mock server when running', async () => {
      await mockServerCapability.start();

      await mockServerCapability.stop();

      expect(mockServer.stop).toHaveBeenCalled();
    });

    it('skips stop when server not started', async () => {
      await mockServerCapability.stop();

      expect(mockServer.stop).not.toHaveBeenCalled();
    });
  });

  describe('isRunning', () => {
    it('returns false before start', () => {
      const result = mockServerCapability.isRunning();

      expect(result).toBe(false);
    });

    it('returns true after start', async () => {
      await mockServerCapability.start();

      const result = mockServerCapability.isRunning();

      expect(result).toBe(true);
    });
  });

  describe('getServer', () => {
    it('returns Mockttp server instance when running', async () => {
      await mockServerCapability.start();

      const result = mockServerCapability.getServer();

      expect(result).toBe(mockttpServer);
    });

    it('throws when server not started', () => {
      expect(() => mockServerCapability.getServer()).toThrow(
        'Mock server not started',
      );
    });
  });

  describe('getPort', () => {
    it('returns constructor port', () => {
      const result = mockServerCapability.getPort();

      expect(result).toBe(8080);
    });
  });
});
