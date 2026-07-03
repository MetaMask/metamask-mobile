import { omitChainFromTokenNetworkFilter } from './omitChainFromTokenNetworkFilter';

describe('omitChainFromTokenNetworkFilter', () => {
  it('removes the specified chain id from the filter', () => {
    const filter = {
      '0x1': true,
      '0x64': true,
      '0xa': true,
    };

    expect(omitChainFromTokenNetworkFilter(filter, '0x64')).toEqual({
      '0x1': true,
      '0xa': true,
    });
  });

  it('returns an empty object when removing the only chain', () => {
    expect(omitChainFromTokenNetworkFilter({ '0x1': true }, '0x1')).toEqual({});
  });

  it('returns a copy unchanged when chain id is not present', () => {
    const filter = { '0x1': true, '0xa': true };

    expect(omitChainFromTokenNetworkFilter(filter, '0x64')).toEqual(filter);
  });
});
