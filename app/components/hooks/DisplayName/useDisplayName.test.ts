import { NameType } from '../../UI/Name/Name.types';
import useDisplayName, { DisplayNameVariant } from './useDisplayName';
import { mapCollectibleContractsSelector } from '../../../reducers/collectibles';

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';
const KNOWN_NFT_ADDRESS_CHECKSUMMED =
  '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NFT_NAME_MOCK = 'Known NFT';
const COLLECTIBLES_MOCK = {
  [KNOWN_NFT_ADDRESS_CHECKSUMMED.toLowerCase()]: {
    name: KNOWN_NFT_NAME_MOCK,
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockImplementation((callback) => callback()),
}));

jest.mock('../../../reducers/collectibles', () => ({
  mapCollectibleContractsSelector: jest.fn(),
}));

describe('useDisplayName', () => {
  beforeAll(() => {
    (
      mapCollectibleContractsSelector as jest.MockedFn<
        typeof mapCollectibleContractsSelector
      >
    ).mockReturnValue(COLLECTIBLES_MOCK);
  });

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
