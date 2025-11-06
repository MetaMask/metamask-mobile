/* eslint-disable import/no-nodejs-modules */
import net from 'net';
import PortManager, { ResourceType } from './PortManager';

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
      const allocation = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );
      expect(portManager.isPortAllocated(allocation.port)).toBe(true);

      PortManager.resetInstance();
      portManager = PortManager.getInstance();

      expect(portManager.isPortAllocated(allocation.port)).toBe(false);
    });
  });

  describe('allocatePort', () => {
    it('should allocate a random port for a resource', async () => {
      const allocation = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );

      // Should be a random port in the range 40000-60000
      expect(allocation.port).toBeGreaterThanOrEqual(40000);
      expect(allocation.port).toBeLessThanOrEqual(60000);
      expect(allocation.resourceType).toBe(ResourceType.FIXTURE_SERVER);
      expect(portManager.isPortAllocated(allocation.port)).toBe(true);
      expect(portManager.getPort(ResourceType.FIXTURE_SERVER)).toBe(
        allocation.port,
      );
    });

    it('should return the same port if resource already has one allocated', async () => {
      const allocation1 = await portManager.allocatePort(
        ResourceType.MOCK_SERVER,
      );
      const allocation2 = await portManager.allocatePort(
        ResourceType.MOCK_SERVER,
      );

      expect(allocation1.port).toBe(allocation2.port);
      expect(allocation1).toBe(allocation2);
    });

    it('should allocate different ports for different resources', async () => {
      const allocation1 = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );
      const allocation2 = await portManager.allocatePort(
        ResourceType.MOCK_SERVER,
      );

      // Both should be random ports in range
      expect(allocation1.port).toBeGreaterThanOrEqual(40000);
      expect(allocation1.port).toBeLessThanOrEqual(60000);
      expect(allocation2.port).toBeGreaterThanOrEqual(40000);
      expect(allocation2.port).toBeLessThanOrEqual(60000);

      // Ports should be different
      expect(allocation1.port).not.toBe(allocation2.port);
      expect(portManager.isPortAllocated(allocation1.port)).toBe(true);
      expect(portManager.isPortAllocated(allocation2.port)).toBe(true);
    });

    it('should find next available port when first random port is occupied', async () => {
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

      const allocation = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );

      // Should be a random port in the range 40000-60000
      expect(allocation.port).toBeGreaterThanOrEqual(40000);
      expect(allocation.port).toBeLessThanOrEqual(60000);
      expect(portManager.isPortAllocated(allocation.port)).toBe(true);

      jest.restoreAllMocks();
    });
  });

  describe('allocateMultiInstancePort', () => {
    it('should allocate ports for multiple instances of the same resource', async () => {
      const allocation1 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-1',
      );
      const allocation2 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-2',
      );

      expect(allocation1.port).not.toBe(allocation2.port);
      expect(allocation1.instanceId).toBe('instance-1');
      expect(allocation2.instanceId).toBe('instance-2');
      expect(portManager.isPortAllocated(allocation1.port)).toBe(true);
      expect(portManager.isPortAllocated(allocation2.port)).toBe(true);
    });

    it('should return same port for same instance', async () => {
      const allocation1 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-1',
      );
      const allocation2 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-1',
      );

      expect(allocation1.port).toBe(allocation2.port);
      expect(allocation1).toBe(allocation2);
    });

    it('should track all instance ports', async () => {
      await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-1',
      );
      await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-2',
      );
      await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-3',
      );

      const allPorts = portManager.getAllInstancePorts(
        ResourceType.DAPP_SERVER,
      );
      expect(allPorts.length).toBe(3);
    });
  });

  // Note: BrowserStack behavior is tested in actual BrowserStack CI runs
  // These tests verify local development behavior with random port allocation
  describe('Local development behavior', () => {
    it('should allocate random ports for all resources', async () => {
      const allocation1 = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );
      const allocation2 = await portManager.allocatePort(
        ResourceType.MOCK_SERVER,
      );
      const allocation3 = await portManager.allocatePort(ResourceType.GANACHE);

      // All ports should be random (40000-60000)
      expect(allocation1.port).toBeGreaterThanOrEqual(40000);
      expect(allocation1.port).toBeLessThanOrEqual(60000);
      expect(allocation2.port).toBeGreaterThanOrEqual(40000);
      expect(allocation2.port).toBeLessThanOrEqual(60000);
      expect(allocation3.port).toBeGreaterThanOrEqual(40000);
      expect(allocation3.port).toBeLessThanOrEqual(60000);

      // All ports should be different
      expect(allocation1.port).not.toBe(allocation2.port);
      expect(allocation1.port).not.toBe(allocation3.port);
      expect(allocation2.port).not.toBe(allocation3.port);
    });
  });

  describe('Port allocation and tracking', () => {
    it('should correctly track allocated ports', async () => {
      const allocation1 = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );
      const allocation2 = await portManager.allocatePort(
        ResourceType.MOCK_SERVER,
      );

      expect(portManager.isPortAllocated(allocation1.port)).toBe(true);
      expect(portManager.isPortAllocated(allocation2.port)).toBe(true);
      expect(portManager.getPort(ResourceType.FIXTURE_SERVER)).toBe(
        allocation1.port,
      );
      expect(portManager.getPort(ResourceType.MOCK_SERVER)).toBe(
        allocation2.port,
      );
    });

    it('should return undefined for resource without allocated port', () => {
      const port = portManager.getPort(ResourceType.GANACHE);
      expect(port).toBeUndefined();
    });

    it('should return false for non-allocated port', () => {
      expect(portManager.isPortAllocated(99999)).toBe(false);
    });
  });

  describe('releasePort', () => {
    it('should release an allocated port', async () => {
      const allocation = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );
      expect(portManager.isPortAllocated(allocation.port)).toBe(true);

      portManager.releasePort(ResourceType.FIXTURE_SERVER);

      expect(portManager.isPortAllocated(allocation.port)).toBe(false);
      expect(portManager.getPort(ResourceType.FIXTURE_SERVER)).toBeUndefined();
    });

    it('should handle releasing a non-allocated resource gracefully', () => {
      expect(() => portManager.releasePort(ResourceType.GANACHE)).not.toThrow();
    });

    it('should allow re-allocation after release', async () => {
      const allocation1 = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );
      const port1 = allocation1.port;

      portManager.releasePort(ResourceType.FIXTURE_SERVER);
      expect(portManager.isPortAllocated(port1)).toBe(false);

      // Can allocate a new port for the same resource
      const allocation2 = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );

      expect(allocation2.port).toBeGreaterThanOrEqual(40000);
      expect(allocation2.port).toBeLessThanOrEqual(60000);
      expect(portManager.isPortAllocated(allocation2.port)).toBe(true);
      expect(portManager.getPort(ResourceType.FIXTURE_SERVER)).toBe(
        allocation2.port,
      );
    });
  });

  describe('releaseMultiInstancePort', () => {
    it('should release a specific instance port', async () => {
      const allocation1 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-1',
      );
      const allocation2 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-2',
      );

      portManager.releaseMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-1',
      );

      expect(portManager.isPortAllocated(allocation1.port)).toBe(false);
      expect(portManager.isPortAllocated(allocation2.port)).toBe(true);
    });
  });

  describe('releaseAllInstancesOf', () => {
    it('should release all instances of a resource type', async () => {
      const allocation1 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-1',
      );
      const allocation2 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-2',
      );

      portManager.releaseAllInstancesOf(ResourceType.DAPP_SERVER);

      expect(portManager.isPortAllocated(allocation1.port)).toBe(false);
      expect(portManager.isPortAllocated(allocation2.port)).toBe(false);
      expect(
        portManager.getAllInstancePorts(ResourceType.DAPP_SERVER).length,
      ).toBe(0);
    });
  });

  describe('releaseAll', () => {
    it('should release all allocated ports', async () => {
      const allocation1 = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );
      const allocation2 = await portManager.allocatePort(
        ResourceType.MOCK_SERVER,
      );
      const allocation3 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'instance-1',
      );

      portManager.releaseAll();

      expect(portManager.isPortAllocated(allocation1.port)).toBe(false);
      expect(portManager.isPortAllocated(allocation2.port)).toBe(false);
      expect(portManager.isPortAllocated(allocation3.port)).toBe(false);
      expect(portManager.getPort(ResourceType.FIXTURE_SERVER)).toBeUndefined();
      expect(portManager.getPort(ResourceType.MOCK_SERVER)).toBeUndefined();
    });

    it('should handle releaseAll when no ports are allocated', () => {
      expect(() => portManager.releaseAll()).not.toThrow();
    });
  });

  describe('Multiple resource types', () => {
    it('should handle allocation for all ResourceType values', async () => {
      const resourceTypes = [
        ResourceType.FIXTURE_SERVER,
        ResourceType.MOCK_SERVER,
        ResourceType.COMMAND_QUEUE_SERVER,
        ResourceType.DAPP_SERVER,
        ResourceType.GANACHE,
        ResourceType.ANVIL,
      ];

      const allocatedPorts: Map<ResourceType, number> = new Map();

      for (const resourceType of resourceTypes) {
        const allocation = await portManager.allocatePort(resourceType);
        allocatedPorts.set(resourceType, allocation.port);
      }

      const uniquePorts = new Set(allocatedPorts.values());
      expect(uniquePorts.size).toBe(allocatedPorts.size);

      allocatedPorts.forEach((port, resourceType) => {
        expect(portManager.isPortAllocated(port)).toBe(true);
        expect(portManager.getPort(resourceType)).toBe(port);
      });
    });
  });
});
