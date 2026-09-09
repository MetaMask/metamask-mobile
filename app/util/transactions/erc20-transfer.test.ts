import { TransactionType } from '@metamask/transaction-controller';
import {
  decodeErc20Transfer,
  ERC20_TRANSFER_FROM_SELECTOR,
  ERC20_TRANSFER_SELECTOR,
} from './erc20-transfer';

const sender = '0x1111111111111111111111111111111111111111';
const recipient = '0x2222222222222222222222222222222222222222';
const addressSlot = (address: string) =>
  address.slice(2).toLowerCase().padStart(64, '0');
const amountSlot = (amount: bigint) => amount.toString(16).padStart(64, '0');

describe('decodeErc20Transfer', () => {
  it('decodes transfer recipient and amount', () => {
    const data = `${ERC20_TRANSFER_SELECTOR}${addressSlot(
      recipient,
    )}${amountSlot(2_500_000n)}`;

    expect(
      decodeErc20Transfer(data, TransactionType.tokenMethodTransfer),
    ).toEqual({
      recipient,
      amount: '2500000',
    });
  });

  it('decodes transferFrom recipient and amount', () => {
    const data = `${ERC20_TRANSFER_FROM_SELECTOR}${addressSlot(
      sender,
    )}${addressSlot(recipient)}${amountSlot(1_750_000n)}`;

    expect(
      decodeErc20Transfer(data, TransactionType.tokenMethodTransferFrom),
    ).toEqual({
      recipient,
      amount: '1750000',
    });
  });

  it('infers transfer calldata for a Relay child transaction', () => {
    const data = `${ERC20_TRANSFER_SELECTOR}${addressSlot(
      recipient,
    )}${amountSlot(3_000_000n)}`;

    expect(decodeErc20Transfer(data, TransactionType.relayDeposit)).toEqual({
      recipient,
      amount: '3000000',
    });
  });

  it.each([
    [undefined, TransactionType.tokenMethodTransfer],
    ['0x', TransactionType.tokenMethodTransfer],
    [
      `${ERC20_TRANSFER_SELECTOR}${'z'.repeat(128)}`,
      TransactionType.tokenMethodTransfer,
    ],
    [
      `${ERC20_TRANSFER_SELECTOR}${addressSlot(recipient)}${amountSlot(1n)}`,
      TransactionType.tokenMethodTransferFrom,
    ],
  ])('rejects malformed or mismatched calldata', (data, type) => {
    expect(decodeErc20Transfer(data, type)).toBeUndefined();
  });
});
