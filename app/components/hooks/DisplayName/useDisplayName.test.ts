import { NETWORKS_CHAIN_ID } from '../../../constants/network';
import { NameType } from '../../UI/Name/Name.types';
import useDisplayName, { DisplayNameVariant } from './useDisplayName';
import { useFirstPartyContractName } from './useFirstPartyContractName';

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';
const KNOWN_NFT_ADDRESS_CHECKSUMMED =
  '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_FIRST_PARTY_CONTRACT_NAME = 'MetaMask Pool Staking';

jest.mock('./useFirstPartyContractName', () => ({
  useFirstPartyContractName: jest.fn(),
}));

describe('useDisplayName', () => {
  const mockUseFirstPartyContractName =
    useFirstPartyContractName as jest.MockedFunction<
      typeof useFirstPartyContractName
    >;

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
    it('should return first party contract name', () => {
      mockUseFirstPartyContractName.mockReturnValue(
        KNOWN_FIRST_PARTY_CONTRACT_NAME,
      );

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
        name: KNOWN_FIRST_PARTY_CONTRACT_NAME,
      });
    });
  });
});
