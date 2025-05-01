import { createAnvil, Anvil as AnvilType } from '@viem/anvil';
import { createAnvilClients } from './anvil-clients';

type Hardfork =
  | 'Frontier'
  | 'Homestead'
  | 'Dao'
  | 'Tangerine'
  | 'SpuriousDragon'
  | 'Byzantium'
  | 'Constantinople'
  | 'Petersburg'
  | 'Istanbul'
  | 'Muirglacier'
  | 'Berlin'
  | 'London'
  | 'ArrowGlacier'
  | 'GrayGlacier'
  | 'Paris'
  | 'Shanghai'
  | 'Latest';

type Hex = `0x${string}`;

const defaultOptions = {
  balance: 25,
  chainId: 1337,
  gasLimit: 30000000,
  gasPrice: 2000000000,
  hardfork: 'Muirglacier' as Hardfork,
  host: '127.0.0.1',
  mnemonic:
    'spread raise short crane omit tent fringe mandate neglect detail suspect cradle',
  port: 8545,
  noMining: false,
};

class AnvilManager {
  private server: AnvilType | undefined;
  async start(
    opts: {
      balance?: number;
      blockTime?: number;
      chainId?: number;
      gasLimit?: number;
      gasPrice?: number;
      hardfork?: Hardfork;
      host?: string;
      mnemonic?: string;
      port?: number;
      noMining?: boolean;
    } = {},
  ): Promise<void> {
    const options = { ...defaultOptions, ...opts };

    // Set blockTime if noMining is disabled, as those 2 options are incompatible
    if (!opts?.noMining && !opts?.blockTime) {
      options.blockTime = 2;
    }

    this.server = createAnvil(options);
    await this.server.start();
  }

  getProvider() {
    if (!this.server) {
      throw new Error('Server not running yet');
    }
    const { walletClient, publicClient, testClient } = createAnvilClients(
      this.server.options.chainId ?? 1337,
      this.server.options.port ?? 8545,
    );

    return { walletClient, publicClient, testClient };
  }

async getAccounts(){
    const provider = this.getProvider();
    const {walletClient} = provider

    const accounts = await walletClient.getAddresses();

    return accounts;
}  

  async setAccountBalance(address: Hex, balance: string): Promise<void> {
    const provider = this.getProvider();
    const { testClient } = provider;

    const balanceInWei = BigInt(balance);
    await testClient.setBalance({
      address,
      value: balanceInWei,
    });
  }

  async quit(): Promise<void> {
    if (!this.server) {
      throw new Error('Server not running yet');
    }
    try {
      await this.server.stop();
    } catch (e) {
      console.log('Caught error while closing Anvil network:', e);
    }
  }
}
export { AnvilManager };
