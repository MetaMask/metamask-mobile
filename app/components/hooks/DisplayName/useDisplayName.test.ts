import { NameType } from '../../UI/Name/Name.types';
import useDisplayName, { DisplayNameVariant } from './useDisplayName';
import { useFirstPartyContractNames } from './useFirstPartyContractNames';
import { useERC20Tokens } from './useERC20Tokens';
import { useWatchedNFTNames } from './useWatchedNFTNames';
import { useNftNames } from './useNftName';
import { CHAIN_IDS } from '@metamask/transaction-controller';

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';
const KNOWN_NFT_ADDRESS_CHECKSUMMED =
  '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NFT_NAME_MOCK = 'Known NFT';
const KNOWN_FIRST_PARTY_CONTRACT_NAME = 'MetaMask Pool Staking';
const KNOWN_TOKEN_LIST_NAME = 'Known Token List';

jest.mock('./useWatchedNFTNames', () => ({
  useWatchedNFTNames: jest.fn(),
}));

jest.mock('./useFirstPartyContractNames', () => ({
  useFirstPartyContractNames: jest.fn(),
}));

jest.mock('./useERC20Tokens', () => ({
  useERC20Tokens: jest.fn(),
}));
jest.mock('./useNftName', () => ({
  useNftNames: jest.fn(),
}));

describe('useDisplayName', () => {
  const mockUseWatchedNFTNames = jest.mocked(useWatchedNFTNames);
  const mockUseFirstPartyContractNames = jest.mocked(
    useFirstPartyContractNames,
  );
  const mockUseERC20Tokens = jest.mocked(useERC20Tokens);
  const mockUseNFTNames = jest.mocked(useNftNames);

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseWatchedNFTNames.mockReturnValue([]);
    mockUseFirstPartyContractNames.mockReturnValue([]);
    mockUseERC20Tokens.mockReturnValue([]);
    mockUseNFTNames.mockReturnValue([]);
  });

  describe('unknown address', () => {
    it('should not return a name', () => {
      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: UNKNOWN_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual({
        variant: DisplayNameVariant.Unknown,
      });
    });
  });

  describe('recognized address', () => {
    it('returns first party contract name', () => {
      mockUseFirstPartyContractNames.mockReturnValue([
        KNOWN_FIRST_PARTY_CONTRACT_NAME,
      ]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_FIRST_PARTY_CONTRACT_NAME,
      });
    });

    it('returns watched NFT name', () => {
      mockUseWatchedNFTNames.mockReturnValue([KNOWN_NFT_NAME_MOCK]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(mockUseFirstPartyContractNames).toHaveBeenCalledWith([
        {
          value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
          variation: CHAIN_IDS.MAINNET,
          type: NameType.EthereumAddress,
          preferContractSymbol: undefined,
        },
      ]);

      expect(displayName).toEqual({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_NFT_NAME_MOCK,
      });
    });

    it('returns ERC20 token name', () => {
      mockUseERC20Tokens.mockReturnValue([
        { name: KNOWN_TOKEN_LIST_NAME, image: '' },
      ]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(mockUseFirstPartyContractNames).toHaveBeenCalledWith([
        {
          value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
          variation: CHAIN_IDS.MAINNET,
          type: NameType.EthereumAddress,
          preferContractSymbol: undefined,
        },
      ]);

      expect(displayName).toEqual(
        expect.objectContaining({
          variant: DisplayNameVariant.Recognized,
          name: KNOWN_TOKEN_LIST_NAME,
        }),
      );
    });
  });
});
