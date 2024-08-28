import wallet_switchEthereumChain, { NetworkConfiguration, DefaultNetwork } from './wallet_switchEthereumChain';
import Engine from '../Engine';
import { providerErrors, rpcErrors } from '@metamask/rpc-errors';
import * as networkUtils from '../../util/networks';
import { MetaMetricsEvents, MetaMetrics } from '../../core/Analytics';
import * as networkSelectors from '../../selectors/networkController';
import { store } from '../../store';
import { NetworksTicker, NetworkType } from '@metamask/controller-utils';

jest.mock('../Engine', () => ({
  default: {
    context: {
      CurrencyRateController: {
        updateExchangeRate: jest.fn(),
      },
      NetworkController: {
        setActiveNetwork: jest.fn(),
        setProviderType: jest.fn(),
        upsertNetworkConfiguration: jest.fn(),
      },
    },
  },
}));

jest.mock('../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

jest.mock('../../core/Analytics', () => ({
  MetaMetrics: {
    getInstance: jest.fn(() => ({
      trackEvent: jest.fn(),
    })),
  },
  MetaMetricsEvents: {
    NETWORK_SWITCHED: 'NETWORK_SWITCHED',
  },
}));

describe('wallet_switchEthereumChain', () => {
  const mockRequestUserApproval = jest.fn();
  const mockAnalytics = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw an error for invalid params', async () => {
    const req = { params: [{ chainId: '0x1', invalidKey: 'value' }] };
    const res = { result: null };

    await expect(
      wallet_switchEthereumChain({
        req,
        res,
        requestUserApproval: mockRequestUserApproval,
        analytics: mockAnalytics,
      })
    ).rejects.toThrow('Received unexpected keys on object parameter');
  });

  it('should throw an error for invalid chainId format', async () => {
    const req = { params: [{ chainId: 'invalid' }] };
    const res = { result: null };

    await expect(
      wallet_switchEthereumChain({
        req,
        res,
        requestUserApproval: mockRequestUserApproval,
        analytics: mockAnalytics,
      })
    ).rejects.toThrow('Expected 0x-prefixed, unpadded, non-zero hexadecimal string');
  });

  it('should switch to an existing network configuration', async () => {
    const req = { params: [{ chainId: '0x1' }] };
    const res = { result: null };

    jest.spyOn(networkSelectors, 'selectNetworkConfigurations').mockReturnValue({
      testNet: { id: 'testNet', chainId: '0x1', nickname: 'Test Net', ticker: 'TEST', rpcUrl: 'https://test.net' } as NetworkConfiguration & { id: string },
    });
    jest.spyOn(networkSelectors, 'selectChainId').mockReturnValue('0x2');

    await wallet_switchEthereumChain({
      req,
      res,
      requestUserApproval: mockRequestUserApproval,
      analytics: mockAnalytics,
    });

    expect(mockRequestUserApproval).toHaveBeenCalledWith({
      type: 'SWITCH_ETHEREUM_CHAIN',
      requestData: expect.objectContaining({
        chainId: '0x1',
        chainName: 'Test Net',
        ticker: 'TEST',
        type: 'switch',
      }),
    });
    expect(Engine.default.context.CurrencyRateController.updateExchangeRate).toHaveBeenCalledWith('TEST');
    expect(Engine.default.context.NetworkController.setActiveNetwork).toHaveBeenCalledWith('testNet');
    expect(res.result).toBeNull();
  });

  it('should switch to a default network', async () => {
    const req = { params: [{ chainId: '0x1' }] };
    const res = { result: null };

    jest.spyOn(networkSelectors, 'selectNetworkConfigurations').mockReturnValue({});
    jest.spyOn(networkSelectors, 'selectChainId').mockReturnValue('0x2');
    jest.spyOn(networkUtils, 'getDefaultNetworkByChainId').mockReturnValue({
      color: '#000000',
      shortName: 'Mainnet',
      networkType: NetworkType.mainnet,
    } as DefaultNetwork);

    await wallet_switchEthereumChain({
      req,
      res,
      requestUserApproval: mockRequestUserApproval,
      analytics: mockAnalytics,
    });

    expect(mockRequestUserApproval).toHaveBeenCalledWith({
      type: 'SWITCH_ETHEREUM_CHAIN',
      requestData: expect.objectContaining({
        chainId: '0x1',
        chainName: 'Mainnet',
        ticker: 'ETH',
        type: 'switch',
      }),
    });
    expect(Engine.default.context.CurrencyRateController.updateExchangeRate).toHaveBeenCalledWith(NetworksTicker.mainnet);
    expect(Engine.default.context.NetworkController.setProviderType).toHaveBeenCalledWith(NetworkType.mainnet);
    expect(res.result).toBeNull();
  });

  it('should throw an error for unrecognized chain ID', async () => {
    const req = { params: [{ chainId: '0x999' }] };
    const res = { result: null };

    jest.spyOn(networkSelectors, 'selectNetworkConfigurations').mockReturnValue({});
    jest.spyOn(networkUtils, 'getDefaultNetworkByChainId').mockReturnValue(undefined);

    await expect(
      wallet_switchEthereumChain({
        req,
        res,
        requestUserApproval: mockRequestUserApproval,
        analytics: mockAnalytics,
      })
    ).rejects.toThrow('Unrecognized chain ID "0x999"');
  });
});
