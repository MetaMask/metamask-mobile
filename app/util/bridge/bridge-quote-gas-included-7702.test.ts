import { KeyringTypes, type KeyringObject } from '@metamask/keyring-controller';
import {
  getKeyringTypeForAddress,
  isExternalSigningKeyringType,
  shouldDisableGasIncluded7702InBridgeQuoteRequest,
} from './bridge-quote-gas-included-7702';

const ledgerKeyring = (accounts: string[]): KeyringObject => ({
  type: KeyringTypes.ledger,
  accounts,
  metadata: { id: 'ledger-1', name: 'Ledger' },
});

const hdKeyring = (accounts: string[]): KeyringObject => ({
  type: KeyringTypes.hd,
  accounts,
  metadata: { id: 'hd-1', name: 'HD' },
});

describe('bridge-quote-gas-included-7702', () => {
  describe('isExternalSigningKeyringType', () => {
    it('returns true for hardware and QR keyrings', () => {
      expect(isExternalSigningKeyringType(KeyringTypes.ledger)).toBe(true);
      expect(isExternalSigningKeyringType(KeyringTypes.qr)).toBe(true);
      expect(isExternalSigningKeyringType(KeyringTypes.trezor)).toBe(true);
    });

    it('returns true for custody keyring prefix', () => {
      expect(isExternalSigningKeyringType('Custody Test')).toBe(true);
    });

    it('returns false for HD and simple keyrings', () => {
      expect(isExternalSigningKeyringType(KeyringTypes.hd)).toBe(false);
      expect(isExternalSigningKeyringType(KeyringTypes.simple)).toBe(false);
    });
  });

  describe('getKeyringTypeForAddress', () => {
    it('returns keyring type matching address case-insensitively', () => {
      const keyrings = [
        ledgerKeyring(['0xAbCdEf1234567890123456789012345678901234']),
      ];
      expect(
        getKeyringTypeForAddress(
          keyrings,
          '0xabcdef1234567890123456789012345678901234',
        ),
      ).toBe(KeyringTypes.ledger);
    });

    it('returns undefined when address is not in any keyring', () => {
      const keyrings = [
        hdKeyring(['0x1111111111111111111111111111111111111111']),
      ];
      expect(
        getKeyringTypeForAddress(
          keyrings,
          '0x2222222222222222222222222222222222222222',
        ),
      ).toBeUndefined();
    });
  });

  describe('shouldDisableGasIncluded7702InBridgeQuoteRequest', () => {
    it('returns false without wallet address or keyrings', () => {
      expect(
        shouldDisableGasIncluded7702InBridgeQuoteRequest(undefined, []),
      ).toBe(false);
      expect(
        shouldDisableGasIncluded7702InBridgeQuoteRequest('0x1', undefined),
      ).toBe(false);
    });

    it('returns true when address belongs to an external signing keyring', () => {
      const addr = '0x3333333333333333333333333333333333333333';
      expect(
        shouldDisableGasIncluded7702InBridgeQuoteRequest(addr, [
          ledgerKeyring([addr]),
        ]),
      ).toBe(true);
    });

    it('returns false when address belongs to HD keyring', () => {
      const addr = '0x4444444444444444444444444444444444444444';
      expect(
        shouldDisableGasIncluded7702InBridgeQuoteRequest(addr, [
          hdKeyring([addr]),
        ]),
      ).toBe(false);
    });
  });
});
