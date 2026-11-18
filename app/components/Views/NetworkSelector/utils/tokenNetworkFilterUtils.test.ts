import { getTokenNetworkFilterAfterNetworkDelete } from './getTokenNetworkFilterAfterNetworkDelete';
import { omitChainFromTokenNetworkFilter } from './omitChainFromTokenNetworkFilter';

const sampleFilter = {
  '0x1': true,
  '0x64': true,
  '0xa': true,
};

describe('tokenNetworkFilterUtils', () => {
  describe('omitChainFromTokenNetworkFilter', () => {
    it('removes the specified chain id from the filter', () => {
      expect(omitChainFromTokenNetworkFilter(sampleFilter, '0x64')).toEqual({
        '0x1': true,
        '0xa': true,
      });
    });

    it('returns an empty object when removing the only chain', () => {
      expect(omitChainFromTokenNetworkFilter({ '0x1': true }, '0x1')).toEqual(
        {},
      );
    });

    it('returns a copy unchanged when chain id is not present', () => {
      const filter = { '0x1': true, '0xa': true };

      expect(omitChainFromTokenNetworkFilter(filter, '0x64')).toEqual(filter);
    });
  });

  describe('getTokenNetworkFilterAfterNetworkDelete', () => {
    it('removes the deleted chain from a single-network filter', () => {
      const filter = { '0x64': true };

      expect(getTokenNetworkFilterAfterNetworkDelete(filter, '0x64')).toEqual(
        {},
      );
    });

    it('removes the deleted chain from a multi-network filter', () => {
      expect(
        getTokenNetworkFilterAfterNetworkDelete(sampleFilter, '0x64'),
      ).toEqual({
        '0x1': true,
        '0xa': true,
      });
    });
  });
});
