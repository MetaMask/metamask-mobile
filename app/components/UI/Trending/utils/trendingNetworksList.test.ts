import { NetworkToCaipChainId } from '../../NetworkMultiSelector/NetworkMultiSelector.constants';
import { TRENDING_NETWORKS_LIST } from './trendingNetworksList';

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
