import {
  CHAIN_IDS,
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import {
  getMoneyActivityDateKeyUtc,
  isMoneyActivityDeposit,
  isMoneyActivityTransaction,
  isMoneyActivityTransfer,
  isMusdErc20Transfer,
} from './moneyActivityFilters';

const MOCK_CHAIN: Hex = CHAIN_IDS.MONAD;
const OTHER_ERC20: Hex = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

function tx(overrides: Partial<TransactionMeta>): TransactionMeta {
  return {
    id: 't1',
    chainId: MOCK_CHAIN,
    time: Date.UTC(2025, 3, 10, 12, 0, 0),
    ...overrides,
  } as TransactionMeta;
}

function transferInfo(
  contractAddress: Hex,
): NonNullable<TransactionMeta['transferInformation']> {
  return {
    amount: '1000000',
    decimals: 6,
    symbol: 'mUSD',
    contractAddress,
  };
}

describe('moneyActivityFilters', () => {
  describe('isMoneyActivityDeposit', () => {
    it('returns true for incoming and moneyAccountDeposit', () => {
      expect(
        isMoneyActivityDeposit(tx({ type: TransactionType.incoming })),
      ).toBe(true);
      expect(
        isMoneyActivityDeposit(
          tx({ type: TransactionType.moneyAccountDeposit }),
        ),
      ).toBe(true);
    });

    it('returns false for musdConversion (no longer classified as a deposit)', () => {
      expect(
        isMoneyActivityDeposit(tx({ type: TransactionType.musdConversion })),
      ).toBe(false);
    });

    it('returns true for a batch tx with a nested moneyAccountDeposit', () => {
      expect(
        isMoneyActivityDeposit(
          tx({
            type: TransactionType.batch,
            nestedTransactions: [
              { type: TransactionType.moneyAccountDeposit } as TransactionMeta,
            ],
          }),
        ),
      ).toBe(true);
    });

    it('returns false for outgoing and unrelated types', () => {
      expect(
        isMoneyActivityDeposit(
          tx({ type: TransactionType.moneyAccountWithdraw }),
        ),
      ).toBe(false);
      expect(
        isMoneyActivityDeposit(tx({ type: TransactionType.simpleSend })),
      ).toBe(false);
      expect(isMoneyActivityDeposit(tx({ type: TransactionType.swap }))).toBe(
        false,
      );
    });

    it('returns true for an mUSD tokenMethodTransfer', () => {
      expect(
        isMoneyActivityDeposit(
          tx({
            type: TransactionType.tokenMethodTransfer,
            transferInformation: transferInfo(MUSD_TOKEN_ADDRESS),
          }),
        ),
      ).toBe(true);
    });

    it('returns false for a non-mUSD tokenMethodTransfer', () => {
      expect(
        isMoneyActivityDeposit(
          tx({
            type: TransactionType.tokenMethodTransfer,
            transferInformation: transferInfo(OTHER_ERC20),
          }),
        ),
      ).toBe(false);
    });
  });

  describe('isMoneyActivityTransfer', () => {
    it('returns true for moneyAccountWithdraw and simpleSend', () => {
      expect(
        isMoneyActivityTransfer(
          tx({ type: TransactionType.moneyAccountWithdraw }),
        ),
      ).toBe(true);
      expect(
        isMoneyActivityTransfer(tx({ type: TransactionType.simpleSend })),
      ).toBe(true);
    });

    it('returns true for a batch tx with a nested moneyAccountWithdraw', () => {
      expect(
        isMoneyActivityTransfer(
          tx({
            type: TransactionType.batch,
            nestedTransactions: [
              { type: TransactionType.moneyAccountWithdraw } as TransactionMeta,
            ],
          }),
        ),
      ).toBe(true);
    });

    it('returns false for deposit-like types', () => {
      expect(
        isMoneyActivityTransfer(
          tx({ type: TransactionType.moneyAccountDeposit }),
        ),
      ).toBe(false);
    });

    it('returns false for an mUSD tokenMethodTransfer (now a deposit)', () => {
      expect(
        isMoneyActivityTransfer(
          tx({
            type: TransactionType.tokenMethodTransfer,
            transferInformation: transferInfo(MUSD_TOKEN_ADDRESS),
          }),
        ),
      ).toBe(false);
    });
  });

  describe('isMusdErc20Transfer', () => {
    it('returns true for tokenMethodTransfer with mUSD contract', () => {
      expect(
        isMusdErc20Transfer(
          tx({
            type: TransactionType.tokenMethodTransfer,
            transferInformation: transferInfo(MUSD_TOKEN_ADDRESS),
          }),
        ),
      ).toBe(true);
    });

    it('returns true for tokenMethodTransferFrom with mUSD contract', () => {
      expect(
        isMusdErc20Transfer(
          tx({
            type: TransactionType.tokenMethodTransferFrom,
            transferInformation: transferInfo(MUSD_TOKEN_ADDRESS),
          }),
        ),
      ).toBe(true);
    });

    it('returns false when contract address is a different ERC-20', () => {
      expect(
        isMusdErc20Transfer(
          tx({
            type: TransactionType.tokenMethodTransfer,
            transferInformation: transferInfo(OTHER_ERC20),
          }),
        ),
      ).toBe(false);
    });

    it('returns false for non-ERC-20-transfer types', () => {
      expect(
        isMusdErc20Transfer(
          tx({
            type: TransactionType.moneyAccountWithdraw,
            transferInformation: transferInfo(MUSD_TOKEN_ADDRESS),
          }),
        ),
      ).toBe(false);
    });

    it('returns true when transferInformation is missing but txParams.to is mUSD', () => {
      expect(
        isMusdErc20Transfer(
          tx({
            type: TransactionType.tokenMethodTransfer,
            txParams: { to: MUSD_TOKEN_ADDRESS } as never,
          }),
        ),
      ).toBe(true);
    });

    it('returns false when both transferInformation and txParams.to are missing', () => {
      expect(
        isMusdErc20Transfer(tx({ type: TransactionType.tokenMethodTransfer })),
      ).toBe(false);
    });

    it('returns false on chains where mUSD exists but the Money Account does not (Mainnet/Linea/BSC) — ticket AC excludes non-Monad', () => {
      const nonMoneyChains: Hex[] = [
        CHAIN_IDS.MAINNET,
        CHAIN_IDS.LINEA_MAINNET,
        CHAIN_IDS.BSC,
        '0x89', // Polygon — mUSD not deployed at all
      ];
      for (const chainId of nonMoneyChains) {
        expect(
          isMusdErc20Transfer(
            tx({
              chainId,
              type: TransactionType.tokenMethodTransfer,
              transferInformation: transferInfo(MUSD_TOKEN_ADDRESS),
            }),
          ),
        ).toBe(false);
        expect(
          isMusdErc20Transfer(
            tx({
              chainId,
              type: TransactionType.tokenMethodTransfer,
              txParams: { to: MUSD_TOKEN_ADDRESS } as never,
            }),
          ),
        ).toBe(false);
      }
    });
  });

  describe('isMoneyActivityTransaction', () => {
    it('returns true when either deposit or transfer predicate matches', () => {
      expect(
        isMoneyActivityTransaction(tx({ type: TransactionType.incoming })),
      ).toBe(true);
      expect(
        isMoneyActivityTransaction(
          tx({ type: TransactionType.moneyAccountWithdraw }),
        ),
      ).toBe(true);
    });

    it('returns false for unclassified types such as swap', () => {
      expect(
        isMoneyActivityTransaction(tx({ type: TransactionType.swap })),
      ).toBe(false);
    });
  });

  describe('getMoneyActivityDateKeyUtc', () => {
    it('returns YYYY-MM-DD in UTC from tx.time', () => {
      expect(
        getMoneyActivityDateKeyUtc(
          tx({ time: Date.UTC(2025, 0, 5, 23, 59, 59) }),
        ),
      ).toBe('2025-01-05');
    });
  });
});
