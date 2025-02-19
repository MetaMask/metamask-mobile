import { useNftNames } from './useNftName';
import { useNftCollectionsMetadata } from './useNftCollectionsMetadata';
import { NameType } from '../../UI/Name/Name.types';

const CHAIN_ID_MOCK = '0x1';
const KNOWN_NFT_VALUE = '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NFT_NAME = 'Known NFT';
const KNOWN_NFT_IMAGE = 'https://example.com/nft-image.png';
const NFT_COLLECTIONS_MOCK = {
  [KNOWN_NFT_VALUE.toLowerCase()]: {
    name: KNOWN_NFT_NAME,
    image: KNOWN_NFT_IMAGE,
    isSpam: false,
  },
};

jest.mock('./useNftCollectionsMetadata', () => ({
  useNftCollectionsMetadata: jest.fn(),
}));

describe('useNftNames', () => {
  const useNftCollectionsMetadataMock = jest.mocked(useNftCollectionsMetadata);

  beforeAll(() => {
    useNftCollectionsMetadataMock.mockReturnValue({
      [CHAIN_ID_MOCK]: NFT_COLLECTIONS_MOCK,
    });
  });

  it('returns the correct NFT name and image when not spam', () => {
    const responses = useNftNames([
      {
        value: KNOWN_NFT_VALUE,
        type: NameType.EthereumAddress,
        variation: CHAIN_ID_MOCK,
      },
    ]);
    expect(responses[0]?.name).toEqual(KNOWN_NFT_NAME);
    expect(responses[0]?.image).toEqual(KNOWN_NFT_IMAGE);
  });

  it('returns undefined for name and image if NFT is spam', () => {
    useNftCollectionsMetadataMock.mockReturnValue({
      [CHAIN_ID_MOCK]: {
        [KNOWN_NFT_VALUE.toLowerCase()]: {
          name: KNOWN_NFT_NAME,
          image: KNOWN_NFT_IMAGE,
          isSpam: true,
        },
      },
    });
    const responses = useNftNames([
      {
        value: KNOWN_NFT_VALUE,
        type: NameType.EthereumAddress,
        variation: CHAIN_ID_MOCK,
      },
    ]);
    expect(responses[0]?.name).toBeUndefined();
    expect(responses[0]?.image).toBeUndefined();
  });

  it('returns undefined for name and image if no NFT matched', () => {
    useNftCollectionsMetadataMock.mockReturnValue({});
    const responses = useNftNames([
      {
        value: KNOWN_NFT_VALUE,
        type: NameType.EthereumAddress,
        variation: CHAIN_ID_MOCK,
      },
    ]);
    expect(responses[0]?.name).toBeUndefined();
    expect(responses[0]?.image).toBeUndefined();
  });
});
