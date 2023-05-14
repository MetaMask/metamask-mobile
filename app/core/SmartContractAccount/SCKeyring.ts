/* eslint-disable no-console */
import { ethers, BigNumber } from 'ethers';
import { hexlify } from 'ethers/lib/utils';
import Web3 from 'web3';

import { fillAndSign, fillUserOpDefaults, getUserOpHash } from './utils';
import {
  POLYGON_MUMBAI_ADDRESS,
  POLYGON_MUMBAI_CHAIN_ID,
  ENTRY_POINT_ADDRESS,
} from './constants';
import { EntryPointABI, FactoryABI, WalletABI } from './ABIs';
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

  public async signTransaction(from: string, transaction: any) {
    const web3 = new Web3();
    const entryPointContract = new this.#provider.eth.Contract(
      EntryPointABI,
      ENTRY_POINT_ADDRESS.mumbai,
    );

    const walletContract = new this.#provider.eth.Contract(WalletABI, from);
    const nonce = await walletContract.methods.nonce().call();
    console.log(typeof nonce);
    console.log(web3.utils.toHex(nonce));

    const executionSig = web3.eth.abi.encodeFunctionSignature(
      'execute(address,uint256,bytes)',
    );

    const executionData =
      executionSig +
      web3.eth.abi
        .encodeParameters(
          ['address', 'uint256', 'bytes'],
          [
            transaction.to
              ? web3.utils.toHex(transaction.to.toString())
              : ethers.constants.AddressZero,
            transaction.value,
            transaction.data ? web3.utils.toHex(transaction.data) : '0x',
          ],
        )
        .substr(2);

    console.log({ executionSig, executionData });

    const userOp = await fillAndSign(
      fillUserOpDefaults({
        sender: from,
        callData: executionData,
        paymasterAndData: '0x', // opts.usePaymaster ? hexConcat(['0x1Fc92037a8236AfFB3328cbEf71dd986c4a373dD', hexZeroPad('0x3de9210F3D577272Cdb8404Cd5276C4B5dBC5b91', 32), hexZeroPad(hexlify(1), 32)]) : '0x',
        nonce: web3.utils.toHex(nonce),
        callGasLimit: hexlify(2000000),
        verificationGasLimit: hexlify(1000000),
        maxFeePerGas: hexlify(3e9),
      }),
      this.#signer,
      entryPointContract,
    );

    const userOpHash = getUserOpHash(
      userOp,
      ENTRY_POINT_ADDRESS.mumbai,
      web3.utils.toHex(POLYGON_MUMBAI_CHAIN_ID),
    );

    console.log({ userOp, userOpHash });

    return { ...transaction, userOp, userOpHash };
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
