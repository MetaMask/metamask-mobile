import { renderHook } from '@testing-library/react-native';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@metamask/keyring-api';
import {
  CustomTransactionTypeLabel,
  useMultichainTransactionDisplay,
} from './useMultichainTransactionDisplay';

jest.mock('../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en' },
  strings: (key: string) => key,
}));

jest.mock('../../../util/assets', () => ({
  formatWithThreshold: jest.fn((amount: number) =>
    amount !== null ? String(amount) : '',
  ),
}));

jest.mock('@metamask/multichain-network-controller', () => ({
  MULTICHAIN_NETWORK_DECIMAL_PLACES: {},
}));

jest.mock('../../../util/transactions', () => ({
  isTransactionIncomplete: jest.fn(() => false),
}));

const TRON_CHAIN_ID = 'tron:728126428' as const;
const USDT_ASSET_TYPE =
  'tron:728126428/trc20:TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' as const;

const createApproveTransaction = (amount: string): Transaction =>
  ({
    id: 'tx-approve-123',
    chain: TRON_CHAIN_ID,
    account: 'account-id',
    type: TransactionType.TokenApprove,
    status: TransactionStatus.Confirmed,
    timestamp: 1700000000,
    events: [],
    fees: [],
    from: [
      {
        address: 'TOwnerAddress',
        asset: { amount, unit: 'USDT', fungible: true, type: USDT_ASSET_TYPE },
      },
    ],
    to: [
      {
        address: 'TSpenderAddress',
        asset: { amount, unit: 'USDT', fungible: true, type: USDT_ASSET_TYPE },
      },
    ],
  }) as unknown as Transaction;

const baseTransaction: Transaction = {
  id: 'tx-trustline',
  chain: 'stellar:pubnet',
  account: 'GABC123',
  type: TransactionType.Unknown,
  status: 'confirmed',
  timestamp: 1_700_000_000,
  from: [
    {
      address: 'GABC123',
      asset: {
        amount: '0',
        unit: 'USDC',
        fungible: true,
        type: 'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
      },
    },
  ],
  to: [],
  fees: [],
};

describe('useMultichainTransactionDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Trustline transactions', () => {
    it('uses trustline approve title for trustline transactions', () => {
      const transaction: Transaction = {
        ...baseTransaction,
        details: {
          typeLabel: CustomTransactionTypeLabel.TrustlineApprove,
        },
      };

      const displayData = useMultichainTransactionDisplay(
        transaction,
        'stellar:pubnet',
      );

      expect(displayData.title).toBe(
        'transactions.activity_trustline_activated USDC',
      );
    });

    it('uses trustline disapprove title without unit when from movement is empty', () => {
      const transaction: Transaction = {
        ...baseTransaction,
        from: [],
        details: {
          typeLabel: CustomTransactionTypeLabel.TrustlineDisapprove,
        },
      };

      const displayData = useMultichainTransactionDisplay(
        transaction,
        'stellar:pubnet',
      );

      expect(displayData.title).toBe('transactions.activity_trustline_deactivated');
    });

    it('uses approve title for generic token approve transactions without trustline typeLabel', () => {
      const transaction: Transaction = {
        ...baseTransaction,
        type: TransactionType.TokenApprove,
      };

      const displayData = useMultichainTransactionDisplay(
        transaction,
        'stellar:pubnet',
      );

      expect(displayData.title).toBe('transactions.tx_review_approve USDC');
    });

    it('formats amount for non-trustline transactions', () => {
      const transaction: Transaction = {
        ...baseTransaction,
        type: TransactionType.Send,
        to: [
          {
            address: 'GDEF456',
            asset: {
              amount: '1',
              unit: 'USDC',
              fungible: true,
              type: 'stellar:pubnet/asset:USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
            },
          },
        ],
      };

      const displayData = useMultichainTransactionDisplay(
        transaction,
        'stellar:pubnet',
      );

      expect(displayData.to?.amount).toBe('-1');
    });
  });

  describe('TokenApprove transactions', () => {
    it('returns isUnlimitedApproval true for amounts exceeding 1e15', () => {
      const transaction = createApproveTransaction(
        '115792089237316195423570985.639935',
      );

      const { result } = renderHook(() =>
        useMultichainTransactionDisplay(transaction, TRON_CHAIN_ID),
      );

      expect(result.current.isUnlimitedApproval).toBe(true);
    });

    it('returns isUnlimitedApproval false for amounts below 1e15', () => {
      const transaction = createApproveTransaction('1000');

      const { result } = renderHook(() =>
        useMultichainTransactionDisplay(transaction, TRON_CHAIN_ID),
      );

      expect(result.current.isUnlimitedApproval).toBe(false);
    });

    it('returns isUnlimitedApproval false for exact threshold value 1e15', () => {
      const transaction = createApproveTransaction('1000000000000000');

      const { result } = renderHook(() =>
        useMultichainTransactionDisplay(transaction, TRON_CHAIN_ID),
      );

      expect(result.current.isUnlimitedApproval).toBe(false);
    });

    it('sets title with token unit', () => {
      const transaction = createApproveTransaction('1000');

      const { result } = renderHook(() =>
        useMultichainTransactionDisplay(transaction, TRON_CHAIN_ID),
      );

      expect(result.current.title).toBe('transactions.tx_review_approve USDT');
    });

    it('sets title without unit when from has no fungible asset', () => {
      const transaction = {
        ...createApproveTransaction('1000'),
        from: [
          {
            address: 'TOwnerAddress',
            asset: {
              amount: '0',
              unit: '',
              fungible: false,
              type: USDT_ASSET_TYPE,
            },
          },
        ],
      } as unknown as Transaction;

      const { result } = renderHook(() =>
        useMultichainTransactionDisplay(transaction, TRON_CHAIN_ID),
      );

      expect(result.current.title).toBe('transactions.tx_review_approve');
    });

    it('returns isUnlimitedApproval true when from is empty but to carries unlimited amount', () => {
      const transaction = {
        ...createApproveTransaction('115792089237316195423570985.639935'),
        from: [],
      } as unknown as Transaction;

      const { result } = renderHook(() =>
        useMultichainTransactionDisplay(transaction, TRON_CHAIN_ID),
      );

      expect(result.current.isUnlimitedApproval).toBe(true);
    });

    it('returns isUnlimitedApproval false when both from and to are empty', () => {
      const transaction = {
        ...createApproveTransaction('115792089237316195423570985.639935'),
        from: [],
        to: [],
      } as unknown as Transaction;

      const { result } = renderHook(() =>
        useMultichainTransactionDisplay(transaction, TRON_CHAIN_ID),
      );

      expect(result.current.isUnlimitedApproval).toBe(false);
    });
  });

  describe('non-TokenApprove transactions', () => {
    it('returns isUnlimitedApproval false for Send transactions regardless of amount size', () => {
      const transaction = {
        ...createApproveTransaction('115792089237316195423570985.639935'),
        type: TransactionType.Send,
      } as unknown as Transaction;

      const { result } = renderHook(() =>
        useMultichainTransactionDisplay(transaction, TRON_CHAIN_ID),
      );

      expect(result.current.isUnlimitedApproval).toBe(false);
    });

    it('returns isUnlimitedApproval false for Receive transactions regardless of amount size', () => {
      const transaction = {
        ...createApproveTransaction('115792089237316195423570985.639935'),
        type: TransactionType.Receive,
      } as unknown as Transaction;

      const { result } = renderHook(() =>
        useMultichainTransactionDisplay(transaction, TRON_CHAIN_ID),
      );

      expect(result.current.isUnlimitedApproval).toBe(false);
    });
  });
});
