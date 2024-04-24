import useDisplayName, { DisplayNameVariant } from './useDisplayName';

const UNKNOWN_ADDRESS = '0x299007b3f9e23b8d432d5f545f8a4a2b3e9a5b4e';

describe('useDisplayName', () => {
  it('should return unknown address', () => {
    const displayName = useDisplayName(UNKNOWN_ADDRESS);
    expect(displayName).toEqual({
      variant: DisplayNameVariant.UnknownAddress,
      name: UNKNOWN_ADDRESS,
    });
  });
});
