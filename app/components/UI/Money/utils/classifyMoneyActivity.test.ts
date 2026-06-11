import {
  type TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { IconName } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import { MUSD_TOKEN_ADDRESS } from '../../Earn/constants/musd';
import {
  classifyMoneyActivity,
  moneyActivityKindToIcon,
  moneyActivityKindToLabel,
  type MoneyActivityKind,
} from './classifyMoneyActivity';

jest.mock('../../../../../locales/i18n', () => ({
  __esModule: true,
  default: { locale: 'en-US' },
  strings: (key: string) => key,
}));

const CHAIN_ID: Hex = '0x1';
const USDC_ADDRESS: Hex = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

function makeTx(extra: Record<string, unknown>): TransactionMeta {
  return {
    id: 'tx-1',
    chainId: CHAIN_ID,
    ...extra,
  } as unknown as TransactionMeta;
}

describe('classifyMoneyActivity', () => {
  it('classifies a crypto moneyAccountDeposit as a conversion', () => {
    const tx = makeTx({
      type: TransactionType.moneyAccountDeposit,
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
    });
    expect(classifyMoneyActivity(tx)).toBe('converted');
  });

  it('classifies a bare moneyAccountDeposit (no pay metadata) as a conversion', () => {
    const tx = makeTx({ type: TransactionType.moneyAccountDeposit });
    expect(classifyMoneyActivity(tx)).toBe('converted');
  });

  it('classifies a fiat on-ramp moneyAccountDeposit as a deposit', () => {
    const tx = makeTx({
      type: TransactionType.moneyAccountDeposit,
      metamaskPay: { fiat: { orderId: 'o-1', provider: 'transak-native' } },
    });
    expect(classifyMoneyActivity(tx)).toBe('deposited');
  });

  it('classifies an mUSD-funded moneyAccountDeposit as a deposit (top-up, not conversion)', () => {
    const tx = makeTx({
      type: TransactionType.moneyAccountDeposit,
      metamaskPay: { tokenAddress: MUSD_TOKEN_ADDRESS, chainId: CHAIN_ID },
    });
    expect(classifyMoneyActivity(tx)).toBe('deposited');
  });

  it('classifies musdConversion as a conversion', () => {
    expect(
      classifyMoneyActivity(makeTx({ type: TransactionType.musdConversion })),
    ).toBe('converted');
  });

  it.each([
    TransactionType.incoming,
    TransactionType.tokenMethodTransfer,
    TransactionType.tokenMethodTransferFrom,
  ])('classifies %s as received', (type) => {
    expect(classifyMoneyActivity(makeTx({ type }))).toBe('received');
  });

  it.each([TransactionType.moneyAccountWithdraw, TransactionType.simpleSend])(
    'classifies %s as sent',
    (type) => {
      expect(classifyMoneyActivity(makeTx({ type }))).toBe('sent');
    },
  );

  it('resolves the nested type for an EIP-7702 batch crypto deposit', () => {
    const tx = makeTx({
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.moneyAccountDeposit }],
    });
    expect(classifyMoneyActivity(tx)).toBe('converted');
  });

  it('resolves the nested type for an EIP-7702 batch withdraw', () => {
    const tx = makeTx({
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.moneyAccountWithdraw }],
    });
    expect(classifyMoneyActivity(tx)).toBe('sent');
  });

  it('falls back to received for a batch with no money-type nested call', () => {
    const tx = makeTx({
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.swap }],
    });
    expect(classifyMoneyActivity(tx)).toBe('received');
  });

  it('defaults an undefined type to deposited', () => {
    expect(classifyMoneyActivity(makeTx({ type: undefined }))).toBe(
      'deposited',
    );
  });

  it('lets an explicit moneyActivityTitleKey override the derived kind', () => {
    const tx = makeTx({
      // A crypto deposit would derive "converted"; the title key wins.
      type: TransactionType.moneyAccountDeposit,
      metamaskPay: { tokenAddress: USDC_ADDRESS, chainId: CHAIN_ID },
      moneyActivityTitleKey: 'added',
    });
    expect(classifyMoneyActivity(tx)).toBe('added');
  });

  it('maps the card_transaction title key to the card kind', () => {
    const tx = makeTx({
      type: TransactionType.moneyAccountWithdraw,
      moneyActivityTitleKey: 'card_transaction',
    });
    expect(classifyMoneyActivity(tx)).toBe('card');
  });
});

describe('moneyActivityKindToLabel / moneyActivityKindToIcon', () => {
  const cases: [MoneyActivityKind, string, IconName][] = [
    ['added', 'money.transaction.added', IconName.Add],
    ['deposited', 'money.transaction.deposited', IconName.Add],
    ['received', 'money.transaction.received', IconName.Arrow2Down],
    ['converted', 'money.transaction.converted', IconName.Refresh],
    ['sent', 'money.transaction.sent', IconName.Arrow2UpRight],
    ['transferred', 'money.transaction.transferred', IconName.SwapHorizontal],
    ['card', 'money.transaction.card_transaction', IconName.Card],
  ];

  it.each(cases)('kind "%s" → label %s, icon %s', (kind, label, icon) => {
    expect(moneyActivityKindToLabel(kind)).toBe(label);
    expect(moneyActivityKindToIcon(kind)).toBe(icon);
  });
});
