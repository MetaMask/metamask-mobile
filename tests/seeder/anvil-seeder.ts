import {
  SMART_CONTRACTS,
  contractConfiguration,
} from '../../app/util/test/smart-contracts';
import ContractAddressRegistry from '../../app/util/test/contract-address-registry';
import { createLogger } from '../framework/logger.ts';

const logger = createLogger({
  name: 'AnvilSeeder',
});

/* eslint-disable  @typescript-eslint/no-explicit-any */
interface DeployOptions {
  abi: any;
  account: string;
  args: any[];
  bytecode: string;
  gasPrice?: number;
}

interface ContractOptions {
  address: string;
  abi: any;
  functionName: string;
  args: any[];
  account: string;
  gasPrice?: number;
}

/*
 * Local network seeder is used to seed initial smart contract or set initial blockchain state.
 */
export class AnvilSeeder {
  private smartContractRegistry: InstanceType<typeof ContractAddressRegistry>;
  private provider: any;

  constructor(provider: any) {
    this.smartContractRegistry = new ContractAddressRegistry();
    this.provider = provider;
  }

  /**
   * Deploy initial smart contracts that can be used later within the e2e tests.
   *
   * @param contractName
   */

  async deploySmartContract(contractName: string, hardfork: string) {
    const { publicClient, testClient, walletClient } = this.provider;
    const fromAddress = (await walletClient.getAddresses())[0];

    const contractConfig = contractConfiguration[contractName];
    const deployArgs = this.getDeployArgs(contractName, contractConfig);

    const deployOptions: DeployOptions = {
      abi: contractConfig.abi,
      account: fromAddress,
      args: deployArgs,
      bytecode: contractConfig.bytecode,
    };

    // Add gasPrice if hardfork is muirGlacier to indicate it's a legacy tx
    if (hardfork === 'muirGlacier') {
      deployOptions.gasPrice = 20000;
    }

    const hash = await walletClient.deployContract(deployOptions);

    await testClient.mine({
      blocks: 1,
    });

    const receipt = await publicClient.getTransactionReceipt({ hash });
    logger.info('Deployed smart contract', {
      contractName,
      contractAddress: receipt.contractAddress,
    });

    if (contractName === SMART_CONTRACTS.NFTS) {
      const mintOptions: ContractOptions = {
        address: receipt.contractAddress,
        abi: contractConfig.abi,
        functionName: 'mintNFTs',
        args: [1],
        account: fromAddress,
      };

      if (hardfork === 'muirGlacier') {
        mintOptions.gasPrice = 20000;
      }

      await walletClient.writeContract(mintOptions);
    }

    if (contractName === SMART_CONTRACTS.ERC1155) {
      const mintBatchOptions: ContractOptions = {
        address: receipt.contractAddress,
        abi: contractConfig.abi,
        functionName: 'mintBatch',
        args: [fromAddress, [1, 2, 3], [1, 1, 100000000000000], '0x'],
        account: fromAddress,
      };

      if (hardfork === 'muirGlacier') {
        mintBatchOptions.gasPrice = 20000;
      }

      await walletClient.writeContract(mintBatchOptions);
    }

    this.storeSmartContractAddress(contractName, receipt.contractAddress);
  }

  async transfer(to: string, value: string) {
    const { publicClient, walletClient, testClient } = this.provider;
    const fromAddress = (await walletClient.getAddresses())[0];

    const transaction = await walletClient.sendTransaction({
      account: fromAddress,
      value,
      to,
    });
    await testClient.mine({
      blocks: 1,
    });

    await publicClient.getTransactionReceipt({ hash: transaction });
    logger.info('Completed transfer', { to, value });
  }

  /**
   * Store deployed smart contract address within the environment variables
   * to make it available everywhere.
   *
   * @param contractName
   * @param contractAddress
   */
  storeSmartContractAddress(contractName: string, contractAddress: string) {
    this.smartContractRegistry.storeNewContractAddress(
      contractName,
      contractAddress,
    );
  }

  /**
   * Return an instance of the currently used smart contract registry.
   *
   * @returns ContractAddressRegistry
   */
  getContractRegistry() {
    return this.smartContractRegistry;
  }

  getDeployArgs(contractName: string, contractConfig: any) {
    if (contractName === SMART_CONTRACTS.HST) {
      return [
        contractConfig.initialAmount,
        contractConfig.tokenName,
        contractConfig.decimalUnits,
        contractConfig.tokenSymbol,
      ];
    }
    return [];
  }
}
