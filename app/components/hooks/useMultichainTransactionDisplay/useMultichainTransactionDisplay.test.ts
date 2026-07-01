import { Transaction, TransactionType } from '@metamask/keyring-api';
import {
  CustomTransactionTypeLabel,
  useMultichainTransactionDisplay,
} from './useMultichainTransactionDisplay';

jest.mock('../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => key,
}));

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
  events: [],
};

describe('useMultichainTransactionDisplay', () => {
  it('uses trustline approve title and hides amount for trustline transactions', () => {
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

    expect(displayData.title).toBe('transactions.trustline_activated_unit');
    expect(displayData.shouldShowAmountOrUnit).toBe(false);
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

    expect(displayData.title).toBe('transactions.trustline_deactivated');
    expect(displayData.shouldShowAmountOrUnit).toBe(false);
  });

  it('uses trustline title for token approve transactions without typeLabel', () => {
    const transaction: Transaction = {
      ...baseTransaction,
      type: TransactionType.TokenApprove,
    };

    const displayData = useMultichainTransactionDisplay(
      transaction,
      'stellar:pubnet',
    );

    expect(displayData.title).toBe('transactions.trustline_activated_unit');
    expect(displayData.shouldShowAmountOrUnit).toBe(false);
  });

  it('shows amount for non-trustline transactions', () => {
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

    expect(displayData.shouldShowAmountOrUnit).toBe(true);
    expect(displayData.to?.amount).toBe('-1');
  });
});
