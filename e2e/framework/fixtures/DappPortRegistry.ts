/**
 * A registry to track which ports are being used by dapp servers
 * This allows other parts of the code to know which port a specific dapp is running on
 */
class DappPortRegistry {
  private static instance: DappPortRegistry;
  private dappPorts: Map<number, number> = new Map(); // dappIndex -> port
  private dappVariantPorts: Map<string, number> = new Map(); // dappVariant -> port

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): DappPortRegistry {
    if (!DappPortRegistry.instance) {
      DappPortRegistry.instance = new DappPortRegistry();
    }
    return DappPortRegistry.instance;
  }

  /**
   * Register a port for a dapp
   * @param dappIndex The index of the dapp in the dapp array
   * @param dappVariant The variant of the dapp (e.g. 'test-dapp')
   * @param port The port the dapp is running on
   */
  public registerPort(dappIndex: number, dappVariant: string, port: number): void {
    this.dappPorts.set(dappIndex, port);
    this.dappVariantPorts.set(dappVariant, port);
  }

  /**
   * Get the port for a dapp by index
   * @param dappIndex The index of the dapp
   * @returns The port the dapp is running on, or undefined if not found
   */
  public getPortByIndex(dappIndex: number): number | undefined {
    return this.dappPorts.get(dappIndex);
  }

  /**
   * Get the port for a dapp by variant
   * @param dappVariant The variant of the dapp
   * @returns The port the dapp is running on, or undefined if not found
   */
  public getPortByVariant(dappVariant: string): number | undefined {
    return this.dappVariantPorts.get(dappVariant);
  }

  /**
   * Get the port for the first dapp (convenience method)
   * @returns The port the first dapp is running on, or undefined if not found
   */
  public getFirstDappPort(): number | undefined {
    return this.getPortByIndex(0);
  }

  /**
   * Get the port for the second dapp (convenience method)
   * @returns The port the second dapp is running on, or undefined if not found
   */
  public getSecondDappPort(): number | undefined {
    return this.getPortByIndex(1);
  }

  /**
   * Clear all registered ports
   */
  public clear(): void {
    this.dappPorts.clear();
    this.dappVariantPorts.clear();
  }
}

export default DappPortRegistry;
