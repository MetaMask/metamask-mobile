import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import {
  findMusdReceiveTransaction,
  getMusdReceiveHash,
} from './transaction-details-summary.utils';

const CHAIN_ID_MAINNET = '0x1' as Hex;
const MUSD_ADDRESS = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

describe('transaction-details-summary.utils', () => {
  describe('findMusdReceiveTransaction', () => {
    it('returns transaction with matching mUSD contract address', () => {
      const musdReceiveTx = {
        id: 'musd-receive',
        transferInformation: {
          contractAddress: MUSD_ADDRESS,
        },
      } as unknown as TransactionMeta;

      const otherTx = {
        id: 'other-tx',
        transferInformation: {
          contractAddress: '0xother',
        },
      } as unknown as TransactionMeta;

      const result = findMusdReceiveTransaction(
        [otherTx, musdReceiveTx],
        CHAIN_ID_MAINNET,
      );

      expect(result).toBe(musdReceiveTx);
    });

    it('matches case-insensitively', () => {
      const musdReceiveTx = {
        id: 'musd-receive',
        transferInformation: {
          contractAddress: MUSD_ADDRESS.toUpperCase(),
        },
      } as unknown as TransactionMeta;

      const result = findMusdReceiveTransaction(
        [musdReceiveTx],
        CHAIN_ID_MAINNET,
      );

      expect(result).toBe(musdReceiveTx);
    });

    it('returns undefined when no matching transaction', () => {
      const otherTx = {
        id: 'other-tx',
        transferInformation: {
          contractAddress: '0xother',
        },
      } as unknown as TransactionMeta;

      const result = findMusdReceiveTransaction([otherTx], CHAIN_ID_MAINNET);

      expect(result).toBeUndefined();
    });

    it('returns undefined for unsupported chain', () => {
      const musdReceiveTx = {
        id: 'musd-receive',
        transferInformation: {
          contractAddress: MUSD_ADDRESS,
        },
      } as unknown as TransactionMeta;

      const result = findMusdReceiveTransaction(
        [musdReceiveTx],
        '0x999' as Hex,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when transactions have no transferInformation', () => {
      const tx = { id: 'tx' } as unknown as TransactionMeta;

      const result = findMusdReceiveTransaction([tx], CHAIN_ID_MAINNET);

      expect(result).toBeUndefined();
    });
  });

  describe('getMusdReceiveHash', () => {
    it('returns musdReceiveTx hash when available', () => {
      const musdReceiveTx = {
        hash: '0xreceivehash',
      } as unknown as TransactionMeta;

      const transaction = {
        hash: '0xfallbackhash',
      } as unknown as TransactionMeta;

      const result = getMusdReceiveHash(musdReceiveTx, transaction);

      expect(result).toBe('0xreceivehash');
    });

    it('returns transaction hash as fallback when musdReceiveTx is undefined', () => {
      const transaction = {
        hash: '0xfallbackhash',
      } as unknown as TransactionMeta;

      const result = getMusdReceiveHash(undefined, transaction);

      expect(result).toBe('0xfallbackhash');
    });

    it('returns transaction hash as fallback when musdReceiveTx has no hash', () => {
      const musdReceiveTx = {} as unknown as TransactionMeta;

      const transaction = {
        hash: '0xfallbackhash',
      } as unknown as TransactionMeta;

      const result = getMusdReceiveHash(musdReceiveTx, transaction);

      expect(result).toBe('0xfallbackhash');
    });

    it('returns undefined when transaction hash is 0x0', () => {
      const transaction = {
        hash: '0x0',
      } as unknown as TransactionMeta;

      const result = getMusdReceiveHash(undefined, transaction);

      expect(result).toBeUndefined();
    });

    it('returns undefined when no hash available', () => {
      const transaction = {} as unknown as TransactionMeta;

      const result = getMusdReceiveHash(undefined, transaction);

      expect(result).toBeUndefined();
    });
  });
});
