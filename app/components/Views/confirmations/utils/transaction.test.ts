import { Interface } from '@ethersproject/abi';
import { TransactionType } from '@metamask/transaction-controller';
import {
  addMMOriginatedTransaction,
  parseStandardTokenTransactionData,
} from './transaction';
import {
  abiERC721,
  abiERC20,
  abiERC1155,
  abiFiatTokenV2,
} from '@metamask/metamask-eth-abis';

import { upgradeAccountConfirmation } from '../../../../util/test/confirm-data-helpers';
import Engine from '../../../../core/Engine';
import ppomUtil from '../../../../lib/ppom/ppom-util';

jest.mock('../../../../core/Engine', () => ({
  context: {
    TransactionController: {
      addTransaction: jest
        .fn()
        .mockResolvedValue({ transactionMeta: { id: '123' } }),
    },
  },
}));

describe('parseStandardTokenTransactionData', () => {
  const erc20Interface = new Interface(abiERC20);
  const erc721Interface = new Interface(abiERC721);
  const erc1155Interface = new Interface(abiERC1155);
  const usdcInterface = new Interface(abiFiatTokenV2);

  it('returns undefined for undefined input', () => {
    expect(parseStandardTokenTransactionData(undefined)).toBeUndefined();
  });

  it('returns undefined for empty string input', () => {
    expect(parseStandardTokenTransactionData('')).toBeUndefined();
  });

  it('parses ERC20 transfer data correctly', () => {
    // Create ERC20 transfer data
    const recipient = '0x1234567890123456789012345678901234567890';
    const amount = '1000000000000000000'; // 1 token with 18 decimals
    const transferData = erc20Interface.encodeFunctionData('transfer', [
      recipient,
      amount,
    ]);

    const result = parseStandardTokenTransactionData(transferData);

    expect(result).toBeDefined();
    expect(result?.name).toBe('transfer');
    expect(result?.args[0].toLowerCase()).toBe(recipient.toLowerCase());
    expect(result?.args[1].toString()).toBe(amount);
  });

  it('parses ERC721 transferFrom data correctly', () => {
    const from = '0x1234567890123456789012345678901234567890';
    const to = '0x2234567890123456789012345678901234567890';
    const tokenId = '123';
    const transferData = erc721Interface.encodeFunctionData('transferFrom', [
      from,
      to,
      tokenId,
    ]);

    const result = parseStandardTokenTransactionData(transferData);

    expect(result).toBeDefined();
    expect(result?.name).toBe('transferFrom');
    expect(result?.args[0].toLowerCase()).toBe(from.toLowerCase());
    expect(result?.args[1].toLowerCase()).toBe(to.toLowerCase());
    expect(result?.args[2].toString()).toBe(tokenId);
  });

  it('parses ERC1155 safeTransferFrom data correctly', () => {
    const from = '0x1234567890123456789012345678901234567890';
    const to = '0x2234567890123456789012345678901234567890';
    const tokenId = '123';
    const amount = '1';
    const data = '0x';
    const transferData = erc1155Interface.encodeFunctionData(
      'safeTransferFrom',
      [from, to, tokenId, amount, data],
    );

    const result = parseStandardTokenTransactionData(transferData);

    expect(result).toBeDefined();
    expect(result?.name).toBe('safeTransferFrom');
    expect(result?.args[0].toLowerCase()).toBe(from.toLowerCase());
    expect(result?.args[1].toLowerCase()).toBe(to.toLowerCase());
    expect(result?.args[2].toString()).toBe(tokenId);
    expect(result?.args[3].toString()).toBe(amount);
  });

  it('parses USDC transfer data correctly', () => {
    const recipient = '0x1234567890123456789012345678901234567890';
    const amount = '1000000'; // 1 USDC (6 decimals)
    const transferData = usdcInterface.encodeFunctionData('transfer', [
      recipient,
      amount,
    ]);

    const result = parseStandardTokenTransactionData(transferData);

    expect(result).toBeDefined();
    expect(result?.name).toBe('transfer');
    expect(result?.args[0].toLowerCase()).toBe(recipient.toLowerCase());
    expect(result?.args[1].toString()).toBe(amount);
  });

  it('returns undefined for invalid transaction data', () => {
    const invalidData = '0xinvaliddata';
    expect(parseStandardTokenTransactionData(invalidData)).toBeUndefined();
  });

  describe('addTransaction', () => {
    it('call required methods to save and validate transaction', async () => {
      const mockValidateRequest = jest
        .spyOn(ppomUtil, 'validateRequest')
        .mockImplementation(() => Promise.resolve());
      const transactionMeta = await addMMOriginatedTransaction(
        upgradeAccountConfirmation.txParams,
        {
          networkClientId: 'sepolia',
          type: TransactionType.batch,
        },
      );
      expect(transactionMeta.id).toBe('123');
      expect(
        Engine.context.TransactionController.addTransaction,
      ).toHaveBeenCalledTimes(1);
      expect(mockValidateRequest).toHaveBeenCalledTimes(1);
    });
  });
});
