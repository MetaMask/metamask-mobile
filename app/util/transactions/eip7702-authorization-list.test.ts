import { Common, Hardfork } from '@ethereumjs/common';
import { TransactionFactory, TransactionType } from '@ethereumjs/tx';
import type { Hex } from '@metamask/utils';

const POLYGON_CHAIN_ID = 137;

const buildTransaction = (nonce: string) =>
  TransactionFactory.fromTxData(
    {
      type: '0x4',
      chainId: '0x89',
      nonce: '0x0',
      to: '0x97d7c291acd424bafec5496e5907009d163e24d0',
      value: '0x0',
      data: '0x',
      gasLimit: '0x5208',
      maxFeePerGas: '0x5f36d75adb',
      maxPriorityFeePerGas: '0x119daffb00',
      authorizationList: [
        {
          chainId: '0x89',
          address: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
          // The patch fixes the runtime; the 5.4.0 types still describe a list.
          nonce: nonce as unknown as Hex[],
          yParity: '0x',
          r: '0x92a33b87033e778e501312be23e7013968340fa6cf9471970479d128a45567eb',
          s: '0x31141a6d485c6b894f50fb15b00223076a8e4eb0efa2f74835fb45bf00a98462',
        },
      ],
    },
    {
      common: Common.custom(
        { chainId: POLYGON_CHAIN_ID, defaultHardfork: Hardfork.Prague },
        { eips: [7702] },
      ),
    },
  );

describe('EIP-7702 authorization list', () => {
  it('builds a transaction whose authorization has a single nonce', () => {
    const transaction = buildTransaction('0x01');

    expect(transaction.type).toBe(TransactionType.EOACodeEIP7702);
    expect(transaction.toJSON().authorizationList?.[0].nonce).toBe('0x01');
  });

  it('builds a transaction whose authorization nonce is zero', () => {
    const transaction = buildTransaction('0x');

    expect(transaction.toJSON().authorizationList?.[0].nonce).toBe('0x');
  });
});
