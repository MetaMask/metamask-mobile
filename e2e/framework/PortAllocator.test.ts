import PortAllocator, {
  PortAllocator as PortAllocatorClass,
} from './PortAllocator';

describe('PortAllocator', () => {
  beforeEach(() => {
    PortAllocator.reset();
  });

  it('should be a singleton', () => {
    const instance1 = PortAllocatorClass.getInstance();
    const instance2 = PortAllocatorClass.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should allocate ports for resources', () => {
    const port1 = PortAllocator.allocatePort('resource1');
    const portRange = PortAllocator.getPortRange();

    expect(port1).toBeGreaterThanOrEqual(portRange.min);
    expect(port1).toBeLessThanOrEqual(portRange.max);

    const port2 = PortAllocator.allocatePort('resource2');
    expect(port2).not.toBe(port1);
  });

  it('should return the same port for the same resource', () => {
    const port1 = PortAllocator.allocatePort('resource1');
    const port2 = PortAllocator.allocatePort('resource1');
    expect(port1).toBe(port2);
  });

  it('should honor preferred ports when available', () => {
    const portRange = PortAllocator.getPortRange();
    const preferredPort = portRange.min + 100; // Pick a port in the valid range
    const port = PortAllocator.allocatePort('resource1', preferredPort);
    expect(port).toBe(preferredPort);
  });

  it('should find another port when preferred port is not available', () => {
    const portRange = PortAllocator.getPortRange();
    const preferredPort = portRange.min + 100;
    PortAllocator.allocatePort('resource1', preferredPort);

    // Try to allocate the same port to another resource
    const port = PortAllocator.allocatePort('resource2', preferredPort);
    expect(port).not.toBe(preferredPort);
  });

  it('should release ports correctly', () => {
    const port = PortAllocator.allocatePort('resource1');
    expect(PortAllocator.getPort('resource1')).toBe(port);

    PortAllocator.releasePort('resource1');
    expect(PortAllocator.getPort('resource1')).toBeUndefined();

    const newPort = PortAllocator.allocatePort('resource2', port);
    expect(newPort).toBe(port);
  });

  it('should get all allocated ports', () => {
    PortAllocator.allocatePort('resource1');
    PortAllocator.allocatePort('resource2');

    const allocatedPorts = PortAllocator.getAllocatedPorts();
    expect(allocatedPorts.size).toBe(2);
    expect(allocatedPorts.has('resource1')).toBe(true);
    expect(allocatedPorts.has('resource2')).toBe(true);
  });

  it('should provide a valid port range', () => {
    const portRange = PortAllocator.getPortRange();

    expect(portRange.min).toBeDefined();
    expect(portRange.max).toBeDefined();
    expect(portRange.min).toBeLessThan(portRange.max);
    expect(portRange.max - portRange.min).toBeGreaterThanOrEqual(999); // At least 1000 ports in range
  });

  it('should use different port ranges in CI environment', () => {
    try {
      // Force CI mode using the new method
      PortAllocator.reinitializePortRange(true);

      const ciPortRange = PortAllocator.getPortRange();

      // CI port range should start at 10000 or higher
      expect(ciPortRange.min).toBeGreaterThanOrEqual(10000);
      expect(ciPortRange.max).toBeLessThanOrEqual(65535);
      expect(ciPortRange.max - ciPortRange.min).toBeGreaterThanOrEqual(999);
    } finally {
      // Reset to default port range
      PortAllocator.reinitializePortRange(false);
      PortAllocator.reset();
    }
  });
});
