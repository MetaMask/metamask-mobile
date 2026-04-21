import {
  TransactionType,
  TransactionMeta,
} from '@metamask/transaction-controller';

import { getTransactionTypeValue } from './base';

describe('getTransactionTypeValue', () => {
  it('returns correct string value for snake case conversion cases', () => {
    expect(getTransactionTypeValue(TransactionType.bridgeApproval)).toBe(
      'bridge_approval',
    );
    expect(getTransactionTypeValue(TransactionType.contractInteraction)).toBe(
      'contract_interaction',
    );
    expect(getTransactionTypeValue(TransactionType.deployContract)).toBe(
      'deploy_contract',
    );
    expect(
      getTransactionTypeValue(TransactionType.ethGetEncryptionPublicKey),
    ).toBe('eth_get_encryption_public_key');
    expect(getTransactionTypeValue(TransactionType.signTypedData)).toBe(
      'eth_sign_typed_data',
    );
    expect(getTransactionTypeValue(TransactionType.simpleSend)).toBe(
      'simple_send',
    );
    expect(getTransactionTypeValue(TransactionType.stakingClaim)).toBe(
      'staking_claim',
    );
    expect(getTransactionTypeValue(TransactionType.stakingDeposit)).toBe(
      'staking_deposit',
    );
    expect(getTransactionTypeValue(TransactionType.stakingUnstake)).toBe(
      'staking_unstake',
    );
    expect(getTransactionTypeValue(TransactionType.perpsAcrossDeposit)).toBe(
      'perps_across_deposit',
    );
    expect(getTransactionTypeValue(TransactionType.predictAcrossDeposit)).toBe(
      'predict_across_deposit',
    );
    expect(getTransactionTypeValue(TransactionType.swapAndSend)).toBe(
      'swap_and_send',
    );
    expect(getTransactionTypeValue(TransactionType.swapApproval)).toBe(
      'swap_approval',
    );
    expect(getTransactionTypeValue(TransactionType.tokenMethodApprove)).toBe(
      'token_method_approve',
    );
    expect(
      getTransactionTypeValue(TransactionType.tokenMethodIncreaseAllowance),
    ).toBe('token_method_increase_allowance');
    expect(
      getTransactionTypeValue(TransactionType.tokenMethodSafeTransferFrom),
    ).toBe('token_method_safe_transfer_from');
    expect(
      getTransactionTypeValue(TransactionType.tokenMethodSetApprovalForAll),
    ).toBe('token_method_set_approval_for_all');
    expect(getTransactionTypeValue(TransactionType.tokenMethodTransfer)).toBe(
      'token_method_transfer',
    );
    expect(
      getTransactionTypeValue(TransactionType.tokenMethodTransferFrom),
    ).toBe('token_method_transfer_from');
  });

  it('returns same value for non-snake case types', () => {
    expect(getTransactionTypeValue(TransactionType.ethDecrypt)).toBe(
      TransactionType.ethDecrypt,
    );
    expect(getTransactionTypeValue(TransactionType.personalSign)).toBe(
      TransactionType.personalSign,
    );
    expect(getTransactionTypeValue(TransactionType.bridge)).toBe(
      TransactionType.bridge,
    );
    expect(getTransactionTypeValue(TransactionType.cancel)).toBe(
      TransactionType.cancel,
    );
    expect(getTransactionTypeValue(TransactionType.incoming)).toBe(
      TransactionType.incoming,
    );
    expect(getTransactionTypeValue(TransactionType.retry)).toBe(
      TransactionType.retry,
    );
    expect(getTransactionTypeValue(TransactionType.smart)).toBe(
      TransactionType.smart,
    );
    expect(getTransactionTypeValue(TransactionType.swap)).toBe(
      TransactionType.swap,
    );
  });

  it('returns "unknown" for undefined type', () => {
    expect(getTransactionTypeValue(undefined)).toBe('unknown');
  });

  it('returns "unknown" for unhandled transaction type', () => {
    expect(getTransactionTypeValue('nonexistentType' as TransactionType)).toBe(
      'unknown',
    );
  });

  it.each([
    ['predict_claim', TransactionType.predictClaim],
    ['predict_deposit', TransactionType.predictDeposit],
    ['predict_withdraw', TransactionType.predictWithdraw],
    ['perps_withdraw', TransactionType.perpsWithdraw],
    ['musd_conversion', TransactionType.musdConversion],
    ['musd_claim', TransactionType.musdClaim],
  ])('returns %s if nested transaction type is %s', (expected, nestedType) => {
    const mockTransactionMeta = {
      type: TransactionType.simpleSend,
      nestedTransactions: [
        {
          type: nestedType,
        },
      ],
    } as TransactionMeta;

    expect(
      getTransactionTypeValue(mockTransactionMeta.type, mockTransactionMeta),
    ).toBe(expected);
  });

  it.each([
    ['perps_deposit_batch', TransactionType.perpsRelayDeposit],
    ['predict_deposit_batch', TransactionType.predictRelayDeposit],
  ])(
    'returns %s for batch transaction with nested %s type',
    (expected, nestedType) => {
      const mockTransactionMeta = {
        type: TransactionType.batch,
        nestedTransactions: [
          { type: TransactionType.tokenMethodApprove },
          { type: nestedType },
        ],
      } as TransactionMeta;

      expect(
        getTransactionTypeValue(mockTransactionMeta.type, mockTransactionMeta),
      ).toBe(expected);
    },
  );

  it.each([
    ['relay_deposit', TransactionType.relayDeposit],
    ['perps_relay_deposit', TransactionType.perpsRelayDeposit],
    ['predict_relay_deposit', TransactionType.predictRelayDeposit],
  ])('returns %s for standalone relay deposit type %s', (expected, txType) => {
    expect(getTransactionTypeValue(txType)).toBe(expected);
  });
});
