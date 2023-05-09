import { Contract } from '@ethersproject/contracts';
import { BaseController } from '@metamask/base-controller';
import type { KeyringController } from '@metamask/keyring-controller';
import { BigNumber, ethers } from 'ethers';
// import { randomBytes } from 'ethers/lib/utils';
import { SCAConfig, SCAState } from './types';
import { POLYGON_MUMBAI_ADDRESS, POLYGON_MUMBAI_NAME } from './constants';
import FactoryABI from './ABIs/FactoryABI';

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
    const provider = new ethers.providers.JsonRpcProvider(
      `https://polygon-mumbai.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`,
    );
    const privateKey = await this.exportAccount(
      'fake password',
      signerPublicAddress,
    );
    const signer = new ethers.Wallet(privateKey, provider);
    const contract = new Contract(POLYGON_MUMBAI_ADDRESS, FactoryABI, signer);
    const salt = BigNumber.from(1); // randomBytes(16);
    const methodArgs = [signerPublicAddress, salt, [signerPublicAddress]];
    // const method = await contract.createAccount(...methodArgs);

    console.log({ signerPublicAddress, privateKey, methodArgs, contract });

    // const ethersProvider = new ethers.providers.AlchemyProvider(
    //   POLYGON_MUMBAI_NAME,
    // );
    // const createAccountMethod = contract.createAccount(...methodArgs);
    // console.log({ createAccountMethod, methodArgs });
  }

  // constructUserOp() {};

  // requestSignature() {};

  // constructUserOp() {};
}

export default SCAController;
