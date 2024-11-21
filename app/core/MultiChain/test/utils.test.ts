import {
  InternalAccount,
  EthAccountType,
  BtcAccountType,
  EthMethod,
  BtcMethod,
} from '@metamask/keyring-api';
import {
  isEthAccount,
  isBtcAccount,
  isBtcMainnetAddress,
  isBtcTestnetAddress,
  getFormattedAddressFromInternalAccount,
} from '../utils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';

const MOCK_BTC_MAINNET_ADDRESS = 'bc1qkv7xptmd7ejmnnd399z9p643updvula5j4g4nd';
const MOCK_BTC_MAINNET_ADDRESS_2 = '1Lbcfr7sAHTD9CgdQo3HTMTkV8LK4ZnX71';
const MOCK_BTC_TESTNET_ADDRESS = 'tb1q63st8zfndjh00gf9hmhsdg7l8umuxudrj4lucp';
const MOCK_ETH_ADDRESS = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';

const mockEthEOAAccount: InternalAccount = {
  address: MOCK_ETH_ADDRESS,
  id: '1',
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
  metadata: {
    name: 'Bitcoin Account',
    importTime: 1684232000456,
    keyring: {
      type: KeyringTypes.hd,
    },
  },
  options: {},
  methods: [BtcMethod.SendMany],
  type: BtcAccountType.P2wpkh,
};

describe('MultiChain utils', () => {
  describe('isEthAccount', () => {
    it('should return true for EOA accounts', () => {
      expect(isEthAccount(mockEthEOAAccount)).toBe(true);
    });

    it('should return true for ERC4337 accounts', () => {
      expect(isEthAccount(mockEthERC4337Account)).toBe(true);
    });

    it('should return false for non-ETH accounts', () => {
      expect(isEthAccount(mockBTCAccount)).toBe(false);
    });
  });

  describe('isBtcAccount', () => {
    it('should return true for P2WPKH accounts', () => {
      expect(isBtcAccount(mockBTCAccount)).toBe(true);
    });

    it('should return false for ETH accounts', () => {
      expect(isBtcAccount(mockEthEOAAccount)).toBe(false);
    });
  });

  describe('isBtcMainnetAddress', () => {
    it('should return true for bc1 addresses', () => {
      expect(isBtcMainnetAddress(MOCK_BTC_MAINNET_ADDRESS)).toBe(true);
    });

    it('should return true for addresses starting with 1', () => {
      expect(isBtcMainnetAddress(MOCK_BTC_MAINNET_ADDRESS_2)).toBe(true);
    });

    it('should return false for testnet addresses', () => {
      expect(isBtcMainnetAddress(MOCK_BTC_TESTNET_ADDRESS)).toBe(false);
    });

    it('should return false for ETH addresses', () => {
      expect(isBtcMainnetAddress(MOCK_ETH_ADDRESS)).toBe(false);
    });
  });

  describe('isBtcTestnetAddress', () => {
    it('should return true for testnet addresses', () => {
      expect(isBtcTestnetAddress(MOCK_BTC_TESTNET_ADDRESS)).toBe(true);
    });

    it('should return false for mainnet addresses', () => {
      expect(isBtcTestnetAddress(MOCK_BTC_MAINNET_ADDRESS)).toBe(false);
      expect(isBtcTestnetAddress(MOCK_BTC_MAINNET_ADDRESS_2)).toBe(false);
    });

    it('should return false for ETH addresses', () => {
      expect(isBtcTestnetAddress(MOCK_ETH_ADDRESS)).toBe(false);
    });
  });
  describe('getFormattedAddressFromInternalAccount', () => {
    it('should return checksummed address for ETH EOA accounts', () => {
      const formatted =
        getFormattedAddressFromInternalAccount(mockEthEOAAccount);
      expect(formatted).toBe(toChecksumHexAddress(MOCK_ETH_ADDRESS));
    });

    it('should return checksummed address for ETH ERC4337 accounts', () => {
      const formatted = getFormattedAddressFromInternalAccount(
        mockEthERC4337Account,
      );
      expect(formatted).toBe(
        toChecksumHexAddress(mockEthERC4337Account.address),
      );
    });

    it('should return unformatted address for BTC accounts', () => {
      const formatted = getFormattedAddressFromInternalAccount(mockBTCAccount);
      expect(formatted).toBe(MOCK_BTC_MAINNET_ADDRESS);
    });
  });
});
