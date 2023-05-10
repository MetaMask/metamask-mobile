import { Contract } from '@ethersproject/contracts';
import { BaseController } from '@metamask/base-controller';
import type { KeyringController } from '@metamask/keyring-controller';
import { BigNumber, ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import Web3 from 'web3';
// import { randomBytes } from 'ethers/lib/utils';
import { SCAConfig, SCAState } from './types';
import {
  POLYGON_MUMBAI_ADDRESS,
  POLYGON_MUMBAI_CHAIN_ID,
  POLYGON_MUMBAI_NAME,
} from './constants';
import FactoryABI from './ABIs/FactoryABI';

const ALCHEMY_API_KEY = '52zZi12gzMeHLUoTW3Pv_J_G7XzvXbsU';

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
      // eslint-disable-next-line no-console
      console.log('The current chain is', chainId);
    });
  }

  async web3_createAccountWithWeb3(signerPublicAddress: string) {
    try {
      const web3 = new Web3(
        new Web3.providers.HttpProvider(
          `https://polygon-mumbai.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`,
        ),
      );

      const privateKey = await this.exportAccount(
        'password', // Mock password, the patch bypass the validation.
        signerPublicAddress,
      );
      const contract = new web3.eth.Contract(
        // @ts-expect-error Ignore type error
        FactoryABI,
        POLYGON_MUMBAI_ADDRESS,
      );
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);

      const gasPrice = await web3.eth.getGasPrice();
      const nonce = await web3.eth.getTransactionCount(account.address);
      const salt = BigNumber.from(29378417934);
      const gasLimit = await contract.methods
        .createAccount(account.address, salt, [])
        .estimateGas({
          from: account.address,
        });

      // eslint-disable-next-line no-console
      console.log({ account, gasPrice, nonce, gasLimit });
      const method = contract.methods.createAccount(account.address, salt, []);
      const data = method.encodeABI();

      // eslint-disable-next-line no-console
      console.log({ data });

      const txObject = {
        from: account.address,
        to: POLYGON_MUMBAI_ADDRESS,
        value: 0,
        data,
        gasLimit,
        chainId: 80001, // Polygon Mumbai testnet chain id
        type: 2, // Type 2 transaction
      };

      // sign the transaction with the private key
      const signedTx = await web3.eth.accounts.signTransaction(
        txObject,
        privateKey,
      );

      if (typeof signedTx.rawTransaction === 'string') {
        const txReceipt = await web3.eth.sendSignedTransaction(
          signedTx.rawTransaction,
        );
        // eslint-disable-next-line no-console
        console.log({ signedTx, txReceipt });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(e);
    }
  }

  async ethers_createSCAccount(signerPublicAddress: string): Promise<void> {
    const alchemyProvider = new ethers.providers.AlchemyProvider(
      POLYGON_MUMBAI_NAME,
      ALCHEMY_API_KEY,
    );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const infuraProvider = new ethers.providers.InfuraProvider(
      POLYGON_MUMBAI_NAME,
      process.env.MM_INFURA_PROJECT_ID,
    );

    const privateKey = await this.exportAccount(
      'password', // Mock password, the patch bypass the validation.
      signerPublicAddress,
    );

    const signer = new ethers.Wallet(privateKey, alchemyProvider);
    const contract = new Contract(POLYGON_MUMBAI_ADDRESS, FactoryABI, signer);

    const salt = BigNumber.from(29378417934); // randomBytes(16)
    try {
      const receipt = await contract.createAccount(
        signerPublicAddress,
        salt,
        [],
      );

      // eslint-disable-next-line no-console
      console.log(
        `Transaction hash: ${receipt.hash}`,
        `Block number: ${receipt.blockNumber}`,
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('-- Error while trying to execute the method', e);
    }
  }
}

export default SCAController;
