import { ethers } from 'ethers';

class Web3 {
  static async getTransaction(chainId, hash) {
    console.log('MM_INFURA_PROJECT_ID', process.env.MM_INFURA_PROJECT_ID);
    const provider = ethers.providers.getDefaultProvider(Number(chainId));

    const txn = await provider.getTransaction(hash);
    console.log('txn', txn);
    return txn;
  }
}

export default Web3;
