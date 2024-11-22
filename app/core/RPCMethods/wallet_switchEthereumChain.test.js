import wallet_switchEthereumChain from './wallet_switchEthereumChain';
import Engine from '../Engine';
import { mockNetworkState } from '../../util/test/network';

const existingNetworkConfiguration = {
  id: 'test-network-configuration-id',
  chainId: '0x64',
  rpcUrl: 'https://rpc.test-chain.com',
  ticker: 'ETH',
  nickname: 'Gnosis Chain',
  rpcPrefs: {
    blockExplorerUrl: 'https://explorer.test-chain.com',
  },
};
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
      grantPermissionsIncremental: jest.fn(),
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
            ...mockNetworkState(
              {
                chainId: '0x1',
                id: 'Mainnet',
                nickname: 'Mainnet',
                ticker: 'ETH',
              },
              {
                ...existingNetworkConfiguration,
              },
            ),
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
  afterEach(() => {
    jest.clearAllMocks();
  });

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

  it('should should show a modal for user approval and not grant permissions', async () => {
    const spyOnGrantPermissionsIncremental = jest.spyOn(
      Engine.context.PermissionController,
      'grantPermissionsIncremental',
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
    await wallet_switchEthereumChain({
      req: {
        params: [{ chainId: '0x64' }],
      },
      ...otherOptions,
    });
    expect(otherOptions.requestUserApproval).toHaveBeenCalled();
    expect(spyOnGrantPermissionsIncremental).not.toHaveBeenCalled();
    expect(spyOnSetActiveNetwork).toHaveBeenCalledWith(
      'test-network-configuration-id',
    );
  });

  describe('MM_CHAIN_PERMISSIONS is enabled', () => {
    beforeAll(() => {
      process.env.MM_CHAIN_PERMISSIONS = 'true';
    });
    afterAll(() => {
      process.env.MM_CHAIN_PERMISSIONS = 'false';
    });
    it('should not change network permissions and should switch without user approval when chain is already permitted', async () => {
      const spyOnGrantPermissionsIncremental = jest.spyOn(
        Engine.context.PermissionController,
        'grantPermissionsIncremental',
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

      expect(otherOptions.requestUserApproval).not.toHaveBeenCalled();
      expect(spyOnGrantPermissionsIncremental).not.toHaveBeenCalled();
      expect(spyOnSetActiveNetwork).toHaveBeenCalledWith(
        'test-network-configuration-id',
      );
    });

    it('should add network permission and should switch with user approval when requested chain is not permitted', async () => {
      const spyOnGrantPermissionsIncremental = jest.spyOn(
        Engine.context.PermissionController,
        'grantPermissionsIncremental',
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
          origin: 'https://test.com',
        },
        ...otherOptions,
      });
      expect(otherOptions.requestUserApproval).toHaveBeenCalled();
      expect(spyOnGrantPermissionsIncremental).toHaveBeenCalledTimes(1);
      expect(spyOnGrantPermissionsIncremental).toHaveBeenCalledWith({
        approvedPermissions: {
          'endowment:permitted-chains': {
            caveats: [
              {
                type: 'restrictNetworkSwitching',
                value: ['0x64'],
              },
            ],
          },
        },
        subject: {
          origin: 'https://test.com',
        },
      });
      expect(spyOnSetActiveNetwork).toHaveBeenCalledWith(
        'test-network-configuration-id',
      );
    });
  });
});
