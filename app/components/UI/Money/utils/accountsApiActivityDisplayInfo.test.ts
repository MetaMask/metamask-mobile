import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import {
  CardTransactionStatus,
  CardTransactionType,
  type CardTransaction,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  accountsApiActivityDisplayInfo,
  accountsApiActivityListDisplayInfo,
} from './accountsApiActivityDisplayInfo';
import type { AccountsApiActivity } from '../types/moneyActivity';

jest.mock('../../Card/utils/cardTransactionAmount', () => ({
  formatCardAmount: (
    amount: { value: string; currency: string },
    isDebit?: boolean,
  ) => {
    const sign = isDebit === undefined ? '' : isDebit ? '-' : '+';
    if (amount.currency === 'BRL') {
      return `${sign}R$${amount.value}`;
    }
    return `${sign}$${amount.value}`;
  },
}));

const token = {
  address: '0x754704bc059f8c67012fed69bc8a327a5aafb603' as Hex,
  symbol: 'mUSD',
  decimals: 6,
};

const card: AccountsApiActivity = {
  kind: 'card',
  hash: '0xabc' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token,
  amount: '5381986', // 5.381986
  paidTo: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e' as Hex,
};

const cashback: AccountsApiActivity = {
  kind: 'cashback',
  hash: '0xdef' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token,
  amount: '300000', // 0.30
  receivedFrom: '0xfe80eea4249a1f01095d35e0cf4f37367976a9f0' as Hex,
};

const refund: AccountsApiActivity = {
  kind: 'refund',
  hash: '0xf00' as Hex,
  time: 1780574031000,
  chainId: '0x8f',
  token,
  amount: '10000000', // 10.00
  receivedFrom: '0x8dFE562Cbb4E93D5029f39DA26BB6B501a8d1D3e' as Hex,
};

describe('accountsApiActivityDisplayInfo', () => {
  it('renders a card spend as an outgoing row (negative, Card icon)', () => {
    const info = accountsApiActivityDisplayInfo(card);

    expect(info.isIncoming).toBe(false);
    expect(info.icon).toBe(IconName.Card);
    expect(info.label).toBe('Purchase');
    expect(info.description).toBe('Card');
    expect(info.primaryAmount).toBe('-5.38 mUSD');
    expect(info.fiatAmount).toBe('-$5.38');
  });

  it('renders a cashback credit as an incoming row (positive)', () => {
    const info = accountsApiActivityDisplayInfo(cashback);

    expect(info.isIncoming).toBe(true);
    expect(info.icon).toBe(IconName.Card);
    expect(info.label).toBe('mUSD back');
    expect(info.description).toBe('Card');
    expect(info.primaryAmount).toBe('+0.30 mUSD');
    expect(info.fiatAmount).toBe('+$0.30');
  });

  it('renders a refund as an incoming row (positive, Card icon)', () => {
    const info = accountsApiActivityDisplayInfo(refund);

    expect(info.isIncoming).toBe(true);
    expect(info.icon).toBe(IconName.Card);
    expect(info.label).toBe('Refund');
    expect(info.description).toBe('Card');
    expect(info.primaryAmount).toBe('+10.00 mUSD');
    expect(info.fiatAmount).toBe('+$10.00');
  });

  it('renders a resolved historical mUSD amount in both amount lines', () => {
    const info = accountsApiActivityDisplayInfo({
      ...card,
      displayAmount: {
        type: 'historical',
        value: '968399999',
        decimals: 6,
      },
    });

    expect(info.primaryAmount).toBe('-968.40 mUSD');
    expect(info.fiatAmount).toBe('-$968.40');
    expect(info.showPrimaryAmount).toBe(true);
  });

  it('marks current-rate values as approximate', () => {
    const info = accountsApiActivityDisplayInfo({
      ...cashback,
      displayAmount: {
        type: 'approximate',
        value: '300000',
        decimals: 6,
      },
    });

    expect(info.primaryAmount).toBe('≈+0.30 mUSD');
    expect(info.fiatAmount).toBe('≈+$0.30');
    expect(info.showPrimaryAmount).toBe(true);
  });

  it('renders a muted pending placeholder until the rate is available', () => {
    const info = accountsApiActivityDisplayInfo({
      ...card,
      displayAmount: { type: 'pending' },
    });

    expect(info.primaryAmount).toBe('—');
    expect(info.fiatAmount).toBe('');
    expect(info.showPrimaryAmount).toBe(true);
    expect(info.isPrimaryAmountPending).toBe(true);
  });

  it('shows unavailable instead of relabeling raw shares', () => {
    const info = accountsApiActivityDisplayInfo({
      ...card,
      displayAmount: { type: 'unavailable' },
    });

    expect(info.primaryAmount).toBe('Amount unavailable');
    expect(info.fiatAmount).toBe('');
    expect(info.showPrimaryAmount).toBe(true);
  });

  it('ignores valuation display state on refunds', () => {
    const info = accountsApiActivityDisplayInfo({
      ...refund,
      displayAmount: {
        type: 'historical',
        value: '999999999',
        decimals: 6,
      },
    });

    expect(info.primaryAmount).toBe('+10.00 mUSD');
  });

  it('keeps the mUSD primary line alongside a non-USD merchant amount', () => {
    const enrichment: CardTransaction = {
      id: 'baanx-1',
      providerId: 'baanx',
      timestamp: card.time,
      status: CardTransactionStatus.Completed,
      type: CardTransactionType.Purchase,
      isDebit: true,
      billingAmount: { value: '5.38', currency: 'USD' },
      originalAmount: { value: '27.50', currency: 'BRL' },
      merchant: { name: 'Coffee Shop' },
      fundingSources: [],
    };

    const info = accountsApiActivityDisplayInfo(
      {
        ...card,
        displayAmount: {
          type: 'historical',
          value: '968399999',
          decimals: 6,
        },
      },
      enrichment,
    );

    expect(info.primaryAmount).toBe('-968.40 mUSD');
    expect(info.fiatAmount).toBe('-R$27.50');
    expect(info.showPrimaryAmount).toBe(true);
  });

  it('always shows the fiat amount in USD, regardless of preferred currency', () => {
    // mUSD is USD-pegged; the fiat line is dollars with proper $ formatting.
    const info = accountsApiActivityDisplayInfo(cashback);

    expect(info.primaryAmount).toBe('+0.30 mUSD');
    expect(info.fiatAmount).toBe('+$0.30');
  });

  it('keeps Purchase label and Card icon when enrichment is present', () => {
    const enrichment: CardTransaction = {
      id: 'baanx-1',
      providerId: 'baanx',
      timestamp: card.time,
      status: CardTransactionStatus.Completed,
      type: CardTransactionType.Purchase,
      isDebit: true,
      billingAmount: { value: '5.38', currency: 'USD' },
      originalAmount: { value: '27.50', currency: 'BRL' },
      merchant: { name: 'Coffee Shop' },
      fundingSources: [],
    };

    const info = accountsApiActivityDisplayInfo(card, enrichment);

    expect(info.label).toBe('Purchase');
    expect(info.icon).toBe(IconName.Card);
    expect(info.description).toBe('Coffee Shop');
    expect(info.fiatAmount).toBe('-R$27.50');
  });

  describe('status', () => {
    const settledEnrichment = (
      status: CardTransactionStatus,
    ): CardTransaction => ({
      id: 'baanx-1',
      providerId: 'baanx',
      timestamp: card.time,
      status,
      type: CardTransactionType.Purchase,
      isDebit: true,
      billingAmount: { value: '5.38', currency: 'USD' },
      fundingSources: [{ txHash: card.hash }],
    });

    it('marks a card row as confirmed when there is no enrichment', () => {
      expect(accountsApiActivityDisplayInfo(card).status).toBe('confirmed');
    });

    it.each([
      ['declined', CardTransactionStatus.Failed],
      ['reversed', CardTransactionStatus.Reversed],
    ])(
      'marks a settled but %s card purchase as failed',
      (_label, status: CardTransactionStatus) => {
        // The purchase settled on-chain, so the Accounts-API row looks like
        // any successful spend — only the provider knows it did not stand.
        const info = accountsApiActivityDisplayInfo(
          card,
          settledEnrichment(status),
        );

        expect(info.status).toBe('failed');
      },
    );

    it.each([
      ['completed', CardTransactionStatus.Completed],
      ['pending', CardTransactionStatus.Pending],
    ])(
      'leaves a %s card purchase confirmed',
      (_label, status: CardTransactionStatus) => {
        // A pending authorization that already settled on-chain is final for
        // the Money row; it must not regress into a spinner.
        const info = accountsApiActivityDisplayInfo(
          card,
          settledEnrichment(status),
        );

        expect(info.status).toBe('confirmed');
      },
    );

    it('does not apply a failed enrichment to a refund row', () => {
      const info = accountsApiActivityDisplayInfo(
        refund,
        settledEnrichment(CardTransactionStatus.Failed),
      );

      expect(info.status).toBe('confirmed');
    });
  });
});

describe('accountsApiActivityListDisplayInfo', () => {
  const bankTransfer: AccountsApiActivity = {
    kind: 'bank_transfer',
    hash: '0xbank' as Hex,
    time: 1780574031000,
    chainId: '0x8f',
    token,
    amount: '15000000', // 15.00
    receivedFrom: '0x798eee806e806a0a26bc52526428dd3692217881' as Hex,
    status: 'confirmed',
  };

  it('shows a card purchase as a single outflow dollar amount', () => {
    const info = accountsApiActivityListDisplayInfo(card);

    expect(info.label).toBe('Purchase');
    expect(info.description).toBe('Card');
    expect(info.icon).toBe(IconName.Card);
    expect(info.isIncoming).toBe(false);
    expect(info.fiatAmount).toBe('-$5.38');
    expect(info.showPrimaryAmount).toBe(false);
    expect(info.isFiatAmountMuted).toBe(false);
    expect(info.primaryAmount).toBe('-5.38 mUSD');
  });

  it('shows a historical card valuation as dollars, not the mUSD line', () => {
    const info = accountsApiActivityListDisplayInfo({
      ...card,
      displayAmount: {
        type: 'historical',
        value: '968399999',
        decimals: 6,
      },
    });

    expect(info.fiatAmount).toBe('-$968.40');
    expect(info.showPrimaryAmount).toBe(false);
    expect(info.isFiatAmountMuted).toBe(false);
    expect(info.primaryAmount).toBe('-968.40 mUSD');
  });

  it('keeps the approximate marker on the dollar line', () => {
    const info = accountsApiActivityListDisplayInfo({
      ...cashback,
      displayAmount: {
        type: 'approximate',
        value: '300000',
        decimals: 6,
      },
    });

    expect(info.isIncoming).toBe(true);
    expect(info.fiatAmount).toBe('≈+$0.30');
    expect(info.showPrimaryAmount).toBe(false);
    expect(info.isFiatAmountMuted).toBe(false);
  });

  it('shows cashback and refunds as incoming dollar amounts', () => {
    const cashbackInfo = accountsApiActivityListDisplayInfo(cashback);
    const refundInfo = accountsApiActivityListDisplayInfo(refund);

    expect(cashbackInfo.fiatAmount).toBe('+$0.30');
    expect(cashbackInfo.showPrimaryAmount).toBe(false);
    expect(cashbackInfo.isIncoming).toBe(true);
    expect(refundInfo.fiatAmount).toBe('+$10.00');
    expect(refundInfo.showPrimaryAmount).toBe(false);
    expect(refundInfo.isIncoming).toBe(true);
  });

  it('shows a bank transfer as a single incoming dollar amount', () => {
    const info = accountsApiActivityListDisplayInfo(bankTransfer);

    expect(info.label).toBe('Deposited');
    expect(info.description).toBe('Bank transfer');
    expect(info.isIncoming).toBe(true);
    expect(info.fiatAmount).toBe('+$15.00');
    expect(info.showPrimaryAmount).toBe(false);
    expect(info.isFiatAmountMuted).toBe(false);
    expect(info.primaryAmount).toBe('+15.00 mUSD');
  });

  it('shows the dollar amount for a non-USD merchant and leaves merchant currency on details', () => {
    const enrichedCard: AccountsApiActivity = {
      ...card,
      displayAmount: {
        type: 'historical',
        value: '968399999',
        decimals: 6,
      },
    };
    const enrichment: CardTransaction = {
      id: 'baanx-1',
      providerId: 'baanx',
      timestamp: card.time,
      status: CardTransactionStatus.Completed,
      type: CardTransactionType.Purchase,
      isDebit: true,
      billingAmount: { value: '968.40', currency: 'USD' },
      originalAmount: { value: '27.50', currency: 'BRL' },
      merchant: { name: 'Coffee Shop' },
      fundingSources: [],
    };

    const list = accountsApiActivityListDisplayInfo(enrichedCard, enrichment);
    const details = accountsApiActivityDisplayInfo(enrichedCard, enrichment);

    expect(list.description).toBe('Coffee Shop');
    expect(list.fiatAmount).toBe('-$968.40');
    expect(list.showPrimaryAmount).toBe(false);
    expect(list.isFiatAmountMuted).toBe(false);
    expect(details.primaryAmount).toBe('-968.40 mUSD');
    expect(details.fiatAmount).toBe('-R$27.50');
  });

  it('keeps the pending placeholder when no dollar amount is available', () => {
    const info = accountsApiActivityListDisplayInfo({
      ...card,
      displayAmount: { type: 'pending' },
    });

    expect(info.primaryAmount).toBe('—');
    expect(info.fiatAmount).toBe('');
    expect(info.showPrimaryAmount).toBe(true);
    expect(info.isPrimaryAmountPending).toBe(true);
  });

  it('keeps the unavailable placeholder when the valuation cannot be priced', () => {
    const info = accountsApiActivityListDisplayInfo({
      ...card,
      displayAmount: { type: 'unavailable' },
    });

    expect(info.primaryAmount).toBe('Amount unavailable');
    expect(info.fiatAmount).toBe('');
    expect(info.showPrimaryAmount).toBe(true);
  });

  it('marks a declined purchase failed without switching the dollar amount to the merchant currency', () => {
    const enrichment: CardTransaction = {
      id: 'baanx-1',
      providerId: 'baanx',
      timestamp: card.time,
      status: CardTransactionStatus.Failed,
      type: CardTransactionType.Purchase,
      isDebit: true,
      billingAmount: { value: '5.38', currency: 'USD' },
      originalAmount: { value: '27.50', currency: 'BRL' },
      fundingSources: [],
    };

    const info = accountsApiActivityListDisplayInfo(card, enrichment);

    expect(info.status).toBe('failed');
    expect(info.fiatAmount).toBe('-$5.38');
    expect(info.showPrimaryAmount).toBe(false);
    expect(info.isFiatAmountMuted).toBe(false);
  });
});
