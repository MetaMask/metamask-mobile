import { Contract } from '@ethersproject/contracts';
import { Web3Provider } from '@ethersproject/providers';
import { ethers } from 'ethers';
import { BaseController } from '@metamask/base-controller';
import { randomBytes } from 'ethers/lib/utils';
import { SCAConfig, SCAState } from './types';
import FactoryABI from './ABIs/FactoryABI';

const POLYGON_MUMBAI_ADDRESS = '0x665cf455371e12EA5D49a7bA295cD060f436D95e';
const POLYGON_MUMBAI_CHAIN_ID = '80001';

class SCAController extends BaseController<SCAConfig, SCAState> {
  override name = 'SCAController';
  #provider: any;

  constructor({
    onNetworkStateChange,
    provider,
    config,
    state,
  }: {
    onNetworkStateChange: any;
    provider: any;
    config: SCAConfig;
    state?: SCAState;
  }) {
    super(config, state);
    this.#provider = provider;
    onNetworkStateChange(({ providerConfig }: { providerConfig: any }) => {
      const { chainId } = providerConfig;
      console.log('The current chain is', chainId);
    });
  }

  async createSCAccount(signerPublicAddress: string): Promise<void> {
    // const ethersProvider = new Web3Provider(this.config.provider);
    // console.log({ config: this.config, provider: this.#provider.chainId });
    const ethersProvider = new ethers.providers.AlchemyProvider('maticmum');
    const contract = new Contract(
      POLYGON_MUMBAI_ADDRESS,
      FactoryABI,
      ethersProvider,
    );
    const salt = 'salt'; // randomBytes(16);
    const response = await contract.createAccount();
    console.log({ response });
  }

  // constructUserOp() {};

  // requestSignature() {};

  // constructUserOp() {};
}

export default SCAController;
