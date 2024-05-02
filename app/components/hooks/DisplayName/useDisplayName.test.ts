import { NameType } from '../../UI/Name/Name.types';
import useDisplayName, { DisplayNameVariant } from './useDisplayName';
import useWatchedNFTName from './useWatchedNFTName';

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';
const KNOWN_NFT_ADDRESS_CHECKSUMMED =
  '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NFT_NAME_MOCK = 'Known NFT';

jest.mock('./useWatchedNFTName', () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe('useDisplayName', () => {
  const mockUseWatchedNFTName = useWatchedNFTName as jest.MockedFunction<
    typeof useWatchedNFTName
  >;

  describe('unknown address', () => {
    it('should not return a name', () => {
      const displayName = useDisplayName(
        NameType.EthereumAddress,
        UNKNOWN_ADDRESS_CHECKSUMMED,
      );
      expect(displayName).toEqual({
        variant: DisplayNameVariant.Unknown,
      });
    });
  });

  describe('recognized address', () => {
    it('should return watched nft name', () => {
      mockUseWatchedNFTName.mockReturnValue(KNOWN_NFT_NAME_MOCK);

      const displayName = useDisplayName(
        NameType.EthereumAddress,
        KNOWN_NFT_ADDRESS_CHECKSUMMED,
      );

      expect(displayName).toEqual({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_NFT_NAME_MOCK,
      });
    });
  });
});
