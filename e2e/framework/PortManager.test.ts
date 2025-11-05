/* eslint-disable import/no-nodejs-modules */
import net from 'net';
import PortManager, { ResourceId, PortRequest } from './PortManager';
import {
  DEFAULT_FIXTURE_SERVER_PORT,
  DEFAULT_MOCKSERVER_PORT,
} from './Constants';

jest.mock('./logger', () => ({
  createLogger: () => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('PortManager', () => {
  let portManager: PortManager;

  beforeEach(() => {
    PortManager.resetInstance();
    portManager = PortManager.getInstance();
    delete process.env.BROWSERSTACK_LOCAL;
  });

  afterEach(() => {
    PortManager.resetInstance();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance on multiple calls to getInstance', () => {
      const instance1 = PortManager.getInstance();
      const instance2 = PortManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance after resetInstance is called', () => {
      const instance1 = PortManager.getInstance();
      PortManager.resetInstance();
      const instance2 = PortManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });

    it('should release all ports when resetInstance is called', async () => {
      const request: PortRequest = {
        resourceId: ResourceId.FIXTURE_SERVER,
      };

      const port = await portManager.getAvailablePort(request);
      expect(portManager.isPortAllocated(port)).toBe(true);

      PortManager.resetInstance();
      portManager = PortManager.getInstance();

      expect(portManager.isPortAllocated(port)).toBe(false);
    });
  });

  describe('getAvailablePort', () => {
    it('should allocate the default port for a known resource when available', async () => {
      const request: PortRequest = {
        resourceId: ResourceId.FIXTURE_SERVER,
      };

      const port = await portManager.getAvailablePort(request);

      expect(port).toBe(DEFAULT_FIXTURE_SERVER_PORT);
      expect(portManager.isPortAllocated(port)).toBe(true);
      expect(portManager.getPortForResource(ResourceId.FIXTURE_SERVER)).toBe(
        port,
      );
    });

    it('should return the same port if resource already has one allocated', async () => {
      const request: PortRequest = {
        resourceId: ResourceId.MOCK_SERVER,
      };

      const port1 = await portManager.getAvailablePort(request);
      const port2 = await portManager.getAvailablePort(request);

      expect(port1).toBe(port2);
    });

    it('should allocate preferred port when specified and available', async () => {
      const preferredPort = 45000;
      const request: PortRequest = {
        resourceId: 'custom-resource',
        preferredPort,
      };

      const port = await portManager.getAvailablePort(request);

      expect(port).toBe(preferredPort);
      expect(portManager.isPortAllocated(port)).toBe(true);
    });

    it('should find next available port when default port is occupied', async () => {
      // Mock net.createServer to simulate first port being occupied
      const mockServer = {
        once: jest.fn((event, callback) => {
          if (event === 'error') {
            const error = new Error('Address in use') as NodeJS.ErrnoException;
            error.code = 'EADDRINUSE';
            setTimeout(() => callback(error), 0);
          }
        }),
        listen: jest.fn(),
        close: jest.fn(),
      };

      let callCount = 0;
      jest.spyOn(net, 'createServer').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call - port occupied
          return mockServer as unknown as net.Server;
        }
        // Subsequent calls - port available
        return {
          once: jest.fn((event, callback) => {
            if (event === 'listening') {
              setTimeout(() => callback(), 0);
            }
          }),
          listen: jest.fn(),
          close: jest.fn(),
        } as unknown as net.Server;
      });

      const request: PortRequest = {
        resourceId: ResourceId.FIXTURE_SERVER,
      };

      const port = await portManager.getAvailablePort(request);

      expect(port).toBeGreaterThan(DEFAULT_FIXTURE_SERVER_PORT);
      expect(portManager.isPortAllocated(port)).toBe(true);

      jest.restoreAllMocks();
    });

    it('should find available port when no default port is defined', async () => {
      const request: PortRequest = {
        resourceId: 'unknown-resource',
      };

      const port = await portManager.getAvailablePort(request);

      expect(port).toBeGreaterThanOrEqual(30000);
      expect(port).toBeLessThanOrEqual(60000);
      expect(portManager.isPortAllocated(port)).toBe(true);
    });

    it('should throw error when no port is available after max attempts', async () => {
      const mockServer = {
        once: jest.fn((event, callback) => {
          if (event === 'error') {
            const error = new Error('Address in use') as NodeJS.ErrnoException;
            error.code = 'EADDRINUSE';
            setTimeout(() => callback(error), 0);
          }
        }),
        listen: jest.fn(),
        close: jest.fn(),
      };

      jest
        .spyOn(net, 'createServer')
        .mockReturnValue(mockServer as unknown as net.Server);

      const request: PortRequest = {
        resourceId: 'test-resource',
        maxAttempts: 5,
      };

      await expect(portManager.getAvailablePort(request)).rejects.toThrow(
        /Failed to find an available port after 5 attempts/,
      );

      jest.restoreAllMocks();
    });
  });

  describe('BrowserStack behavior', () => {
    it('should always return static default port when BROWSERSTACK_LOCAL is true', async () => {
      process.env.BROWSERSTACK_LOCAL = 'true';

      const request: PortRequest = {
        resourceId: ResourceId.FIXTURE_SERVER,
      };

      const port = await portManager.getAvailablePort(request);

      expect(port).toBe(DEFAULT_FIXTURE_SERVER_PORT);
      expect(portManager.isPortAllocated(port)).toBe(true);
    });

    it('should use static ports even when using different resource on BrowserStack', async () => {
      process.env.BROWSERSTACK_LOCAL = 'TRUE';

      PortManager.resetInstance();
      portManager = PortManager.getInstance();

      const request: PortRequest = {
        resourceId: ResourceId.MOCK_SERVER,
      };

      const port = await portManager.getAvailablePort(request);

      expect(port).toBe(DEFAULT_MOCKSERVER_PORT);
      expect(portManager.isPortAllocated(port)).toBe(true);
    });
  });

  describe('Port allocation and tracking', () => {
    it('should correctly track allocated ports', async () => {
      const request1: PortRequest = {
        resourceId: ResourceId.FIXTURE_SERVER,
      };
      const request2: PortRequest = {
        resourceId: ResourceId.MOCK_SERVER,
      };

      const port1 = await portManager.getAvailablePort(request1);
      const port2 = await portManager.getAvailablePort(request2);

      expect(portManager.isPortAllocated(port1)).toBe(true);
      expect(portManager.isPortAllocated(port2)).toBe(true);
      expect(portManager.getPortForResource(ResourceId.FIXTURE_SERVER)).toBe(
        port1,
      );
      expect(portManager.getPortForResource(ResourceId.MOCK_SERVER)).toBe(
        port2,
      );
    });

    it('should return undefined for resource without allocated port', () => {
      const port = portManager.getPortForResource('non-existent-resource');
      expect(port).toBeUndefined();
    });

    it('should return false for non-allocated port', () => {
      expect(portManager.isPortAllocated(99999)).toBe(false);
    });
  });

  describe('releasePort', () => {
    it('should release an allocated port', async () => {
      const request: PortRequest = {
        resourceId: ResourceId.FIXTURE_SERVER,
      };

      const port = await portManager.getAvailablePort(request);
      expect(portManager.isPortAllocated(port)).toBe(true);

      portManager.releasePort(port);

      expect(portManager.isPortAllocated(port)).toBe(false);
      expect(
        portManager.getPortForResource(ResourceId.FIXTURE_SERVER),
      ).toBeUndefined();
    });

    it('should handle releasing a non-allocated port gracefully', () => {
      expect(() => portManager.releasePort(99999)).not.toThrow();
    });

    it('should allow re-allocation of released port', async () => {
      const request1: PortRequest = {
        resourceId: 'resource-1',
        preferredPort: 40000,
      };

      const port1 = await portManager.getAvailablePort(request1);
      portManager.releasePort(port1);

      const request2: PortRequest = {
        resourceId: 'resource-2',
        preferredPort: 40000,
      };

      const port2 = await portManager.getAvailablePort(request2);

      expect(port2).toBe(port1);
      expect(portManager.getPortForResource('resource-2')).toBe(port2);
    });
  });

  describe('releaseAll', () => {
    it('should release all allocated ports', async () => {
      const requests: PortRequest[] = [
        { resourceId: ResourceId.FIXTURE_SERVER },
        { resourceId: ResourceId.MOCK_SERVER },
        { resourceId: ResourceId.DAPP_SERVER },
      ];

      const ports: number[] = [];
      for (const request of requests) {
        ports.push(await portManager.getAvailablePort(request));
      }

      ports.forEach((port) => {
        expect(portManager.isPortAllocated(port)).toBe(true);
      });

      portManager.releaseAll();

      ports.forEach((port) => {
        expect(portManager.isPortAllocated(port)).toBe(false);
      });

      requests.forEach((request) => {
        expect(
          portManager.getPortForResource(request.resourceId),
        ).toBeUndefined();
      });
    });

    it('should handle releaseAll when no ports are allocated', () => {
      expect(() => portManager.releaseAll()).not.toThrow();
    });
  });

  describe('Multiple resource types', () => {
    it('should handle allocation for all ResourceId types', async () => {
      const resourceIds = [
        ResourceId.FIXTURE_SERVER,
        ResourceId.MOCK_SERVER,
        ResourceId.COMMAND_QUEUE_SERVER,
        ResourceId.DAPP_SERVER,
        ResourceId.DAPP_SERVER_1,
        ResourceId.GANACHE,
        ResourceId.ANVIL,
      ];

      const allocatedPorts: Map<string, number> = new Map();

      for (const resourceId of resourceIds) {
        const port = await portManager.getAvailablePort({ resourceId });
        allocatedPorts.set(resourceId, port);
      }

      const uniquePorts = new Set(allocatedPorts.values());
      expect(uniquePorts.size).toBe(allocatedPorts.size);

      allocatedPorts.forEach((port, resourceId) => {
        expect(portManager.isPortAllocated(port)).toBe(true);
        expect(portManager.getPortForResource(resourceId)).toBe(port);
      });
    });
  });
});
