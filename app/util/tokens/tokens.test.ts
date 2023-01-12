import { tokenListToArray } from './';
import { TokenListToken } from '@metamask/assets-controllers';

const token: TokenListToken = {
  address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
  symbol: 'WBTC',
  decimals: 8,
  occurrences: 12,
  iconUrl: 'https://s3.amazonaws.com/airswap-token-images/WBTC.png',
  name: 'Wrapped Bitcoin',
};
const tokenListObject: { [address: string]: TokenListToken } = {
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': token,
};

describe('Token utils :: tokenListToArray', () => {
  it('should reduce object into array', () => {
    const tokenListArray = tokenListToArray(tokenListObject);
    expect(tokenListArray).toStrictEqual([token]);
  });
});
