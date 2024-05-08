import { NETWORKS_CHAIN_ID } from '../../../constants/network';
import { NameType } from '../../UI/Name/Name.types';
import useDisplayName, { DisplayNameVariant } from './useDisplayName';
import { useFirstPartyContractName } from './useFirstPartyContractName';
import { useTokenListName } from './useTokenListName';
import useWatchedNFTName from './useWatchedNFTName';

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';
const KNOWN_NFT_ADDRESS_CHECKSUMMED =
  '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NFT_NAME_MOCK = 'Known NFT';
const KNOWN_FIRST_PARTY_CONTRACT_NAME = 'MetaMask Pool Staking';
const KNOWN_TOKEN_LIST_NAME = 'Known Token List';

jest.mock('./useWatchedNFTName', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('./useFirstPartyContractName', () => ({
  useFirstPartyContractName: jest.fn(),
}));
jest.mock('./useTokenListName', () => ({
  useTokenListName: jest.fn(),
}));

describe('useDisplayName', () => {
  const mockUseWatchedNFTName = jest.mocked(useWatchedNFTName);
  const mockUseFirstPartyContractName = jest.mocked(useFirstPartyContractName);
  const mockUseTokenListName = jest.mocked(useTokenListName);

  beforeEach(() => {
    jest.resetAllMocks();
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
    it('returns first party contract name', () => {
      mockUseFirstPartyContractName.mockReturnValue(
        KNOWN_FIRST_PARTY_CONTRACT_NAME,
      );

      const displayName = useDisplayName(
        NameType.EthereumAddress,
        KNOWN_NFT_ADDRESS_CHECKSUMMED,
        NETWORKS_CHAIN_ID.MAINNET,
      );
      expect(displayName).toEqual({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_FIRST_PARTY_CONTRACT_NAME,
      });
    });

    it('returns watched nft name', () => {
      mockUseWatchedNFTName.mockReturnValue(KNOWN_NFT_NAME_MOCK);

      const displayName = useDisplayName(
        NameType.EthereumAddress,
        KNOWN_NFT_ADDRESS_CHECKSUMMED,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(mockUseFirstPartyContractName).toHaveBeenCalledWith(
        KNOWN_NFT_ADDRESS_CHECKSUMMED.toLowerCase(),
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(displayName).toEqual({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_NFT_NAME_MOCK,
      });
    });

    it('returns token list name', () => {
      mockUseTokenListName.mockReturnValue(KNOWN_TOKEN_LIST_NAME);

      const displayName = useDisplayName(
        NameType.EthereumAddress,
        KNOWN_NFT_ADDRESS_CHECKSUMMED,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(mockUseFirstPartyContractName).toHaveBeenCalledWith(
        KNOWN_NFT_ADDRESS_CHECKSUMMED.toLowerCase(),
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(displayName).toEqual({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_TOKEN_LIST_NAME,
      });
    });
  });
});
