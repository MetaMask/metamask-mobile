import type {
  ContractDeployment,
  ContractInfo,
  ContractSeedingCapability,
  DeployOptions,
} from '@metamask/client-mcp-core';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { AnvilSeeder } from '../../../tests/seeder/anvil-seeder';
import type { MetaMaskMobileChainCapability } from './chain';

export const AVAILABLE_CONTRACTS = [
  'hst',
  'nfts',
  'erc1155',
  'piggybank',
  'failing',
  'multisig',
] as const;

export type SmartContractName = (typeof AVAILABLE_CONTRACTS)[number];

export interface ContractSeedingCapabilityOptions {
  chainCapability: MetaMaskMobileChainCapability;
}

/**
 * MetaMask Mobile contract seeding capability.
 * Thin wrapper over AnvilSeeder with an internal deployment registry.
 */
export class MetaMaskMobileContractSeedingCapability
  implements ContractSeedingCapability
{
  private seeder: AnvilSeeder | undefined;

  private readonly chainCapability: MetaMaskMobileChainCapability;

  private deploymentRegistry: Map<string, ContractDeployment> = new Map();

  constructor(options: ContractSeedingCapabilityOptions) {
    this.chainCapability = options.chainCapability;
  }

  /**
   * Initialize the seeder with the Anvil provider.
   * Must be called after chain.start().
   */
  initialize(): void {
    const provider = this.chainCapability.getAnvilManager().getProvider();
    this.seeder = new AnvilSeeder(provider);
  }

  /**
   * Deploy a single smart contract to Anvil.
   *
   * @param name - Contract name to deploy
   * @param options - Optional deployment options
   * @returns Deployed contract information
   */
  async deployContract(
    name: string,
    options?: DeployOptions,
  ): Promise<ContractDeployment> {
    if (!this.seeder) {
      throw new Error(
        'Seeder not initialized. Call initialize() after chain.start().',
      );
    }

    if (!AVAILABLE_CONTRACTS.includes(name as SmartContractName)) {
      throw new Error(
        `Unknown contract: ${name}. Available contracts: ${AVAILABLE_CONTRACTS.join(', ')}`,
      );
    }

    const contractKeyMap: Record<SmartContractName, string> = {
      hst: SMART_CONTRACTS.HST,
      nfts: SMART_CONTRACTS.NFTS,
      erc1155: SMART_CONTRACTS.ERC1155,
      piggybank: SMART_CONTRACTS.PIGGYBANK,
      failing: SMART_CONTRACTS.FAILING,
      multisig: SMART_CONTRACTS.MULTISIG,
    };

    const contractKey = contractKeyMap[name as SmartContractName];
    const hardfork = options?.hardfork ?? 'prague';

    await this.seeder.deploySmartContract(contractKey, hardfork);

    const address = this.seeder
      .getContractRegistry()
      .getContractAddress(contractKey);

    const deployment: ContractDeployment = {
      name,
      address,
      deployedAt: new Date().toISOString(),
    };

    this.deploymentRegistry.set(name, deployment);

    return deployment;
  }

  /**
   * Deploy multiple smart contracts in sequence.
   *
   * @param names - Array of contract names to deploy
   * @param options - Optional deployment options
   * @returns Object with deployed and failed contracts
   */
  async deployContracts(
    names: string[],
    options?: DeployOptions,
  ): Promise<{
    deployed: ContractDeployment[];
    failed: { name: string; error: string }[];
  }> {
    if (!this.seeder) {
      throw new Error(
        'Seeder not initialized. Call initialize() after chain.start().',
      );
    }

    const deployed: ContractDeployment[] = [];
    const failed: { name: string; error: string }[] = [];

    for (const name of names) {
      try {
        const contract = await this.deployContract(name, options);
        deployed.push(contract);
      } catch (error) {
        failed.push({
          name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { deployed, failed };
  }

  /**
   * Get the deployed address of a contract.
   *
   * @param name - Contract name to look up
   * @returns Contract address or null if not deployed
   */
  getContractAddress(name: string): string | null {
    return this.deploymentRegistry.get(name)?.address ?? null;
  }

  /**
   * List all deployed contracts in this session.
   *
   * @returns Array of deployed contract information
   */
  listDeployedContracts(): ContractInfo[] {
    return Array.from(this.deploymentRegistry.values()).map((deployment) => ({
      name: deployment.name,
      address: deployment.address,
      deployedAt: deployment.deployedAt,
    }));
  }

  /**
   * Get list of available contract names that can be deployed.
   *
   * @returns Array of available contract names
   */
  getAvailableContracts(): string[] {
    return [...AVAILABLE_CONTRACTS];
  }

  /**
   * Clear the deployment registry.
   * Called during cleanup.
   */
  clearRegistry(): void {
    this.deploymentRegistry.clear();
  }
}
