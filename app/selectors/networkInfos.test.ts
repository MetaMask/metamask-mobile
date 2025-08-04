import { SolScope } from '@metamask/keyring-api';
import { NetworkConfiguration } from '@metamask/network-controller';
import { selectNetworkImageSourceByChainId } from './networkInfos';
import { RootState } from '../reducers';
import { getNetworkImageSource } from '../util/networks';
import { getNonEvmNetworkImageSourceByChainId } from '../util/networks/customNetworks';
import {
  selectProviderConfig,
  selectEvmNetworkConfigurationsByChainId,
} from './networkController';
import {
  selectIsEvmNetworkSelected,
  selectSelectedNonEvmNetworkChainId,
  selectSelectedNonEvmNetworkName,
} from './multichainNetworkController';

// Mock the utility functions
jest.mock('../util/networks', () => ({
  getNetworkNameFromProviderConfig: jest.fn(),
  getNetworkImageSource: jest.fn(),
}));

jest.mock('../util/networks/customNetworks', () => ({
  getNonEvmNetworkImageSourceByChainId: jest.fn(),
}));

// Mock the network selectors directly
jest.mock('./networkController', () => ({
  selectProviderConfig: jest.fn(),
  selectEvmNetworkConfigurationsByChainId: jest.fn(),
}));

jest.mock('./multichainNetworkController', () => ({
  selectIsEvmNetworkSelected: jest.fn(),
  selectSelectedNonEvmNetworkChainId: jest.fn(),
  selectSelectedNonEvmNetworkName: jest.fn(),
}));

describe('selectNetworkImageSourceByChainId', () => {
  const mockGetNetworkImageSource =
    getNetworkImageSource as jest.MockedFunction<typeof getNetworkImageSource>;
  const mockGetNonEvmNetworkImageSourceByChainId =
    getNonEvmNetworkImageSourceByChainId as jest.MockedFunction<
      typeof getNonEvmNetworkImageSourceByChainId
    >;
  const mockSelectEvmNetworkConfigurationsByChainId =
    selectEvmNetworkConfigurationsByChainId as jest.MockedFunction<
      typeof selectEvmNetworkConfigurationsByChainId
    >;
  const mockSelectIsEvmNetworkSelected =
    selectIsEvmNetworkSelected as jest.MockedFunction<
      typeof selectIsEvmNetworkSelected
    >;
  const mockSelectSelectedNonEvmNetworkChainId =
    selectSelectedNonEvmNetworkChainId as jest.MockedFunction<
      typeof selectSelectedNonEvmNetworkChainId
    >;
  const mockSelectProviderConfig = selectProviderConfig as jest.MockedFunction<
    typeof selectProviderConfig
  >;
  const mockSelectSelectedNonEvmNetworkName =
    selectSelectedNonEvmNetworkName as jest.MockedFunction<
      typeof selectSelectedNonEvmNetworkName
    >;

  // Mock state - simplified since we're mocking selectors directly
  let mockState: RootState;

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear reselect cache to prevent memoization issues between tests
    selectNetworkImageSourceByChainId.clearCache?.();
    // Create a unique state object for each test to avoid reselect memoization
    mockState = { test: Math.random() } as unknown as RootState;
  });

  describe('when EVM network is selected', () => {
    beforeEach(() => {
      // Set up mocks for EVM network selection
      mockSelectIsEvmNetworkSelected.mockReturnValue(true);
      mockSelectSelectedNonEvmNetworkChainId.mockReturnValue(SolScope.Mainnet);
      mockSelectProviderConfig.mockReturnValue({
        chainId: '0x1',
        ticker: 'ETH',
        rpcPrefs: { blockExplorerUrl: 'https://etherscan.io' },
        type: 'infura',
        id: 'infura-mainnet',
        nickname: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/{infuraProjectId}',
      });
      mockSelectSelectedNonEvmNetworkName.mockReturnValue('Solana Mainnet');
      mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue({
        '0x1': {
          chainId: '0x1',
          name: 'Ethereum Mainnet',
          nativeCurrency: 'ETH',
          defaultRpcEndpointIndex: 0,
          rpcEndpoints: [
            {
              networkClientId: 'infura-mainnet',
              type: 'infura',
              url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
            },
          ],
          blockExplorerUrls: ['https://etherscan.io'],
        } as NetworkConfiguration,
        '0x89': {
          chainId: '0x89',
          name: 'Polygon',
          nativeCurrency: 'MATIC',
          defaultRpcEndpointIndex: 0,
          rpcEndpoints: [
            {
              networkClientId: 'polygon-mainnet',
              type: 'custom',
              url: 'https://polygon-rpc.com',
            },
          ],
          blockExplorerUrls: ['https://polygonscan.com'],
        } as NetworkConfiguration,
      });
    });

    it('should return network image source for existing EVM chain ID', () => {
      const chainId = '0x1';
      const expectedImageSource = { uri: 'ethereum-logo' };

      mockGetNetworkImageSource.mockReturnValue(expectedImageSource);

      const result = selectNetworkImageSourceByChainId(mockState, chainId);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        networkType: 'infura',
        chainId,
      });
      expect(result).toBe(expectedImageSource);
    });

    it('should use custom network type for chain ID with custom RPC endpoint', () => {
      const chainId = '0x89';
      const expectedImageSource = { uri: 'polygon-logo' };

      mockGetNetworkImageSource.mockReturnValue(expectedImageSource);

      const result = selectNetworkImageSourceByChainId(mockState, chainId);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        networkType: 'custom',
        chainId,
      });
      expect(result).toBe(expectedImageSource);
    });

    it('should default to custom network type when network configuration is undefined', () => {
      const chainId = '0x999';
      const expectedImageSource = { uri: 'custom-logo' };

      mockGetNetworkImageSource.mockReturnValue(expectedImageSource);

      const result = selectNetworkImageSourceByChainId(mockState, chainId);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        networkType: 'custom',
        chainId,
      });
      expect(result).toBe(expectedImageSource);
    });
  });

  describe('when non-EVM network is selected', () => {
    beforeEach(() => {
      // Set up mocks specific to non-EVM tests
      mockSelectIsEvmNetworkSelected.mockReturnValue(false);
      mockSelectSelectedNonEvmNetworkChainId.mockReturnValue(SolScope.Mainnet);
      mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue({});
      mockSelectProviderConfig.mockReturnValue({
        chainId: '0x1',
        ticker: 'ETH',
        rpcPrefs: { blockExplorerUrl: 'https://etherscan.io' },
        type: 'infura',
        id: 'infura-mainnet',
        nickname: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/{infuraProjectId}',
      });
      mockSelectSelectedNonEvmNetworkName.mockReturnValue('Solana Mainnet');
    });

    it('should return non-EVM network image source', () => {
      const chainId = '0x1'; // This should be ignored when non-EVM is selected
      const expectedImageSource = { uri: 'solana-logo' };

      mockGetNonEvmNetworkImageSourceByChainId.mockReturnValue(
        expectedImageSource,
      );

      const result = selectNetworkImageSourceByChainId(mockState, chainId);

      expect(mockGetNonEvmNetworkImageSourceByChainId).toHaveBeenCalledWith(
        SolScope.Mainnet,
      );
      expect(mockGetNetworkImageSource).not.toHaveBeenCalled();
      expect(result).toBe(expectedImageSource);
    });
  });

  describe('edge cases with EVM networks', () => {
    beforeEach(() => {
      // Set up mocks for EVM network edge cases
      mockSelectIsEvmNetworkSelected.mockReturnValue(true);
      mockSelectSelectedNonEvmNetworkChainId.mockReturnValue(SolScope.Mainnet);
      mockSelectProviderConfig.mockReturnValue({
        chainId: '0x1',
        ticker: 'ETH',
        rpcPrefs: { blockExplorerUrl: 'https://etherscan.io' },
        type: 'infura',
        id: 'infura-mainnet',
        nickname: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/{infuraProjectId}',
      });
      mockSelectSelectedNonEvmNetworkName.mockReturnValue('Solana Mainnet');
    });

    it('should default to custom network type when network configuration has no RPC endpoints', () => {
      mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue({
        '0xabc': {
          chainId: '0xabc',
          name: 'Unknown Network',
          nativeCurrency: 'UNK',
          defaultRpcEndpointIndex: 0,
          rpcEndpoints: [],
          blockExplorerUrls: [],
        } as NetworkConfiguration,
      });

      const chainId = '0xabc';
      const expectedImageSource = { uri: 'custom-logo' };

      mockGetNetworkImageSource.mockReturnValue(expectedImageSource);

      const result = selectNetworkImageSourceByChainId(mockState, chainId);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        networkType: 'custom',
        chainId,
      });
      expect(result).toBe(expectedImageSource);
    });

    it('should handle network configuration with empty rpcEndpoints', () => {
      mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue({
        '0xdef': {
          chainId: '0xdef',
          name: 'Null RPC Network',
          nativeCurrency: 'NULL',
          defaultRpcEndpointIndex: 0,
          rpcEndpoints: [],
          blockExplorerUrls: [],
        } as NetworkConfiguration,
      });

      const chainId = '0xdef';
      const expectedImageSource = { uri: 'custom-logo' };

      mockGetNetworkImageSource.mockReturnValue(expectedImageSource);

      const result = selectNetworkImageSourceByChainId(mockState, chainId);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        networkType: 'custom',
        chainId,
      });
      expect(result).toBe(expectedImageSource);
    });

    it('should handle empty chain ID parameter', () => {
      mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue({});

      const chainId = '';
      const expectedImageSource = { uri: 'default-logo' };

      mockGetNetworkImageSource.mockReturnValue(expectedImageSource);

      const result = selectNetworkImageSourceByChainId(mockState, chainId);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        networkType: 'custom',
        chainId: '',
      });
      expect(result).toBe(expectedImageSource);
    });

    it('should handle malformed chain ID parameter', () => {
      mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue({});

      const chainId = 'invalid-chain-id';
      const expectedImageSource = { uri: 'default-logo' };

      mockGetNetworkImageSource.mockReturnValue(expectedImageSource);

      const result = selectNetworkImageSourceByChainId(mockState, chainId);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        networkType: 'custom',
        chainId: 'invalid-chain-id',
      });
      expect(result).toBe(expectedImageSource);
    });

    it('should handle state where networkConfigurationsByChainId is empty object', () => {
      mockSelectEvmNetworkConfigurationsByChainId.mockReturnValue({});

      const chainId = '0x1';
      const expectedImageSource = { uri: 'default-logo' };

      mockGetNetworkImageSource.mockReturnValue(expectedImageSource);

      const result = selectNetworkImageSourceByChainId(mockState, chainId);

      expect(mockGetNetworkImageSource).toHaveBeenCalledWith({
        networkType: 'custom',
        chainId,
      });
      expect(result).toBe(expectedImageSource);
    });
  });
});
