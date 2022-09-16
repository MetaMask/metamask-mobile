import wallet_addEthereumChain from './wallet_addEthereumChain';
import Engine from '../Engine';
const correctParams = {
  chainId: '0x64',
  chainName: 'xDai',
  blockExplorerUrls: ['https://blockscout.com/xdai/mainnet'],
  nativeCurrency: { symbol: 'xDai', decimals: 18 },
  rpcUrls: ['https://rpc.gnosischain.com'],
};

const otherOptions = {
  res: {},
  addCustomNetworkRequest: {},
  switchCustomNetworkRequest: {},
};

describe('RPC Method - wallet_addEthereumChain', () => {
  const MOCK_ENGINE = {
    context: {
      PreferencesController: {
        state: {
          frequentRpcList: [],
        },
      },
      NetworkController: {
        state: {
          provider: {
            chainId: '1',
          },
        },
      },
    },
  };
  Engine.context = MOCK_ENGINE.context;

  it('should report missing params', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: null,
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain('Expected single, object parameter.');
    }
  });

  it('should report extra keys', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, extraKey: 10 }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        'Received unexpected keys on object parameter. Unsupported keys',
      );
    }
  });

  it('should report invalid rpc url', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, rpcUrls: ['invalid'] }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected an array with at least one valid string HTTPS url 'rpcUrls'`,
      );
    }
  });

  it('should report invalid block explorer url', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, blockExplorerUrls: ['invalid'] }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected null or array with at least one valid string HTTPS URL 'blockExplorerUrl'.`,
      );
    }
  });

  it('should report invalid chainId', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainId: '10' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected 0x-prefixed, unpadded, non-zero hexadecimal string 'chainId'.`,
      );
    }
  });

  it('should report unsafe chainId', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainId: '0xFFFFFFFFFFFED' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        'numerical value greater than max safe value.',
      );
    }
  });

  it('should report chainId not matching rpcUrl returned chainId', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainId: '0x63' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain('does not match');
    }
  });

  it('should report invalid chain name', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, chainName: undefined }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(`Expected non-empty string 'chainName'.`);
    }
  });

  it('should report invalid native currency', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [{ ...correctParams, nativeCurrency: 'invalid' }],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected null or object 'nativeCurrency'.`,
      );
    }
  });

  it('should report invalid native currency decimals', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [
            {
              ...correctParams,
              nativeCurrency: { symbol: 'xDai', decimals: 10 },
            },
          ],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected the number 18 for 'nativeCurrency.decimals' when 'nativeCurrency' is provided.`,
      );
    }
  });

  it('should report missing native currency symbol', async () => {
    try {
      await wallet_addEthereumChain({
        req: {
          params: [
            {
              ...correctParams,
              nativeCurrency: { symbol: null, decimals: 18 },
            },
          ],
        },
        ...otherOptions,
      });
    } catch (error) {
      expect(error.message).toContain(
        `Expected a string 'nativeCurrency.symbol'.`,
      );
    }
  });
});
