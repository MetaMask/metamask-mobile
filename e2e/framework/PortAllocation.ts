/**
 * Singleton store for allocated ports used during E2E runs.
 *
 * - FixtureServer: single numeric port
 * - MockServer: single numeric port
 * - TestDapp: map (index -> port) that can hold an arbitrary number of dapps
 */
class PortAllocationStore {
  private static instance: PortAllocationStore | undefined;

  private fixtureServerPort: number | undefined;
  private mockServerPort: number | undefined;
  private testDappPorts: Map<number, number>;
  private localNodePorts: Map<number, number>;
  private reservedPorts: Set<number>;

  private constructor() {
    this.fixtureServerPort = undefined;
    this.mockServerPort = undefined;
    this.testDappPorts = new Map();
    this.localNodePorts = new Map();
    this.reservedPorts = new Set();
  }

  static getInstance(): PortAllocationStore {
    if (!PortAllocationStore.instance) {
      PortAllocationStore.instance = new PortAllocationStore();
    }
    return PortAllocationStore.instance;
  }

  // Fixture server
  setFixtureServerPort(port: number): void {
    this.fixtureServerPort = port;
  }
  getFixtureServerPort(): number | undefined {
    return this.fixtureServerPort;
  }

  // Mock server
  setMockServerPort(port: number): void {
    this.mockServerPort = port;
  }
  getMockServerPort(): number | undefined {
    return this.mockServerPort;
  }

  // Test dapps
  addTestDappPort(index: number, port: number): void {
    this.testDappPorts.set(index, port);
    this.reservedPorts.add(port);
  }
  getTestDappPort(index: number): number | undefined {
    return this.testDappPorts.get(index);
  }
  getAllTestDappPorts(): Map<number, number> {
    return this.testDappPorts;
  }
  removeTestDappPort(index: number): void {
    const existing = this.testDappPorts.get(index);
    if (typeof existing === 'number') {
      this.reservedPorts.delete(existing);
    }
    this.testDappPorts.delete(index);
  }
  clearTestDappPorts(): void {
    this.testDappPorts.clear();
  }

  // Local node ports (multiple, same pattern as dapps)
  addLocalNodePort(index: number, port: number): void {
    this.localNodePorts.set(index, port);
    this.reservedPorts.add(port);
  }
  getLocalNodePort(index: number): number | undefined {
    return this.localNodePorts.get(index);
  }
  getAllLocalNodePorts(): Map<number, number> {
    return this.localNodePorts;
  }
  removeLocalNodePort(index: number): void {
    const existing = this.localNodePorts.get(index);
    if (typeof existing === 'number') {
      this.reservedPorts.delete(existing);
    }
    this.localNodePorts.delete(index);
  }
  clearLocalNodePorts(): void {
    this.localNodePorts.clear();
  }

  // Utilities
  reset(): void {
    this.fixtureServerPort = undefined;
    this.mockServerPort = undefined;
    this.testDappPorts.clear();
    this.localNodePorts.clear();
    this.reservedPorts.clear();
  }

  // Reservation helpers (JS-only, no OS probing)
  isPortReserved(port: number): boolean {
    return this.reservedPorts.has(port);
  }
  reserveSpecificPort(port: number): boolean {
    if (this.reservedPorts.has(port)) return false;
    this.reservedPorts.add(port);
    return true;
  }
  releasePort(port: number): void {
    this.reservedPorts.delete(port);
  }
  reserveRandomPort(min = 20000, max = 60000, maxAttempts = 100): number {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const candidate =
        Math.floor(Math.random() * (max - min + 1)) + Math.floor(min);
      if (!this.reservedPorts.has(candidate)) {
        this.reservedPorts.add(candidate);
        return candidate;
      }
    }
    throw new Error('Unable to reserve a random port after multiple attempts');
  }
}

export default PortAllocationStore.getInstance();
export { PortAllocationStore };
