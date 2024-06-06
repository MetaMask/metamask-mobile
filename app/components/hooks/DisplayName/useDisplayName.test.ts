import type { TokenListToken } from '@metamask/assets-controllers';
import { NETWORKS_CHAIN_ID } from '../../../constants/network';
import { NameType } from '../../UI/Name/Name.types';
import useDisplayName, { DisplayNameVariant } from './useDisplayName';
import { useFirstPartyContractNames } from './useFirstPartyContractName';
import { useTokenListEntries } from './useTokenListEntry';
import { useWatchedNFTNames } from './useWatchedNFTName';

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';
const KNOWN_NFT_ADDRESS_CHECKSUMMED =
  '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NFT_NAME_MOCK = 'Known NFT';
const KNOWN_FIRST_PARTY_CONTRACT_NAME = 'MetaMask Pool Staking';
const KNOWN_TOKEN_LIST_NAME = 'Known Token List';
const KNOWN_TOKEN_LIST_SYMBOL = 'KTL';

jest.mock('./useWatchedNFTName', () => ({
  useWatchedNFTNames: jest.fn(),
}));
jest.mock('./useFirstPartyContractName', () => ({
  useFirstPartyContractNames: jest.fn(),
}));
jest.mock('./useTokenListEntry', () => ({
  useTokenListEntries: jest.fn(),
}));

describe('useDisplayName', () => {
  const mockUseWatchedNFTNames = jest.mocked(useWatchedNFTNames);
  const mockUseFirstPartyContractNames = jest.mocked(
    useFirstPartyContractNames,
  );
  const mockUseTokenListEntries = jest.mocked(useTokenListEntries);

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseWatchedNFTNames.mockReturnValue([]);
    mockUseFirstPartyContractNames.mockReturnValue([]);
    mockUseTokenListEntries.mockReturnValue([]);
  });

  describe('unknown address', () => {
    it('should not return a name', () => {
      const displayName = useDisplayName(
        NameType.EthereumAddress,
        UNKNOWN_ADDRESS_CHECKSUMMED,
      );
      expect(displayName).toEqual({
        variant: DisplayNameVariant.Unknown,
        name: null,
      });
    });
  });

  describe('recognized address', () => {
    it('returns first party contract name', () => {
      mockUseFirstPartyContractNames.mockReturnValue([
        KNOWN_FIRST_PARTY_CONTRACT_NAME,
      ]);

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
      mockUseWatchedNFTNames.mockReturnValue([KNOWN_NFT_NAME_MOCK]);

      const displayName = useDisplayName(
        NameType.EthereumAddress,
        KNOWN_NFT_ADDRESS_CHECKSUMMED,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(mockUseFirstPartyContractNames).toHaveBeenCalledWith([
        {
          value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
          chainId: NETWORKS_CHAIN_ID.MAINNET,
          type: NameType.EthereumAddress,
          preferContractSymbol: undefined,
        },
      ]);

      expect(displayName).toEqual({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_NFT_NAME_MOCK,
      });
    });

    it('returns token list name', () => {
      mockUseTokenListEntries.mockReturnValue([
        { name: KNOWN_TOKEN_LIST_NAME } as TokenListToken,
      ]);

      const displayName = useDisplayName(
        NameType.EthereumAddress,
        KNOWN_NFT_ADDRESS_CHECKSUMMED,
        NETWORKS_CHAIN_ID.MAINNET,
      );

      expect(mockUseFirstPartyContractNames).toHaveBeenCalledWith([
        {
          value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
          chainId: NETWORKS_CHAIN_ID.MAINNET,
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

    it('returns token symbol if preferContractSymbol set to true', () => {
      mockUseTokenListEntries.mockReturnValue([
        {
          name: KNOWN_TOKEN_LIST_NAME,
          symbol: KNOWN_TOKEN_LIST_SYMBOL,
        } as TokenListToken,
      ]);

      const displayName = useDisplayName(
        NameType.EthereumAddress,
        KNOWN_NFT_ADDRESS_CHECKSUMMED,
        NETWORKS_CHAIN_ID.MAINNET,
        true,
      );

      expect(mockUseFirstPartyContractNames).toHaveBeenCalledWith([
        {
          value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
          chainId: NETWORKS_CHAIN_ID.MAINNET,
          type: NameType.EthereumAddress,
          preferContractSymbol: true,
        },
      ]);

      expect(displayName).toEqual({
        variant: DisplayNameVariant.Recognized,
        name: KNOWN_TOKEN_LIST_SYMBOL,
        contractDisplayName: KNOWN_TOKEN_LIST_SYMBOL,
      });
    });
  });
});
