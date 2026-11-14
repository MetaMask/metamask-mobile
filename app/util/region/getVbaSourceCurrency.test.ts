import { UNKNOWN_LOCATION } from '@metamask/geolocation-controller';
import { getVbaMarketForCountry, type VbaMarket } from './getVbaSourceCurrency';

const brl: VbaMarket = { currency: 'BRL', regions: ['BR'] };
const usd: VbaMarket = { currency: 'USD', regions: ['US'] };
const eur: VbaMarket = { currency: 'EUR', regions: ['DE'] };

describe('getVbaMarketForCountry', () => {
  it('returns the open market listing the country of the location', () => {
    expect(getVbaMarketForCountry([brl, usd, eur], ' br-sp ')).toBe(brl);
    expect(getVbaMarketForCountry([brl, usd, eur], 'US-CA')).toBe(usd);
    expect(getVbaMarketForCountry([brl, usd, eur], 'DE-BE')).toBe(eur);
  });

  it('returns the BRL market, not USD, when both markets list the same country', () => {
    const sharedCountry = 'BR';
    const brlSharedCountry: VbaMarket = {
      currency: 'BRL',
      regions: [sharedCountry],
    };
    const usdSharedCountry: VbaMarket = {
      currency: 'USD',
      regions: [sharedCountry],
    };

    expect(
      getVbaMarketForCountry(
        [brlSharedCountry, usdSharedCountry],
        sharedCountry,
      ),
    ).toBe(brlSharedCountry);
  });

  it('returns whichever shared-country market is first in the array, not BRL specifically: this function has no currency priority of its own', () => {
    // NOTE: `getVbaMarketForCountry` is a plain `Array.prototype.find`, so it
    // has no BRL-priority logic. The "BRL first" guarantee documented on
    // `selectNeobankMarkets` ("@returns The open markets, BRL first.") is
    // produced entirely by that selector's fixed [BRL, USD] construction
    // order (see selectors/featureFlagController/moneyAccount/index.test.ts),
    // not by this function. Feeding it USD before BRL, as this test does,
    // returns the USD market for a country both list; that input ordering
    // never happens in the app because `selectNeobankMarkets` is the only
    // real caller and always returns BRL first.
    const sharedCountry = 'BR';
    const brlSharedCountry: VbaMarket = {
      currency: 'BRL',
      regions: [sharedCountry],
    };
    const usdSharedCountry: VbaMarket = {
      currency: 'USD',
      regions: [sharedCountry],
    };

    expect(
      getVbaMarketForCountry(
        [usdSharedCountry, brlSharedCountry],
        sharedCountry,
      ),
    ).toBe(usdSharedCountry);
  });

  it.each([['JP'], [UNKNOWN_LOCATION], [''], [undefined], [null]])(
    'returns undefined for %s',
    (location) => {
      expect(getVbaMarketForCountry([brl, usd, eur], location)).toBeUndefined();
    },
  );

  it('returns undefined when no market is open', () => {
    expect(getVbaMarketForCountry([], 'BR')).toBeUndefined();
  });
});
