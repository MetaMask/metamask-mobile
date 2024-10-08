import wallet_switchEthereumChain from './wallet_switchEthereumChain';
import Engine from '../Engine';
import { NetworkController } from '@metamask/network-controller';
import { CaveatFactories, PermissionKeys } from '../Permissions/specifications';
import { CaveatTypes } from '../Permissions/constants';

// jest.mock('@metamask/network-controller');s
jest.mock('../Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
      getNetworkClientById: jest.fn(),
    },
    CurrencyRateController: {
      updateExchangeRate: jest.fn(),
    },
    PermissionController: {
      hasPermission: jest.fn().mockReturnValue(true),
      requestPermissionsIncremental: jest.fn(),
      getCaveat: jest.fn(),
    },
    SelectedNetworkController: {
      setNetworkClientIdForDomain: jest.fn(),
      getNetworkClientIdForDomain: jest.fn(),
    },
  },
}));

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(() => ({
      engine: {
        backgroundState: {
          NetworkController: {
            selectedNetworkClientId: 'mainnet',
            networksMetadata: {},
            networkConfigurations: {
              mainnet: {
                id: 'mainnet',
                rpcUrl: 'https://mainnet.infura.io/v3',
                chainId: '0x1',
                ticker: 'ETH',
                nickname: 'Sepolia network',
                rpcPrefs: {
                  blockExplorerUrl: 'https://etherscan.com',
                },
              },
              'test-network-configuration-id': {
                id: 'test-network-configuration-id',
                rpcUrl: 'https://gnosis-chain.infura.io/v3',
                chainId: '0x64',
                ticker: 'ETH',
                nickname: 'Gnosis Chain',
                rpcPrefs: {
                  blockExplorerUrl: 'https://gnosisscan.com',
                },
              },
            },
          },
        },
      },
    })),
  },
}));

const correctParams = {
  chainId: '0x1',
};

const otherOptions = {
  res: {},
  switchCustomNetworkRequest: {},
  requestUserApproval: jest.fn(),
};

describe('RPC Method - wallet_switchEthereumChain', () => {
  it('should report missing params', async () => {
    try {
      await wallet_switchEthereumChain({
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
      await wallet_switchEthereumChain({
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

  it('should report invalid chainId', async () => {
    try {
      await wallet_switchEthereumChain({
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
      await wallet_switchEthereumChain({
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

  describe('MM_CHAIN_PERMISSIONS is enabled', () => {
    beforeAll(() => {
      process.env.MM_CHAIN_PERMISSIONS = 1;
    });
    afterAll(() => {
      process.env.MM_CHAIN_PERMISSIONS = 0;
    });
    it('should not change network permissions and should switch without user approval when chain is already permitted', async () => {
      const spyOnRequestPermissionsIncremental = jest.spyOn(
        Engine.context.PermissionController,
        'requestPermissionsIncremental',
      );
      jest
        .spyOn(
          Engine.context.SelectedNetworkController,
          'getNetworkClientIdForDomain',
        )
        .mockReturnValue('mainnet');
      jest
        .spyOn(Engine.context.NetworkController, 'getNetworkClientById')
        .mockReturnValue({ configuration: { chainId: '0x1' } });
      jest
        .spyOn(Engine.context.PermissionController, 'getCaveat')
        .mockReturnValue({ value: ['0x64'] });

      const spyOnSetActiveNetwork = jest.spyOn(
        Engine.context.NetworkController,
        'setActiveNetwork',
      );
      await wallet_switchEthereumChain({
        req: {
          params: [{ chainId: '0x64' }],
        },
        ...otherOptions,
      });

      expect(spyOnRequestPermissionsIncremental).not.toHaveBeenCalled();

      expect(otherOptions.requestUserApproval).not.toHaveBeenCalled();
      expect(spyOnSetActiveNetwork).toHaveBeenCalledWith(
        'test-network-configuration-id',
      );
    });

    it('should add network permission and should switch with user approval when requested chain is not permitted', async () => {
      const spyOnRequestPermissionsIncremental = jest.spyOn(
        Engine.context.PermissionController,
        'requestPermissionsIncremental',
      );
      jest
        .spyOn(
          Engine.context.SelectedNetworkController,
          'getNetworkClientIdForDomain',
        )
        .mockReturnValue('mainnet');
      jest
        .spyOn(Engine.context.NetworkController, 'getNetworkClientById')
        .mockReturnValue({ configuration: { chainId: '0x1' } });
      const spyOnSetActiveNetwork = jest.spyOn(
        Engine.context.NetworkController,
        'setActiveNetwork',
      );
      jest
        .spyOn(Engine.context.PermissionController, 'getCaveat')
        .mockReturnValue({ value: [] });
      await wallet_switchEthereumChain({
        req: {
          params: [{ chainId: '0x64' }],
        },
        ...otherOptions,
      });

      // this request shows a permissions request to the user
      // which, if approved, adds an endowmnet:permittedChains permission
      expect(spyOnRequestPermissionsIncremental).toHaveBeenCalledTimes(1);
      expect(spyOnSetActiveNetwork).toHaveBeenCalledWith(
        'test-network-configuration-id',
      );
    });
  });
});
