import { Contract } from '@ethersproject/contracts';
import { BaseController } from '@metamask/base-controller';
import type { KeyringController } from '@metamask/keyring-controller';
import { BigNumber, ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
// import { randomBytes } from 'ethers/lib/utils';
import { SCAConfig, SCAState } from './types';
import {
  POLYGON_MUMBAI_ADDRESS,
  POLYGON_MUMBAI_CHAIN_ID,
  POLYGON_MUMBAI_NAME,
} from './constants';
import FactoryABI from './ABIs/FactoryABI';
import { PreferencesController } from '@metamask/preferences-controller';

const ALCHEMY_API_KEY = 'ADD API KEY HERE';

const debugLog = (args: any): void =>
  // eslint-disable-next-line no-console
  console.log(`[HACKATON DEBUG] - ${args}`);

class SCAController extends BaseController<SCAConfig, SCAState> {
  override name = 'SCAController';

  private exportAccount: KeyringController['exportAccount'];

  constructor({
    onNetworkStateChange,
    exportAccount,
    config,
    state,
  }: {
    onNetworkStateChange: any;
    exportAccount: KeyringController['exportAccount'];
    config: SCAConfig;
    state?: SCAState;
  }) {
    super(config, state);
    // this.#provider = provider;
    this.exportAccount = exportAccount;
    onNetworkStateChange(({ providerConfig }: { providerConfig: any }) => {
      const { chainId } = providerConfig;
      console.log('The current chain is', chainId);
    });
  }

  async createSCAccount(signerPublicAddress: string): Promise<void> {
    const alchemyProvider = new ethers.providers.AlchemyProvider(
      POLYGON_MUMBAI_NAME,
      ALCHEMY_API_KEY,
    );
    const infuraProvider = new ethers.providers.InfuraProvider(
      POLYGON_MUMBAI_NAME,
      process.env.MM_INFURA_PROJECT_ID,
    );
    debugLog('AlchemyProvider provider created');

    const privateKey = await this.exportAccount(
      'password',
      signerPublicAddress,
    );

    const signer = new ethers.Wallet(privateKey, alchemyProvider);
    debugLog('Signer created');

    const contract = new Contract(POLYGON_MUMBAI_ADDRESS, FactoryABI, signer);
    debugLog('Contract instance created');

    const options = {
      gasLimit: 200000,
    };
    const salt = BigNumber.from(29378417934); // randomBytes(16)
    try {
      const receipt = await contract.createAccount(
        signerPublicAddress,
        salt,
        [],
        options,
      );

      console.log(`Transaction hash: ${receipt.transactionHash}`);
      console.log(`Block number: ${receipt.blockNumber}`);
    } catch (e) {
      console.log(e);
    }
  }

  // constructUserOp() {};

  // requestSignature() {};

  // constructUserOp() {};
}

export default SCAController;
