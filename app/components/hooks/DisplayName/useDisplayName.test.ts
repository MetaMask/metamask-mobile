import useDisplayName, { DisplayNameVariant } from './useDisplayName';

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';

describe('useDisplayName', () => {
  it('should return checksummed address if address is unknown', () => {
    const displayName = useDisplayName(
      // Not checksummed:
      UNKNOWN_ADDRESS_CHECKSUMMED.toLowerCase(),
    );
    expect(displayName).toEqual({
      variant: DisplayNameVariant.Unknown,
      name: UNKNOWN_ADDRESS_CHECKSUMMED,
    });
  });
});
