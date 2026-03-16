import { Interface } from '@ethersproject/abi';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  addMMOriginatedTransaction,
  get4ByteCode,
  hasTransactionType,
  isTransactionPayWithdraw,
  parseStandardTokenTransactionData,
} from './transaction';
import {
  abiERC721,
  abiERC20,
  abiERC1155,
  abiFiatTokenV2,
} from '@metamask/metamask-eth-abis';

import {
  buildPermit2ApproveTransactionData,
  upgradeAccountConfirmation,
} from '../../../../util/test/confirm-data-helpers';
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

  it('parses permit 2 approval data correctly', () => {
    const SPENDER_MOCK = '0x0c54FcCd2e384b4BB6f2E405Bf5Cbc15a017AaFb';
    const TOKEN_ADDRESS_MOCK = '0x1234567890abcdef1234567890abcdef12345678';
    const AMOUNT_MOCK = 123;
    const EXPIRATION_MOCK = 456;
    const permit2Data = buildPermit2ApproveTransactionData(
      SPENDER_MOCK,
      TOKEN_ADDRESS_MOCK,
      AMOUNT_MOCK,
      EXPIRATION_MOCK,
    );
    const result = parseStandardTokenTransactionData(permit2Data);

    expect(result).toBeDefined();
    expect(result?.name).toBe('approve');
    expect(result?.signature).toBe('approve(address,address,uint160,uint48)');
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

describe('get4ByteCode', () => {
  it('returns the 4 byte code for a given transaction data', () => {
    const transactionData = '0x1234567811111111111111111111111111111111';
    const result = get4ByteCode(transactionData);
    expect(result).toBe('0x12345678');
  });
});

describe('hasTransactionType', () => {
  it('returns true if transaction type matches', () => {
    const txMeta = {
      type: TransactionType.simpleSend,
    } as TransactionMeta;

    expect(
      hasTransactionType(txMeta, [
        TransactionType.bridge,
        TransactionType.simpleSend,
      ]),
    ).toBe(true);
  });

  it('returns true if nested transaction type matches', () => {
    const txMeta = {
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.simpleSend }],
    } as TransactionMeta;

    expect(
      hasTransactionType(txMeta, [
        TransactionType.bridge,
        TransactionType.simpleSend,
      ]),
    ).toBe(true);
  });

  it('returns false if neither transaction type nor nested transaction types match', () => {
    const txMeta = {
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.bridge }],
    } as TransactionMeta;

    expect(
      hasTransactionType(txMeta, [
        TransactionType.simpleSend,
        TransactionType.cancel,
      ]),
    ).toBe(false);
  });
});

describe('isTransactionPayWithdraw', () => {
  it('returns true for predictWithdraw transaction type', () => {
    const txMeta = {
      type: TransactionType.predictWithdraw,
    } as TransactionMeta;

    expect(isTransactionPayWithdraw(txMeta)).toBe(true);
  });

  it('returns false for non-withdrawal transaction types', () => {
    const txMeta = {
      type: TransactionType.simpleSend,
    } as TransactionMeta;

    expect(isTransactionPayWithdraw(txMeta)).toBe(false);
  });

  it('returns false for deposit transaction types', () => {
    const txMeta = {
      type: TransactionType.predictDeposit,
    } as TransactionMeta;

    expect(isTransactionPayWithdraw(txMeta)).toBe(false);
  });

  it('returns true when nested transaction is a withdrawal type', () => {
    const txMeta = {
      type: TransactionType.batch,
      nestedTransactions: [{ type: TransactionType.predictWithdraw }],
    } as TransactionMeta;

    expect(isTransactionPayWithdraw(txMeta)).toBe(true);
  });

  it('returns false for undefined transaction', () => {
    expect(isTransactionPayWithdraw(undefined)).toBe(false);
  });
});
