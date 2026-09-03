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
    it('sets only the deleted chain when not in all-networks mode', () => {
      expect(
        getTokenNetworkFilterAfterNetworkDelete(false, sampleFilter, '0x64'),
      ).toEqual({
        '0x64': true,
      });
    });

    it('removes the deleted chain when all networks are enabled', () => {
      expect(
        getTokenNetworkFilterAfterNetworkDelete(true, sampleFilter, '0x64'),
      ).toEqual({
        '0x1': true,
        '0xa': true,
      });
    });
  });
});
