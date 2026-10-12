import { NetworkToCaipChainId } from '../../NetworkMultiSelector/NetworkMultiSelector.constants';
import {
  getRwaChainIds,
  getRwaNetworksList,
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
  it('supports Ethereum and BNB Chain when Robinhood is hidden', () => {
    expect(RWA_CHAIN_IDS).toEqual([
      NetworkToCaipChainId.ETHEREUM,
      NetworkToCaipChainId.BNB,
    ]);
    expect(getRwaChainIds(false)).toEqual(RWA_CHAIN_IDS);
    expect(RWA_NETWORKS_LIST.map((network) => network.name)).toEqual([
      'Ethereum',
      'BNB Chain',
    ]);
  });

  it('adds Robinhood Chain when ASSETS4098ShowRobinhoodRwa is on', () => {
    expect(getRwaChainIds(true)).toEqual([
      NetworkToCaipChainId.ETHEREUM,
      NetworkToCaipChainId.BNB,
      NetworkToCaipChainId.ROBINHOOD,
    ]);
    expect(getRwaNetworksList(true).map((network) => network.name)).toEqual([
      'Ethereum',
      'BNB Chain',
      'Robinhood Chain',
    ]);
  });
});
