import { createMockToken } from '../testUtils';
import { hasMissingAssetsPriceData } from './hasMissingAssetsPriceData';

const pricedToken = createMockToken({ symbol: 'ETH' });
const unpricedToken = createMockToken({ symbol: 'MUSD' });

const pricedPair = {
  sourceAmount: '1',
  sourceToken: pricedToken,
  destToken: pricedToken,
  sourceFiatRate: 1,
  destFiatRate: 1,
};

describe('hasMissingAssetsPriceData', () => {
  it('returns true when the destination token has no fiat rate', () => {
    const result = hasMissingAssetsPriceData({
      ...pricedPair,
      destToken: unpricedToken,
      destFiatRate: undefined,
    });

    expect(result).toBe(true);
  });

  it('returns true when the source token has no fiat rate', () => {
    const result = hasMissingAssetsPriceData({
      ...pricedPair,
      sourceToken: unpricedToken,
      sourceFiatRate: undefined,
    });

    expect(result).toBe(true);
  });

  it('returns false while no amount has been entered', () => {
    const result = hasMissingAssetsPriceData({
      ...pricedPair,
      sourceAmount: '0',
      destToken: unpricedToken,
      destFiatRate: undefined,
    });

    expect(result).toBe(false);
  });

  it('returns false when both tokens are priced', () => {
    const result = hasMissingAssetsPriceData(pricedPair);

    expect(result).toBe(false);
  });
});
