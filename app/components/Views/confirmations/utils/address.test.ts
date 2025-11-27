import { derivePredefinedRecipientParams } from './address';
import { ChainType } from './send';

describe('derivePredefinedRecipientParams', () => {
  describe('EVM addresses', () => {
    it('returns EVM chain type for valid EVM address', () => {
      const address = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';

      const result = derivePredefinedRecipientParams(address);

      expect(result).toEqual({
        address,
        chainType: ChainType.EVM,
      });
    });
  });

  describe('Solana addresses', () => {
    it('returns Solana chain type for valid Solana address', () => {
      const address = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';

      const result = derivePredefinedRecipientParams(address);

      expect(result).toEqual({
        address,
        chainType: ChainType.SOLANA,
      });
    });
  });

  describe('Bitcoin addresses', () => {
    it('returns Bitcoin chain type for valid P2WPKH mainnet address', () => {
      const address = 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k';

      const result = derivePredefinedRecipientParams(address);

      expect(result).toEqual({
        address,
        chainType: ChainType.BITCOIN,
      });
    });

    it('returns Bitcoin chain type for valid P2PKH mainnet address', () => {
      const address = '1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ';

      const result = derivePredefinedRecipientParams(address);

      expect(result).toEqual({
        address,
        chainType: ChainType.BITCOIN,
      });
    });
  });

  describe('Tron addresses', () => {
    it('returns Tron chain type for valid Tron address', () => {
      const address = 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7';

      const result = derivePredefinedRecipientParams(address);

      expect(result).toEqual({
        address,
        chainType: ChainType.TRON,
      });
    });

    it('returns Tron chain type for another valid Tron address', () => {
      const address = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

      const result = derivePredefinedRecipientParams(address);

      expect(result).toEqual({
        address,
        chainType: ChainType.TRON,
      });
    });
  });

  describe('Invalid addresses', () => {
    it('returns undefined for invalid address', () => {
      const address = 'invalid-address';

      const result = derivePredefinedRecipientParams(address);

      expect(result).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      const address = '';

      const result = derivePredefinedRecipientParams(address);

      expect(result).toBeUndefined();
    });

    it('returns undefined for address with wrong prefix', () => {
      const address = 'ANPeeaaFhwdYaBjwE6tz8N6Vp1y66i5NjE';

      const result = derivePredefinedRecipientParams(address);

      expect(result).toBeUndefined();
    });
  });

  describe('Priority order', () => {
    it('checks EVM address first', () => {
      const evmAddress = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
      const result = derivePredefinedRecipientParams(evmAddress);
      expect(result?.chainType).toBe(ChainType.EVM);
    });

    it('checks Solana address after EVM', () => {
      const solanaAddress = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      const result = derivePredefinedRecipientParams(solanaAddress);
      expect(result?.chainType).toBe(ChainType.SOLANA);
    });

    it('checks Bitcoin address after Solana', () => {
      const btcAddress = 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k';
      const result = derivePredefinedRecipientParams(btcAddress);
      expect(result?.chainType).toBe(ChainType.BITCOIN);
    });

    it('checks Tron address last', () => {
      const tronAddress = 'TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7';
      const result = derivePredefinedRecipientParams(tronAddress);
      expect(result?.chainType).toBe(ChainType.TRON);
    });
  });
});
