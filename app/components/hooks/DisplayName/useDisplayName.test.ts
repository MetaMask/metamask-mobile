import { CHAIN_IDS } from '@metamask/transaction-controller';

import { NameType } from '../../UI/Name/Name.types';
import useDisplayName, {
  DisplayNameVariant,
  TrustSignalDisplayState,
} from './useDisplayName';
import { useFirstPartyContractNames } from './useFirstPartyContractNames';
import { useERC20Tokens } from './useERC20Tokens';
import { useWatchedNFTNames } from './useWatchedNFTNames';
import { useAccountNames } from './useAccountNames';
import { useAccountWalletNames } from './useAccountWalletNames';
import { useSendFlowEnsResolutions } from '../../Views/confirmations/hooks/send/useSendFlowEnsResolutions';
import { useAddressTrustSignals } from '../../Views/confirmations/hooks/useAddressTrustSignals';

const UNKNOWN_ADDRESS_CHECKSUMMED =
  '0x299007B3F9E23B8d432D5f545F8a4a2B3E9A5B4e';
const KNOWN_NFT_ADDRESS_CHECKSUMMED =
  '0x495f947276749Ce646f68AC8c248420045cb7b5e';
const KNOWN_NFT_NAME_MOCK = 'Known NFT';
const KNOWN_FIRST_PARTY_CONTRACT_NAME = 'Pool Staking';
const KNOWN_TOKEN_LIST_NAME = 'Known Token List';
const KNOWN_ACCOUNT_NAME = 'Account 1';
const KNOWN_ACCOUNT_WALLET_NAME = 'Account Wallet 1';

jest.mock('./useWatchedNFTNames', () => ({
  useWatchedNFTNames: jest.fn(),
}));

jest.mock('./useFirstPartyContractNames', () => ({
  useFirstPartyContractNames: jest.fn(),
}));

jest.mock('./useERC20Tokens', () => ({
  useERC20Tokens: jest.fn(),
}));

jest.mock('./useAccountNames', () => ({
  useAccountNames: jest.fn(),
}));

jest.mock('./useAccountWalletNames', () => ({
  useAccountWalletNames: jest.fn(),
}));

jest.mock(
  '../../Views/confirmations/hooks/send/useSendFlowEnsResolutions',
  () => ({
    useSendFlowEnsResolutions: jest.fn(() => ({
      getResolvedENSName: jest.fn(),
    })),
  }),
);

jest.mock('../../Views/confirmations/hooks/useAddressTrustSignals', () => ({
  useAddressTrustSignals: jest.fn(),
}));

describe('useDisplayName', () => {
  const mockUseWatchedNFTNames = jest.mocked(useWatchedNFTNames);
  const mockUseFirstPartyContractNames = jest.mocked(
    useFirstPartyContractNames,
  );
  const mockUseERC20Tokens = jest.mocked(useERC20Tokens);
  const mockUseAccountNames = jest.mocked(useAccountNames);
  const mockUseAccountWalletNames = jest.mocked(useAccountWalletNames);
  const mockUseSendFlowEnsResolutions = jest.mocked(useSendFlowEnsResolutions);
  const mockUseAddressTrustSignals = jest.mocked(useAddressTrustSignals);
  const mockGetResolvedENSName = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
    mockUseWatchedNFTNames.mockReturnValue([]);
    mockUseFirstPartyContractNames.mockReturnValue([]);
    mockUseERC20Tokens.mockReturnValue([]);
    mockUseAccountNames.mockReturnValue([]);
    mockUseAccountWalletNames.mockReturnValue([]);
    mockUseSendFlowEnsResolutions.mockReturnValue({
      getResolvedENSName: mockGetResolvedENSName,
    } as unknown as ReturnType<typeof useSendFlowEnsResolutions>);
    mockUseAddressTrustSignals.mockReturnValue([
      { state: TrustSignalDisplayState.Unknown, label: null },
    ]);
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
        contractDisplayName: undefined,
        image: undefined,
        isFirstPartyContractName: false,
        name: undefined,
        displayState: TrustSignalDisplayState.Unknown,
        icon: null,
        isAccount: false,
        subtitle: undefined,
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
        contractDisplayName: undefined,
        image: undefined,
        isFirstPartyContractName: true,
        displayState: TrustSignalDisplayState.Recognized,
        icon: null,
        isAccount: false,
        subtitle: undefined,
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
        contractDisplayName: undefined,
        image: undefined,
        isFirstPartyContractName: false,
        displayState: TrustSignalDisplayState.Recognized,
        icon: null,
        isAccount: false,
        subtitle: undefined,
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

    it('returns internal account name', () => {
      mockUseAccountNames.mockReturnValue([KNOWN_ACCOUNT_NAME]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          variant: DisplayNameVariant.Saved,
          name: KNOWN_ACCOUNT_NAME,
        }),
      );
    });

    it('returns account wallet name', () => {
      mockUseAccountWalletNames.mockReturnValue([KNOWN_ACCOUNT_WALLET_NAME]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          subtitle: KNOWN_ACCOUNT_WALLET_NAME,
        }),
      );
    });

    it('returns ENS name', () => {
      mockUseSendFlowEnsResolutions.mockReturnValue({
        getResolvedENSName: jest.fn().mockReturnValue('ensname.eth'),
      } as unknown as ReturnType<typeof useSendFlowEnsResolutions>);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          name: 'ensname.eth',
        }),
      );
    });
  });

  describe('trust signal display state priority', () => {
    it('returns Malicious state when trust signal is malicious (highest priority)', () => {
      mockUseAddressTrustSignals.mockReturnValue([
        { state: TrustSignalDisplayState.Malicious, label: null },
      ]);
      mockUseAccountNames.mockReturnValue([KNOWN_ACCOUNT_NAME]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          displayState: TrustSignalDisplayState.Malicious,
          name: KNOWN_ACCOUNT_NAME,
        }),
      );
    });

    it('returns Petname state for saved account names', () => {
      mockUseAddressTrustSignals.mockReturnValue([
        { state: TrustSignalDisplayState.Verified, label: null },
      ]);
      mockUseAccountNames.mockReturnValue([KNOWN_ACCOUNT_NAME]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          displayState: TrustSignalDisplayState.Petname,
          name: KNOWN_ACCOUNT_NAME,
          isAccount: true,
        }),
      );
    });

    it('returns Warning state when trust signal is warning', () => {
      mockUseAddressTrustSignals.mockReturnValue([
        { state: TrustSignalDisplayState.Warning, label: null },
      ]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: UNKNOWN_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          displayState: TrustSignalDisplayState.Warning,
        }),
      );
    });

    it('returns Recognized state when address has a known name', () => {
      mockUseAddressTrustSignals.mockReturnValue([
        { state: TrustSignalDisplayState.Unknown, label: null },
      ]);
      mockUseFirstPartyContractNames.mockReturnValue([
        KNOWN_FIRST_PARTY_CONTRACT_NAME,
      ]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          displayState: TrustSignalDisplayState.Recognized,
          name: KNOWN_FIRST_PARTY_CONTRACT_NAME,
        }),
      );
    });

    it('returns Verified state when trust signal is verified and no name exists', () => {
      mockUseAddressTrustSignals.mockReturnValue([
        { state: TrustSignalDisplayState.Verified, label: 'Verified Label' },
      ]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: UNKNOWN_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          displayState: TrustSignalDisplayState.Verified,
          name: 'Verified Label',
        }),
      );
    });

    it('returns Unknown state when no trust signals or names exist', () => {
      mockUseAddressTrustSignals.mockReturnValue([
        { state: TrustSignalDisplayState.Unknown, label: null },
      ]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: UNKNOWN_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          displayState: TrustSignalDisplayState.Unknown,
          name: undefined,
        }),
      );
    });

    it('uses trust signal label as name when no other name exists', () => {
      mockUseAddressTrustSignals.mockReturnValue([
        { state: TrustSignalDisplayState.Unknown, label: 'Scan Label' },
      ]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: UNKNOWN_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          name: 'Scan Label',
        }),
      );
    });

    it('prefers existing name over trust signal label', () => {
      mockUseAddressTrustSignals.mockReturnValue([
        { state: TrustSignalDisplayState.Verified, label: 'Scan Label' },
      ]);
      mockUseFirstPartyContractNames.mockReturnValue([
        KNOWN_FIRST_PARTY_CONTRACT_NAME,
      ]);

      const displayName = useDisplayName({
        type: NameType.EthereumAddress,
        value: KNOWN_NFT_ADDRESS_CHECKSUMMED,
        variation: CHAIN_IDS.MAINNET,
      });

      expect(displayName).toEqual(
        expect.objectContaining({
          name: KNOWN_FIRST_PARTY_CONTRACT_NAME,
          displayState: TrustSignalDisplayState.Recognized,
        }),
      );
    });
  });
});
