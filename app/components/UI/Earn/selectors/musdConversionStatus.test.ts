import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { RootState } from '../../../../reducers';
import {
  selectMusdConversions,
  selectHasInFlightMusdConversion,
  createTokenChainKey,
  selectMusdConversionStatuses,
} from './musdConversionStatus';

const createState = (transactions: unknown[]): RootState =>
  ({
    engine: {
      backgroundState: {
        TransactionController: {
          transactions,
        },
      },
    },
  }) as unknown as RootState;

describe('musdConversionStatus selectors', () => {
  describe('selectMusdConversions', () => {
    it('returns only transactions with type musdConversion', () => {
      const transactions = [
        { id: '1', type: TransactionType.musdConversion },
        { id: '2', type: TransactionType.simpleSend },
        { id: '3', type: TransactionType.musdConversion },
      ];
      const state = createState(transactions);

      const result = selectMusdConversions(state);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: '1',
        type: TransactionType.musdConversion,
      });
      expect(result[1]).toMatchObject({
        id: '3',
        type: TransactionType.musdConversion,
      });
    });

    it('returns empty array when no musd conversion transactions exist', () => {
      const transactions = [
        { id: '1', type: TransactionType.simpleSend },
        { id: '2', type: TransactionType.tokenMethodTransfer },
      ];
      const state = createState(transactions);

      const result = selectMusdConversions(state);

      expect(result).toEqual([]);
    });

    it('returns empty array when transactions array is empty', () => {
      const state = createState([]);

      const result = selectMusdConversions(state);

      expect(result).toEqual([]);
    });
  });

  describe('selectHasInFlightMusdConversion', () => {
    it('returns true when at least one conversion has unapproved status', () => {
      const transactions = [
        {
          id: '1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.unapproved,
        },
      ];
      const state = createState(transactions);

      const result = selectHasInFlightMusdConversion(state);

      expect(result).toBe(true);
    });

    it('returns true when at least one conversion has submitted status', () => {
      const transactions = [
        {
          id: '1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.submitted,
        },
      ];
      const state = createState(transactions);

      const result = selectHasInFlightMusdConversion(state);

      expect(result).toBe(true);
    });

    it('returns false when all conversions are confirmed', () => {
      const transactions = [
        {
          id: '1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.confirmed,
        },
      ];
      const state = createState(transactions);

      const result = selectHasInFlightMusdConversion(state);

      expect(result).toBe(false);
    });

    it('returns false when all conversions are failed', () => {
      const transactions = [
        {
          id: '1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.failed,
        },
      ];
      const state = createState(transactions);

      const result = selectHasInFlightMusdConversion(state);

      expect(result).toBe(false);
    });

    it('returns false when no musd conversion transactions exist', () => {
      const transactions = [{ id: '1', type: TransactionType.simpleSend }];
      const state = createState(transactions);

      const result = selectHasInFlightMusdConversion(state);

      expect(result).toBe(false);
    });
  });

  describe('createTokenChainKey', () => {
    it('returns lowercase tokenAddress-chainId format', () => {
      const tokenAddress = '0xABC123';
      const chainId = '0x1';

      const result = createTokenChainKey(tokenAddress, chainId);

      expect(result).toBe('0xabc123-0x1');
    });

    it('normalizes mixed-case token address and chain ID', () => {
      const tokenAddress = '0xAbCdEf';
      const chainId = '0xABCD';

      const result = createTokenChainKey(tokenAddress, chainId);

      expect(result).toBe('0xabcdef-0xabcd');
    });
  });

  describe('selectMusdConversionStatuses', () => {
    it('returns status map for conversions with metamaskPay tokenAddress and chainId', () => {
      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.confirmed,
          time: 1000,
          metamaskPay: {
            tokenAddress: '0xTokenA',
            chainId: '0x1',
          },
        },
      ];
      const state = createState(transactions);

      const result = selectMusdConversionStatuses(state);

      expect(result).toHaveProperty('0xtokena-0x1');
      expect(result['0xtokena-0x1']).toEqual({
        txId: 'tx-1',
        status: TransactionStatus.confirmed,
        isPending: false,
        isConfirmed: true,
        isFailed: false,
      });
    });

    it('skips conversions without metamaskPay tokenAddress', () => {
      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.confirmed,
          metamaskPay: { chainId: '0x1' },
        },
      ];
      const state = createState(transactions);

      const result = selectMusdConversionStatuses(state);

      expect(result).toEqual({});
    });

    it('skips conversions without metamaskPay chainId', () => {
      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.confirmed,
          metamaskPay: { tokenAddress: '0xTokenA' },
        },
      ];
      const state = createState(transactions);

      const result = selectMusdConversionStatuses(state);

      expect(result).toEqual({});
    });

    it('keeps only most recent conversion per token-chain combination', () => {
      const transactions = [
        {
          id: 'tx-old',
          type: TransactionType.musdConversion,
          status: TransactionStatus.confirmed,
          time: 100,
          metamaskPay: {
            tokenAddress: '0xTokenA',
            chainId: '0x1',
          },
        },
        {
          id: 'tx-new',
          type: TransactionType.musdConversion,
          status: TransactionStatus.failed,
          time: 200,
          metamaskPay: {
            tokenAddress: '0xTokenA',
            chainId: '0x1',
          },
        },
      ];
      const state = createState(transactions);

      const result = selectMusdConversionStatuses(state);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['0xtokena-0x1'].txId).toBe('tx-new');
      expect(result['0xtokena-0x1'].isFailed).toBe(true);
    });

    it('sets isPending true for in-flight statuses', () => {
      const inFlightStatuses = [
        TransactionStatus.unapproved,
        TransactionStatus.approved,
        TransactionStatus.signed,
        TransactionStatus.submitted,
      ];

      inFlightStatuses.forEach((status, index) => {
        const transactions = [
          {
            id: `tx-${index}`,
            type: TransactionType.musdConversion,
            status,
            time: 1000 + index,
            metamaskPay: {
              tokenAddress: `0xToken${index}`,
              chainId: '0x1',
            },
          },
        ];
        const state = createState(transactions);

        const result = selectMusdConversionStatuses(state);

        const key = `0xtoken${index}-0x1`;
        expect(result[key].isPending).toBe(true);
        expect(result[key].isConfirmed).toBe(false);
        expect(result[key].isFailed).toBe(false);
      });
    });

    it('sets isConfirmed true for confirmed status', () => {
      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.confirmed,
          time: 1000,
          metamaskPay: {
            tokenAddress: '0xTokenA',
            chainId: '0x1',
          },
        },
      ];
      const state = createState(transactions);

      const result = selectMusdConversionStatuses(state);

      expect(result['0xtokena-0x1'].isConfirmed).toBe(true);
      expect(result['0xtokena-0x1'].isPending).toBe(false);
      expect(result['0xtokena-0x1'].isFailed).toBe(false);
    });

    it('sets isFailed true for failed status', () => {
      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.failed,
          time: 1000,
          metamaskPay: {
            tokenAddress: '0xTokenA',
            chainId: '0x1',
          },
        },
      ];
      const state = createState(transactions);

      const result = selectMusdConversionStatuses(state);

      expect(result['0xtokena-0x1'].isFailed).toBe(true);
      expect(result['0xtokena-0x1'].isPending).toBe(false);
      expect(result['0xtokena-0x1'].isConfirmed).toBe(false);
    });

    it('returns separate entries for same token on different chains', () => {
      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.confirmed,
          time: 1000,
          metamaskPay: {
            tokenAddress: '0xTokenA',
            chainId: '0x1',
          },
        },
        {
          id: 'tx-2',
          type: TransactionType.musdConversion,
          status: TransactionStatus.failed,
          time: 1000,
          metamaskPay: {
            tokenAddress: '0xTokenA',
            chainId: '0x137',
          },
        },
      ];
      const state = createState(transactions);

      const result = selectMusdConversionStatuses(state);

      expect(result['0xtokena-0x1']).toBeDefined();
      expect(result['0xtokena-0x1'].txId).toBe('tx-1');
      expect(result['0xtokena-0x137']).toBeDefined();
      expect(result['0xtokena-0x137'].txId).toBe('tx-2');
    });

    it('returns empty object when no valid conversions with metamaskPay data', () => {
      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.confirmed,
          metamaskPay: {},
        },
      ];
      const state = createState(transactions);

      const result = selectMusdConversionStatuses(state);

      expect(result).toEqual({});
    });

    it('uses tx.time of 0 when time is undefined', () => {
      const transactions = [
        {
          id: 'tx-1',
          type: TransactionType.musdConversion,
          status: TransactionStatus.confirmed,
          metamaskPay: {
            tokenAddress: '0xTokenA',
            chainId: '0x1',
          },
        },
      ];
      const state = createState(transactions);

      const result = selectMusdConversionStatuses(state);

      expect(result['0xtokena-0x1']).toBeDefined();
      expect(result['0xtokena-0x1'].txId).toBe('tx-1');
    });
  });
});
