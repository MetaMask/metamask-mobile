/* eslint-disable no-console */
import { BigNumber } from 'ethers';
import Web3 from 'web3';

import { POLYGON_MUMBAI_ADDRESS, POLYGON_MUMBAI_CHAIN_ID } from './constants';
import { FactoryABI, WalletABI } from './ABIs';
import { SCAccount } from './types';

class SCKeyring {
  static type = 'Smart Contract';
  public type = 'Smart Contract';

  #provider: Web3.providers.HttpProvider;
  #factoryContract: any;
  #accounts: SCAccount[];
  #signer: { address: string; privateKey: string } | null;

  constructor(opts?: { signer: { address: string; privateKey: string } }) {
    this.#provider = new Web3(
      new Web3.providers.HttpProvider(
        `https://polygon-mumbai.infura.io/v3/${process.env.MM_INFURA_PROJECT_ID}`,
      ),
    );
    this.#factoryContract = new this.#provider.eth.Contract(
      FactoryABI,
      POLYGON_MUMBAI_ADDRESS,
    );
    this.#accounts = [];
    this.#signer = opts?.signer || null;
  }

  public async serialize() {
    if (!this.#signer) {
      throw new Error('No signer available');
    }

    return {
      signerAddress: this.#signer.address,
      signerPrivateKey: this.#signer.privateKey,
      accounts: this.#accounts.map((account) => JSON.stringify(account)),
    };
  }

  public async deserialize(data: {
    accounts: any[];
    signerAddress: string;
    signerPrivateKey: string;
  }) {
    this.#accounts = data.accounts;
    this.#signer = {
      address: data.signerAddress,
      privateKey: data.signerPrivateKey,
    };
  }

  public async getAccounts() {
    return this.#accounts.map((account) => account.address);
  }

  public signTransaction(transaction: any, from: string) {
    console.log({ transaction, from });
    throw new Error('Calling the signing method');
  }

  public newSmartWalletInstance(walletAddress: string) {
    return this.#provider.eth.Contract(WalletABI, walletAddress);
  }

  public async addAccount() {
    if (!this.#signer) {
      throw new Error('No signer available');
    }

    try {
      // const proposedSalt = new Date().valueOf();
      const salt = BigNumber.from(1683839989182);
      const account = this.#provider.eth.accounts.privateKeyToAccount(
        this.#signer.privateKey,
      );
      const nonce = await this.#provider.eth.getTransactionCount(
        account.address,
      );
      const gasLimit = await this.#factoryContract.methods
        .createAccount(account.address, salt, [])
        .estimateGas({
          from: account.address,
        });

      const method = this.#factoryContract.methods.createAccount(
        account.address,
        salt,
        [],
      );
      const data = method.encodeABI();

      const txObject = {
        from: account.address,
        to: POLYGON_MUMBAI_ADDRESS,
        value: 0,
        data,
        gasLimit,
        nonce,
        chainId: POLYGON_MUMBAI_CHAIN_ID,
        type: 2, // Type 2 transaction
      };

      const signedTx = await this.#provider.eth.accounts.signTransaction(
        txObject,
        this.#signer.privateKey,
      );

      if (typeof signedTx.rawTransaction === 'string') {
        const txReceipt = await this.#provider.eth.sendSignedTransaction(
          signedTx.rawTransaction,
        );

        // eslint-disable-next-line no-console
        console.log({ txReceipt });
        const newAddress = await this.#getAccount(this.#signer.address, salt);

        const oldAccount = this.#accounts.some(
          (acc: SCAccount) => acc.address === newAddress,
        );

        if (oldAccount) return oldAccount;

        this.#accounts.push({
          address: newAddress,
          signer: this.#signer,
          salt,
        });
        return newAddress;
      }
      throw new Error('Error while creating account');
    } catch (e) {
      console.log(e);
    }
  }

  async #getAccount(signerAddress: string, salt: BigNumber): Promise<string> {
    return await this.#factoryContract.methods
      .getAddress(signerAddress, salt)
      .call();
  }
}

export default SCKeyring;
