import {
  EthAccountType,
  BtcAccountType,
  EthMethod,
  BtcMethod,
  EthScope,
  BtcScope,
  SolScope,
  SolAccountType,
  SolMethod,
  CaipChainId,
} from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  isEthAccount,
  isBtcAccount,
  isBtcMainnetAddress,
  isBtcTestnetAddress,
  getFormattedAddressFromInternalAccount,
  isSolanaAccount,
  isNonEvmAddress,
  lastSelectedAccountAddressInEvmNetwork,
  lastSelectedAccountAddressByNonEvmNetworkChainId,
  shortenTransactionId,
  getAddressUrl,
  getTransactionUrl,
  isTronAddress,
} from '../utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import Engine from '../../Engine';
import { MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP } from '../constants';
import { formatAddress } from '../../../util/address';
import {
  formatBlockExplorerAddressUrl,
  formatBlockExplorerTransactionUrl,
} from '../networks';

// Mock these functions
jest.mock('../../../util/address', () => ({
  formatAddress: jest.fn(),
  isEthAddress: jest.requireActual('../../../util/address').isEthAddress,
}));

jest.mock('../networks', () => ({
  formatBlockExplorerAddressUrl: jest.fn(),
  formatBlockExplorerTransactionUrl: jest.fn(),
}));

// P2WPKH
const MOCK_BTC_MAINNET_ADDRESS = 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k';
// P2PKH
const MOCK_BTC_MAINNET_ADDRESS_2 = '1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ';
// P2WPKH
const MOCK_BTC_TESTNET_ADDRESS = 'tb1q63st8zfndjh00gf9hmhsdg7l8umuxudrj4lucp';
const MOCK_BTC_REGTEST_ADDRESS = 'bcrt1qs758ursh4q9z627kt3pp5yysm78ddny6txaqgw';
const MOCK_ETH_ADDRESS = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const MOCK_ETH_ADDRESS_2 = '0x742d35Cc6634C0532925a3b8D1f9C0D5c5b8c5F5';

const SOL_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
const SOL_ADDRESS_2 = 'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy';

const MOCK_TRON_ADDRESS = 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7';
const MOCK_TRON_ADDRESS_2 = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const mockEthEOAAccount: InternalAccount = {
  address: MOCK_ETH_ADDRESS,
  id: '1',
  scopes: [EthScope.Eoa],
  metadata: {
    name: 'Eth Account 1',
    importTime: 1684232000456,
    keyring: {
      type: KeyringTypes.hd,
    },
  },
  options: {},
  methods: [
    EthMethod.PersonalSign,
    EthMethod.SignTransaction,
    EthMethod.SignTypedDataV1,
    EthMethod.SignTypedDataV3,
    EthMethod.SignTypedDataV4,
  ],
  type: EthAccountType.Eoa,
};

const mockEthERC4337Account: InternalAccount = {
  address: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
  id: '1',
  scopes: [EthScope.Eoa],
  metadata: {
    name: 'Eth Account ERC4337 1',
    importTime: 1684232000456,
    keyring: {
      type: KeyringTypes.hd,
    },
  },
  options: {},
  methods: [
    EthMethod.PersonalSign,
    EthMethod.SignTransaction,
    EthMethod.SignTypedDataV1,
    EthMethod.SignTypedDataV3,
    EthMethod.SignTypedDataV4,
  ],
  type: EthAccountType.Erc4337,
};

const mockBTCAccount: InternalAccount = {
  address: MOCK_BTC_MAINNET_ADDRESS,
  id: '1',
  scopes: [BtcScope.Mainnet],
  metadata: {
    name: 'Bitcoin Account',
    importTime: 1684232000456,
    keyring: {
      type: KeyringTypes.snap,
    },
    snap: {
      id: 'npm:"@metamask/bitcoin-wallet-snap',
      name: 'Bitcoin Wallet Snap',
      enabled: true,
    },
  },
  options: {},
  methods: Object.values(BtcMethod),
  type: BtcAccountType.P2wpkh,
};

const mockSolAccount: InternalAccount = {
  address: SOL_ADDRESS,
  id: '1',
  type: SolAccountType.DataAccount,
  methods: [SolMethod.SendAndConfirmTransaction],
  options: {},
  metadata: {
    name: 'Solana Account',
    importTime: 1684232000456,
    keyring: {
      type: KeyringTypes.snap,
    },
    snap: {
      id: 'npm:"@metamask/solana-wallet-snap',
      name: 'Solana Wallet Snap',
      enabled: true,
    },
  },
  scopes: [SolScope.Mainnet, SolScope.Testnet, SolScope.Devnet],
};

// Add this at the top of the file with other imports
jest.mock('../../Engine', () => ({
  context: {
    AccountsController: {
      getSelectedAccount: jest.fn(),
      getSelectedMultichainAccount: jest.fn(),
    },
  },
}));

describe('MultiChain utils', () => {
  describe('isEthAccount', () => {
    it('returns true for EOA accounts', () => {
      expect(isEthAccount(mockEthEOAAccount)).toBe(true);
    });

    it('returns true for ERC4337 accounts', () => {
      expect(isEthAccount(mockEthERC4337Account)).toBe(true);
    });

    it('should return false for non-ETH accounts', () => {
      expect(isEthAccount(mockBTCAccount)).toBe(false);
    });
  });

  describe('isBtcAccount', () => {
    it('returns true for P2WPKH accounts', () => {
      expect(isBtcAccount(mockBTCAccount)).toBe(true);
    });

    it('returns false for ETH accounts', () => {
      expect(isBtcAccount(mockEthEOAAccount)).toBe(false);
    });
  });

  describe('isBtcMainnetAddress', () => {
    it('returns true for P2WPKH addresses (bc1...)', () => {
      expect(isBtcMainnetAddress(MOCK_BTC_MAINNET_ADDRESS)).toBe(true);
    });

    it('returns true for P2PKH addresses (starts with 1)', () => {
      expect(isBtcMainnetAddress(MOCK_BTC_MAINNET_ADDRESS_2)).toBe(true);
    });

    it('returns false for testnet addresses', () => {
      expect(isBtcMainnetAddress(MOCK_BTC_TESTNET_ADDRESS)).toBe(false);
    });

    it('returns false for ETH addresses', () => {
      expect(isBtcMainnetAddress(MOCK_ETH_ADDRESS)).toBe(false);
    });
    it('returns false for SOL addresses', () => {
      expect(isBtcMainnetAddress(SOL_ADDRESS)).toBe(false);
    });
  });

  describe('isBtcTestnetAddress', () => {
    it('returns true for testnet addresses', () => {
      expect(isBtcTestnetAddress(MOCK_BTC_TESTNET_ADDRESS)).toBe(true);
    });

    it('returns false for mainnet addresses', () => {
      expect(isBtcTestnetAddress(MOCK_BTC_MAINNET_ADDRESS)).toBe(false);
      expect(isBtcTestnetAddress(MOCK_BTC_MAINNET_ADDRESS_2)).toBe(false);
    });

    it('returns false for ETH addresses', () => {
      expect(isBtcTestnetAddress(MOCK_ETH_ADDRESS)).toBe(false);
    });
    it('returns false for SOL addresses', () => {
      expect(isBtcTestnetAddress(SOL_ADDRESS)).toBe(false);
    });
  });

  describe('isTronAddress', () => {
    it('returns true for valid Tron addresses', () => {
      expect(isTronAddress(MOCK_TRON_ADDRESS)).toBe(true);
      expect(isTronAddress(MOCK_TRON_ADDRESS_2)).toBe(true);
    });

    it('returns false for ETH addresses', () => {
      expect(isTronAddress(MOCK_ETH_ADDRESS)).toBe(false);
    });

    it('returns false for BTC addresses', () => {
      expect(isTronAddress(MOCK_BTC_MAINNET_ADDRESS)).toBe(false);
      expect(isTronAddress(MOCK_BTC_TESTNET_ADDRESS)).toBe(false);
    });

    it('returns false for SOL addresses', () => {
      expect(isTronAddress(SOL_ADDRESS)).toBe(false);
    });

    it('returns false for invalid addresses', () => {
      expect(isTronAddress('invalid')).toBe(false);
      expect(isTronAddress('T12345')).toBe(false);
      expect(isTronAddress('')).toBe(false);
    });

    it('returns false for null or undefined', () => {
      expect(isTronAddress(null as unknown as string)).toBe(false);
      expect(isTronAddress(undefined as unknown as string)).toBe(false);
    });

    it('returns false for non-T prefix addresses', () => {
      expect(isTronAddress('ANPeeaaFhwdYaBjwE6tz8N6Vp1y66i5NjE')).toBe(false);
    });

    it('returns false for addresses with incorrect length', () => {
      expect(isTronAddress('T123')).toBe(false);
      expect(
        isTronAddress('TNPeeaaFhwdYaBjwE6tz8N6Vp1y66i5NjEExtraChars'),
      ).toBe(false);
    });
  });

  describe('isSolanaAccount', () => {
    it('returns true for Solana accounts', () => {
      expect(isSolanaAccount(mockSolAccount)).toBe(true);
    });

    it('returns false for non-Solana accounts', () => {
      expect(isSolanaAccount(mockEthEOAAccount)).toBe(false);
      expect(isSolanaAccount(mockBTCAccount)).toBe(false);
    });
  });

  describe('isNonEvmAddress', () => {
    describe('Solana addresses', () => {
      it('returns true for valid Solana addresses', () => {
        expect(isNonEvmAddress(SOL_ADDRESS)).toBe(true);
        expect(isNonEvmAddress(SOL_ADDRESS_2)).toBe(true);
      });
    });

    describe('Bitcoin mainnet addresses', () => {
      it('returns true for P2WPKH Bitcoin mainnet addresses (bc1...)', () => {
        expect(isNonEvmAddress(MOCK_BTC_MAINNET_ADDRESS)).toBe(true);
      });

      it('returns true for P2PKH Bitcoin mainnet addresses (1...)', () => {
        expect(isNonEvmAddress(MOCK_BTC_MAINNET_ADDRESS_2)).toBe(true);
      });
    });

    describe('Bitcoin testnet addresses', () => {
      it('returns true for Bitcoin testnet addresses (tb1...)', () => {
        expect(isNonEvmAddress(MOCK_BTC_TESTNET_ADDRESS)).toBe(true);
      });
    });

    describe('Bitcoin regtest addresses', () => {
      it('returns true for Bitcoin regtest addresses', () => {
        expect(isNonEvmAddress(MOCK_BTC_REGTEST_ADDRESS)).toBe(true);
      });
    });

    describe('Tron addresses', () => {
      it('returns true for valid Tron addresses', () => {
        expect(isNonEvmAddress(MOCK_TRON_ADDRESS)).toBe(true);
        expect(isNonEvmAddress(MOCK_TRON_ADDRESS_2)).toBe(true);
      });
    });

    describe('Ethereum addresses', () => {
      it('returns false for valid Ethereum addresses', () => {
        expect(isNonEvmAddress(MOCK_ETH_ADDRESS)).toBe(false);
        expect(isNonEvmAddress(MOCK_ETH_ADDRESS_2)).toBe(false);
      });
    });
  });

  describe('getFormattedAddressFromInternalAccount', () => {
    it('returns checksummed address for ETH EOA accounts', () => {
      const formatted =
        getFormattedAddressFromInternalAccount(mockEthEOAAccount);
      expect(formatted).toBe(toChecksumHexAddress(MOCK_ETH_ADDRESS));
    });

    it('returns checksummed address for ETH ERC4337 accounts', () => {
      const formatted = getFormattedAddressFromInternalAccount(
        mockEthERC4337Account,
      );
      expect(formatted).toBe(
        toChecksumHexAddress(mockEthERC4337Account.address),
      );
    });

    it('returns unformatted address for BTC accounts', () => {
      const formatted = getFormattedAddressFromInternalAccount(mockBTCAccount);
      expect(formatted).toBe(MOCK_BTC_MAINNET_ADDRESS);
    });
  });

  describe('lastSelectedAccountAddressInEvmNetwork', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('returns the selected EVM account address', () => {
      // @ts-expect-error - getSelectedAccount is mocked in the top of the file
      Engine.context.AccountsController.getSelectedAccount.mockReturnValue({
        address: MOCK_ETH_ADDRESS,
      });

      expect(lastSelectedAccountAddressInEvmNetwork()).toBe(MOCK_ETH_ADDRESS);
    });

    it('returns undefined when no account is selected', () => {
      // @ts-expect-error - getSelectedAccount is mocked in the top of the file
      Engine.context.AccountsController.getSelectedAccount.mockReturnValue(
        undefined,
      );

      expect(lastSelectedAccountAddressInEvmNetwork()).toBeUndefined();
    });
  });

  describe('lastSelectedAccountAddressByNonEvmNetworkChainId', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('returns the selected non-EVM account address for Solana', () => {
      // @ts-expect-error - getSelectedMultichainAccount is mocked in the top of the file
      Engine.context.AccountsController.getSelectedMultichainAccount.mockImplementation(
        (chainId: string) =>
          chainId === SolScope.Mainnet ? { address: SOL_ADDRESS } : undefined,
      );

      expect(
        lastSelectedAccountAddressByNonEvmNetworkChainId(SolScope.Mainnet),
      ).toBe(SOL_ADDRESS);
    });

    it('returns the selected non-EVM account address for Bitcoin', () => {
      // @ts-expect-error - getSelectedMultichainAccount is mocked in the top of the file
      Engine.context.AccountsController.getSelectedMultichainAccount.mockImplementation(
        (chainId: string) =>
          chainId === BtcScope.Mainnet
            ? { address: MOCK_BTC_MAINNET_ADDRESS }
            : undefined,
      );

      expect(
        lastSelectedAccountAddressByNonEvmNetworkChainId(BtcScope.Mainnet),
      ).toBe(MOCK_BTC_MAINNET_ADDRESS);
    });

    it('returns undefined when no account is selected for the chain', () => {
      // @ts-expect-error - getSelectedMultichainAccount is mocked in the top of the file
      Engine.context.AccountsController.getSelectedMultichainAccount.mockReturnValue(
        undefined,
      );

      expect(
        lastSelectedAccountAddressByNonEvmNetworkChainId(SolScope.Mainnet),
      ).toBeUndefined();
    });
  });

  describe('Block Explorer URL utilities', () => {
    const MOCK_SOL_TX_ID =
      '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM7cvkMPXTz5NAGvXUqaJyPmAB3Wyaq7FZggeuTEpjZM2r';
    const MOCK_BTC_TX_ID =
      '6a7d5d78f6a9c5d4e5f3a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('getTransactionUrl', () => {
      it('returns a formatted transaction URL for Bitcoin', () => {
        const mockUrl =
          'https://blockstream.info/tx/6a7d5d78f6a9c5d4e5f3a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6';
        (formatBlockExplorerTransactionUrl as jest.Mock).mockReturnValue(
          mockUrl,
        );

        const result = getTransactionUrl(MOCK_BTC_TX_ID, BtcScope.Mainnet);

        expect(formatBlockExplorerTransactionUrl).toHaveBeenCalledWith(
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[BtcScope.Mainnet],
          MOCK_BTC_TX_ID,
        );
        expect(result).toBe(mockUrl);
      });

      it('returns a formatted transaction URL for Solana', () => {
        const mockUrl =
          'https://solscan.io/tx/4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM7cvkMPXTz5NAGvXUqaJyPmAB3Wyaq7FZggeuTEpjZM2r';
        (formatBlockExplorerTransactionUrl as jest.Mock).mockReturnValue(
          mockUrl,
        );

        const result = getTransactionUrl(MOCK_SOL_TX_ID, SolScope.Mainnet);

        expect(formatBlockExplorerTransactionUrl).toHaveBeenCalledWith(
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[SolScope.Mainnet],
          MOCK_SOL_TX_ID,
        );
        expect(result).toBe(mockUrl);
      });

      it('returns empty string when no explorer URLs exist for the chain', () => {
        const result = getTransactionUrl(
          MOCK_SOL_TX_ID,
          'unsupported-chain-id' as CaipChainId,
        );

        expect(formatBlockExplorerTransactionUrl).not.toHaveBeenCalled();
        expect(result).toBe('');
      });
    });

    describe('getAddressUrl', () => {
      it('returns a formatted address URL for Bitcoin', () => {
        const mockUrl =
          'https://blockstream.info/address/bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k';
        (formatBlockExplorerAddressUrl as jest.Mock).mockReturnValue(mockUrl);

        const result = getAddressUrl(
          MOCK_BTC_MAINNET_ADDRESS,
          BtcScope.Mainnet,
        );

        expect(formatBlockExplorerAddressUrl).toHaveBeenCalledWith(
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[BtcScope.Mainnet],
          MOCK_BTC_MAINNET_ADDRESS,
        );
        expect(result).toBe(mockUrl);
      });

      it('returns a formatted address URL for Solana', () => {
        const mockUrl =
          'https://solscan.io/account/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
        (formatBlockExplorerAddressUrl as jest.Mock).mockReturnValue(mockUrl);

        const result = getAddressUrl(SOL_ADDRESS, SolScope.Mainnet);

        expect(formatBlockExplorerAddressUrl).toHaveBeenCalledWith(
          MULTICHAIN_NETWORK_BLOCK_EXPLORER_FORMAT_URLS_MAP[SolScope.Mainnet],
          SOL_ADDRESS,
        );
        expect(result).toBe(mockUrl);
      });

      it('returns empty string when no explorer URLs exist for the chain', () => {
        const result = getAddressUrl(
          SOL_ADDRESS,
          'unsupported-chain-id' as CaipChainId,
        );

        expect(formatBlockExplorerAddressUrl).not.toHaveBeenCalled();
        expect(result).toBe('');
      });
    });

    describe('shortenTransactionId', () => {
      it('formats Solana transaction ID to a shortened version', () => {
        const shortenedSolTxId = '4uQeVj...pjZM2r';
        (formatAddress as jest.Mock).mockReturnValue(shortenedSolTxId);

        const result = shortenTransactionId(MOCK_SOL_TX_ID);

        expect(formatAddress).toHaveBeenCalledWith(MOCK_SOL_TX_ID, 'short');
        expect(result).toBe(shortenedSolTxId);
      });

      it('formats Bitcoin transaction ID to a shortened version', () => {
        const shortenedBtcTxId = '6a7d5d...4c5d6';
        (formatAddress as jest.Mock).mockReturnValue(shortenedBtcTxId);

        const result = shortenTransactionId(MOCK_BTC_TX_ID);

        expect(formatAddress).toHaveBeenCalledWith(MOCK_BTC_TX_ID, 'short');
        expect(result).toBe(shortenedBtcTxId);
      });
    });
  });
});
