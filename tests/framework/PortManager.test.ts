/* eslint-disable import/no-nodejs-modules */
import net from 'net';
import PortManager, { ResourceType } from './PortManager.ts';
import {
  FALLBACK_FIXTURE_SERVER_PORT,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
  FALLBACK_MOCKSERVER_PORT,
  FALLBACK_GANACHE_PORT,
  FALLBACK_DAPP_SERVER_PORT,
} from './Constants.ts';
import { DEFAULT_ANVIL_PORT } from '../../e2e/seeder/anvil-manager.ts';

jest.mock('./logger.ts', () => ({
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
  });

  afterEach(() => {
    PortManager.resetInstance();
    delete process.env.BROWSERSTACK_LOCAL;
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

      // Should be a random port in the range 32768-60999
      expect(allocation.port).toBeGreaterThanOrEqual(32768);
      expect(allocation.port).toBeLessThanOrEqual(60999);
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
      expect(allocation1.port).toBeGreaterThanOrEqual(32768);
      expect(allocation1.port).toBeLessThanOrEqual(60999);
      expect(allocation2.port).toBeGreaterThanOrEqual(32768);
      expect(allocation2.port).toBeLessThanOrEqual(60999);

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

      // Should be a random port in the range 32768-60999
      expect(allocation.port).toBeGreaterThanOrEqual(32768);
      expect(allocation.port).toBeLessThanOrEqual(60999);
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

  describe('getMultiInstancePort', () => {
    it('should return the allocated port for a specific instance', async () => {
      const allocation = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-0',
      );

      const port = portManager.getMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-0',
      );

      expect(port).toBe(allocation.port);
    });

    it('should return undefined for non-allocated instance', () => {
      const port = portManager.getMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'non-existent-instance',
      );

      expect(port).toBeUndefined();
    });

    it('should distinguish between different instances of the same resource', async () => {
      const allocation1 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-0',
      );
      const allocation2 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-1',
      );

      const port1 = portManager.getMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-0',
      );
      const port2 = portManager.getMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-1',
      );

      expect(port1).toBe(allocation1.port);
      expect(port2).toBe(allocation2.port);
      expect(port1).not.toBe(port2);
    });

    it('should return undefined after instance is released', async () => {
      await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-0',
      );

      portManager.releaseMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-0',
      );

      const port = portManager.getMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-0',
      );

      expect(port).toBeUndefined();
    });
  });

  describe('Random port allocation', () => {
    it('should allocate random ports in the 32768-60999 range for all resources', async () => {
      const allocation1 = await portManager.allocatePort(
        ResourceType.FIXTURE_SERVER,
      );
      const allocation2 = await portManager.allocatePort(
        ResourceType.MOCK_SERVER,
      );
      const allocation3 = await portManager.allocatePort(ResourceType.GANACHE);

      // All ports should be random (32768-60999)
      expect(allocation1.port).toBeGreaterThanOrEqual(32768);
      expect(allocation1.port).toBeLessThanOrEqual(60999);
      expect(allocation2.port).toBeGreaterThanOrEqual(32768);
      expect(allocation2.port).toBeLessThanOrEqual(60999);
      expect(allocation3.port).toBeGreaterThanOrEqual(32768);
      expect(allocation3.port).toBeLessThanOrEqual(60999);

      // All ports should be different
      expect(allocation1.port).not.toBe(allocation2.port);
      expect(allocation1.port).not.toBe(allocation3.port);
      expect(allocation2.port).not.toBe(allocation3.port);
    });

    it('should allocate ports in the specified range for multi-instance resources', async () => {
      const allocation1 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-0',
      );
      const allocation2 = await portManager.allocateMultiInstancePort(
        ResourceType.DAPP_SERVER,
        'dapp-server-1',
      );

      // Both should be in range
      expect(allocation1.port).toBeGreaterThanOrEqual(32768);
      expect(allocation1.port).toBeLessThanOrEqual(60999);
      expect(allocation2.port).toBeGreaterThanOrEqual(32768);
      expect(allocation2.port).toBeLessThanOrEqual(60999);

      // Ports should be different
      expect(allocation1.port).not.toBe(allocation2.port);
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

      expect(allocation2.port).toBeGreaterThanOrEqual(32768);
      expect(allocation2.port).toBeLessThanOrEqual(60999);
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

  describe('BrowserStack Mode', () => {
    let isBrowserStackSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock isBrowserStack to return true for BrowserStack mode tests
      isBrowserStackSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(PortManager.prototype as any, 'isBrowserStack')
        .mockReturnValue(true);
      PortManager.resetInstance();
      portManager = PortManager.getInstance();
    });

    afterEach(() => {
      isBrowserStackSpy.mockRestore();
    });

    describe('allocatePort with BROWSERSTACK_LOCAL=true', () => {
      it('should use static fallback port for FIXTURE_SERVER', async () => {
        const allocation = await portManager.allocatePort(
          ResourceType.FIXTURE_SERVER,
        );

        expect(allocation.port).toBe(FALLBACK_FIXTURE_SERVER_PORT);
        expect(allocation.resourceType).toBe(ResourceType.FIXTURE_SERVER);
      });

      it('should use static fallback port for MOCK_SERVER', async () => {
        const allocation = await portManager.allocatePort(
          ResourceType.MOCK_SERVER,
        );

        expect(allocation.port).toBe(FALLBACK_MOCKSERVER_PORT);
      });

      it('should use static fallback port for COMMAND_QUEUE_SERVER', async () => {
        const allocation = await portManager.allocatePort(
          ResourceType.COMMAND_QUEUE_SERVER,
        );

        expect(allocation.port).toBe(FALLBACK_COMMAND_QUEUE_SERVER_PORT);
      });

      it('should use static fallback port for GANACHE', async () => {
        const allocation = await portManager.allocatePort(ResourceType.GANACHE);

        expect(allocation.port).toBe(FALLBACK_GANACHE_PORT);
      });

      it('should use static fallback port for ANVIL', async () => {
        const allocation = await portManager.allocatePort(ResourceType.ANVIL);

        expect(allocation.port).toBe(DEFAULT_ANVIL_PORT);
      });

      it('should use static fallback port for DAPP_SERVER', async () => {
        const allocation = await portManager.allocatePort(
          ResourceType.DAPP_SERVER,
        );

        expect(allocation.port).toBe(FALLBACK_DAPP_SERVER_PORT);
      });

      it('should return same static port on multiple calls', async () => {
        const allocation1 = await portManager.allocatePort(
          ResourceType.MOCK_SERVER,
        );
        const allocation2 = await portManager.allocatePort(
          ResourceType.MOCK_SERVER,
        );

        expect(allocation1.port).toBe(FALLBACK_MOCKSERVER_PORT);
        expect(allocation2.port).toBe(FALLBACK_MOCKSERVER_PORT);
        expect(allocation1).toBe(allocation2);
      });

      it('should use different static ports for different resources', async () => {
        const allocation1 = await portManager.allocatePort(
          ResourceType.FIXTURE_SERVER,
        );
        const allocation2 = await portManager.allocatePort(
          ResourceType.MOCK_SERVER,
        );
        const allocation3 = await portManager.allocatePort(
          ResourceType.GANACHE,
        );

        expect(allocation1.port).toBe(FALLBACK_FIXTURE_SERVER_PORT);
        expect(allocation2.port).toBe(FALLBACK_MOCKSERVER_PORT);
        expect(allocation3.port).toBe(FALLBACK_GANACHE_PORT);

        // All ports should be different
        expect(allocation1.port).not.toBe(allocation2.port);
        expect(allocation1.port).not.toBe(allocation3.port);
        expect(allocation2.port).not.toBe(allocation3.port);
      });
    });

    describe('allocateMultiInstancePort with BROWSERSTACK_LOCAL=true', () => {
      it('should use static fallback port + offset for first dapp instance', async () => {
        const allocation = await portManager.allocateMultiInstancePort(
          ResourceType.DAPP_SERVER,
          'dapp-server-0',
        );

        expect(allocation.port).toBe(FALLBACK_DAPP_SERVER_PORT + 0);
        expect(allocation.instanceId).toBe('dapp-server-0');
      });

      it('should use static fallback port + offset for second dapp instance', async () => {
        const allocation = await portManager.allocateMultiInstancePort(
          ResourceType.DAPP_SERVER,
          'dapp-server-1',
        );

        expect(allocation.port).toBe(FALLBACK_DAPP_SERVER_PORT + 1);
        expect(allocation.instanceId).toBe('dapp-server-1');
      });

      it('should use static fallback port + offset for third dapp instance', async () => {
        const allocation = await portManager.allocateMultiInstancePort(
          ResourceType.DAPP_SERVER,
          'dapp-server-2',
        );

        expect(allocation.port).toBe(FALLBACK_DAPP_SERVER_PORT + 2);
        expect(allocation.instanceId).toBe('dapp-server-2');
      });

      it('should allocate different static ports for multiple dapp instances', async () => {
        const allocation1 = await portManager.allocateMultiInstancePort(
          ResourceType.DAPP_SERVER,
          'dapp-server-0',
        );
        const allocation2 = await portManager.allocateMultiInstancePort(
          ResourceType.DAPP_SERVER,
          'dapp-server-1',
        );
        const allocation3 = await portManager.allocateMultiInstancePort(
          ResourceType.DAPP_SERVER,
          'dapp-server-2',
        );

        expect(allocation1.port).toBe(FALLBACK_DAPP_SERVER_PORT);
        expect(allocation2.port).toBe(FALLBACK_DAPP_SERVER_PORT + 1);
        expect(allocation3.port).toBe(FALLBACK_DAPP_SERVER_PORT + 2);

        // All should be different
        expect(allocation1.port).not.toBe(allocation2.port);
        expect(allocation1.port).not.toBe(allocation3.port);
        expect(allocation2.port).not.toBe(allocation3.port);
      });

      it('should return same static port for same instance', async () => {
        const allocation1 = await portManager.allocateMultiInstancePort(
          ResourceType.DAPP_SERVER,
          'dapp-server-0',
        );
        const allocation2 = await portManager.allocateMultiInstancePort(
          ResourceType.DAPP_SERVER,
          'dapp-server-0',
        );

        expect(allocation1.port).toBe(FALLBACK_DAPP_SERVER_PORT);
        expect(allocation2.port).toBe(FALLBACK_DAPP_SERVER_PORT);
        expect(allocation1).toBe(allocation2);
      });
    });

    describe('BrowserStack mode behavior', () => {
      it('should use static ports when isBrowserStack returns true', async () => {
        // Already mocked to return true in parent beforeEach
        const allocation = await portManager.allocatePort(
          ResourceType.FIXTURE_SERVER,
        );

        expect(allocation.port).toBe(FALLBACK_FIXTURE_SERVER_PORT);
      });

      it('should use dynamic ports when isBrowserStack returns false', async () => {
        // Override the spy to return false for this test
        isBrowserStackSpy.mockReturnValue(false);
        PortManager.resetInstance();
        portManager = PortManager.getInstance();

        const allocation = await portManager.allocatePort(
          ResourceType.FIXTURE_SERVER,
        );

        // Should be dynamic port, not fallback
        expect(allocation.port).not.toBe(FALLBACK_FIXTURE_SERVER_PORT);
        expect(allocation.port).toBeGreaterThanOrEqual(32768);
        expect(allocation.port).toBeLessThanOrEqual(60999);
      });
    });

    describe('BrowserStack mode with all resource types', () => {
      it('should use correct static fallback ports for all resources', async () => {
        const expectedPorts = new Map([
          [ResourceType.FIXTURE_SERVER, FALLBACK_FIXTURE_SERVER_PORT],
          [ResourceType.MOCK_SERVER, FALLBACK_MOCKSERVER_PORT],
          [
            ResourceType.COMMAND_QUEUE_SERVER,
            FALLBACK_COMMAND_QUEUE_SERVER_PORT,
          ],
          [ResourceType.GANACHE, FALLBACK_GANACHE_PORT],
          [ResourceType.ANVIL, DEFAULT_ANVIL_PORT],
          [ResourceType.DAPP_SERVER, FALLBACK_DAPP_SERVER_PORT],
        ]);

        for (const [resourceType, expectedPort] of expectedPorts.entries()) {
          const allocation = await portManager.allocatePort(resourceType);
          expect(allocation.port).toBe(expectedPort);
          expect(allocation.resourceType).toBe(resourceType);
        }
      });
    });
  });
});
