import { getImportAssetKey } from './utils';

describe('getImportAssetKey', () => {
  it('gives the same key for hex and CAIP chain ids and ignores address case', () => {
    expect(getImportAssetKey('0x1', '0xABC')).toBe(
      getImportAssetKey('eip155:1', '0xabc'),
    );
  });

  it('gives different keys for the same address on different chains', () => {
    expect(getImportAssetKey('0x1', '0xabc')).not.toBe(
      getImportAssetKey('0x89', '0xabc'),
    );
  });
});
