import { RpcEndpointType } from '@metamask/network-controller';

import { createProviderConfig } from '../../../../selectors/networkController';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { mockNetworkState } from '../../../../util/test/network';
import useBlockExplorer from './useBlockExplorer';

const renderUseBlockExplorerHook = (overrides) => {
  // Prepare mock network state
  const networkConfigurations = mockNetworkState(overrides);
  const networkConfiguration =
    networkConfigurations.networkConfigurationsByChainId[overrides.chainId];
  const rpcEndpoint =
    networkConfiguration?.rpcEndpoints?.[
      networkConfiguration?.defaultRpcEndpointIndex
    ];
  const providerConfig = createProviderConfig(
    networkConfiguration,
    rpcEndpoint,
  );

  // Get the block explorer using the hook
  const { result } = renderHookWithProvider(() =>
    useBlockExplorer(
      networkConfigurations.networkConfigurationsByChainId,
      providerConfig,
    ),
  );
  return result.current;
};

describe('useBlockExplorer', () => {
  it('returns a correct explorer object for a custom network', () => {
    const explorer = renderUseBlockExplorerHook({
      chainId: '0xa4b1',
      id: 'arbitrum',
      nickname: 'Arbitrum Mainnet',
      ticker: 'ETH',
      blockExplorerUrl: 'https://arbitrumscan.io',
    });

    expect(explorer).toStrictEqual({
      name: 'Arbitrumscan',
      value: 'https://arbitrumscan.io',
      isValid: true,
      isRPC: true,
      baseUrl: 'https://arbitrumscan.io/',
      token: expect.any(Function),
      tx: expect.any(Function),
      account: expect.any(Function),
    });
    expect(explorer.token('0x123')).toStrictEqual(
      'https://arbitrumscan.io/token/0x123',
    );
    expect(explorer.tx('0x456')).toStrictEqual(
      'https://arbitrumscan.io/tx/0x456',
    );
    expect(explorer.account('0x789')).toStrictEqual(
      'https://arbitrumscan.io/address/0x789',
    );
  });

  it('returns a correct explorer object for build-in network', () => {
    const explorer = renderUseBlockExplorerHook({
      chainId: '0x1',
      id: 'mainnet',
      nickname: 'Ethereum Mainnet',
      ticker: 'ETH',
      blockExplorerUrl: 'https://etherscan.io',
      rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID',
      type: RpcEndpointType.Infura,
    });

    expect(explorer).toStrictEqual({
      name: 'Etherscan',
      value: 'https://etherscan.io',
      isValid: true,
      isRPC: false,
      baseUrl: 'https://etherscan.io/',
      token: expect.any(Function),
      tx: expect.any(Function),
      account: expect.any(Function),
    });
    expect(explorer.token('0x123')).toStrictEqual(
      'https://etherscan.io/token/0x123',
    );
    expect(explorer.tx('0x456')).toStrictEqual('https://etherscan.io/tx/0x456');
    expect(explorer.account('0x789')).toStrictEqual(
      'https://etherscan.io/address/0x789',
    );
  });
});
