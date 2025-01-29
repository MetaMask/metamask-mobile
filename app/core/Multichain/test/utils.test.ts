import {
  EthAccountType,
  BtcAccountType,
  EthMethod,
  BtcMethod,
  EthScopes,
  BtcScopes,
  SolScopes,
  SolAccountType,
  SolMethod,
} from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';
import {
  isEthAccount,
  isBtcAccount,
  isBtcMainnetAddress,
  isBtcTestnetAddress,
  getFormattedAddressFromInternalAccount,
  isSolanaAccount,
} from '../utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';

// P2WPKH
const MOCK_BTC_MAINNET_ADDRESS = 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k';
// P2PKH
const MOCK_BTC_MAINNET_ADDRESS_2 = '1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ';
// P2WPKH
const MOCK_BTC_TESTNET_ADDRESS = 'tb1q63st8zfndjh00gf9hmhsdg7l8umuxudrj4lucp';
const MOCK_ETH_ADDRESS = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';

const SOL_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';

const mockEthEOAAccount: InternalAccount = {
  address: MOCK_ETH_ADDRESS,
  id: '1',
  scopes: [EthScopes.Namespace],
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
  scopes: [EthScopes.Namespace],
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
  scopes: [BtcScopes.Namespace],
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
  methods: [BtcMethod.SendBitcoin],
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
  scopes: [SolScopes.Mainnet, SolScopes.Testnet, SolScopes.Devnet],
};

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

  describe('isSolanaAccount', () => {
    it('returns true for Solana accounts', () => {
      expect(isSolanaAccount(mockSolAccount)).toBe(true);
    });

    it('returns false for non-Solana accounts', () => {
      expect(isSolanaAccount(mockEthEOAAccount)).toBe(false);
      expect(isSolanaAccount(mockBTCAccount)).toBe(false);
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
});
