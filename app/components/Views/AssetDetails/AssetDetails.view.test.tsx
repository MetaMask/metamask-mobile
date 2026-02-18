import '../../../util/test/component-view/mocks';
import { renderAssetDetailsView } from '../../../util/test/component-view/renderers/assetDetails';
import { describeForPlatforms } from '../../../util/test/platform';

// addresses Regression: #25100 – Token Details page shows wrong network

describeForPlatforms('AssetDetails', () => {
  it('displays network name from token chainId, not from selected network', () => {
    const polygonTokenAddress = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';

    const { getAllByText, queryByText } = renderAssetDetailsView({
      deterministicFiat: true,
      routeParams: {
        address: polygonTokenAddress,
        chainId: '0x89',
        asset: {
          address: polygonTokenAddress,
          symbol: 'WETH',
          decimals: 18,
          name: 'Wrapped Ether',
          image: '',
          isNative: false,
          isETH: false,
          aggregators: [],
        },
      },
    });

    // Network name should appear twice: header subtitle + "Network" section body
    const polygonTexts = getAllByText('Polygon');
    expect(polygonTexts.length).toBeGreaterThanOrEqual(2);

    // The globally selected network (Ethereum Main Network) should NOT appear
    expect(queryByText('Ethereum Main Network')).toBeNull();
  });
});
