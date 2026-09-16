import { NetworkToCaipChainId } from '../../NetworkMultiSelector/NetworkMultiSelector.constants';
import {
  RWA_CHAIN_IDS,
  RWA_NETWORKS_LIST,
  TRENDING_NETWORKS_LIST,
} from './trendingNetworksList';

jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(({ chainId }) => ({
    uri: `mock-network-image-${chainId}`,
  })),
}));

describe('TRENDING_NETWORKS_LIST', () => {
  it('includes Monad as a supported network', () => {
    expect(TRENDING_NETWORKS_LIST).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: NetworkToCaipChainId.MONAD,
          caipChainId: NetworkToCaipChainId.MONAD,
        }),
      ]),
    );
  });
});

describe('RWA networks', () => {
  // Robinhood Chain is disabled pending release approval (PR #35854);
  // re-enable the commented entries when it is turned back on.
  it('supports Ethereum and BNB Chain', () => {
    expect(RWA_CHAIN_IDS).toEqual([
      NetworkToCaipChainId.ETHEREUM,
      NetworkToCaipChainId.BNB,
      // NetworkToCaipChainId.ROBINHOOD,
    ]);
    expect(RWA_NETWORKS_LIST.map((network) => network.name)).toEqual([
      'Ethereum',
      'BNB Chain',
      // 'Robinhood Chain',
    ]);
  });
});
