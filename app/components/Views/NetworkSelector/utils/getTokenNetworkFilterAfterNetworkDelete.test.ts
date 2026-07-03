import { getTokenNetworkFilterAfterNetworkDelete } from './getTokenNetworkFilterAfterNetworkDelete';

describe('getTokenNetworkFilterAfterNetworkDelete', () => {
  const filter = {
    '0x1': true,
    '0x64': true,
    '0xa': true,
  };

  it('sets only the deleted chain when not in all-networks mode', () => {
    expect(
      getTokenNetworkFilterAfterNetworkDelete(false, filter, '0x64'),
    ).toEqual({
      '0x64': true,
    });
  });

  it('removes the deleted chain when all networks are enabled', () => {
    expect(
      getTokenNetworkFilterAfterNetworkDelete(true, filter, '0x64'),
    ).toEqual({
      '0x1': true,
      '0xa': true,
    });
  });
});
