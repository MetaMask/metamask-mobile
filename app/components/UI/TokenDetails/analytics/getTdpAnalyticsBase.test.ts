import { getTdpAnalyticsBase } from './getTdpAnalyticsBase';
import {
  TokenDetailsVariant,
  type TokenDetailsRouteParams,
} from '../constants/constants';

describe('getTdpAnalyticsBase', () => {
  const token = {
    chainId: '0x1',
    address: '0xabc',
    symbol: 'ABC',
  } as TokenDetailsRouteParams;

  it('returns v3 / variant category when a variant is provided (new page)', () => {
    const result = getTdpAnalyticsBase(token, TokenDetailsVariant.Memecoin);

    expect(result).toStrictEqual({
      tdp_version: 'v3',
      token_category: 'memecoin',
      chain_id: '0x1',
    });
  });

  it('returns v2 / standard when the variant is null (legacy page)', () => {
    const result = getTdpAnalyticsBase(token, null);

    expect(result).toStrictEqual({
      tdp_version: 'v2',
      token_category: 'standard',
      chain_id: '0x1',
    });
  });

  it('returns v2 / standard when the variant is omitted (legacy page)', () => {
    const result = getTdpAnalyticsBase(token);

    expect(result).toStrictEqual({
      tdp_version: 'v2',
      token_category: 'standard',
      chain_id: '0x1',
    });
  });
});
