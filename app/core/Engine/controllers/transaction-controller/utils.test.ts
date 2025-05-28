import {
  TransactionError,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

import { EIP5792ErrorCode } from '../../../../constants/transaction';
import { MetaMetricsEvents } from '../../../Analytics';
import { RootState } from '../../../../reducers';
import {
  batchApprovalConfirmation,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../util/test/confirm-data-helpers';
import {
  getNetworkRpcUrl,
  extractRpcDomain,
  RpcDomainStatus,
} from '../../../../util/rpc-domain-utils';
import { TransactionEventHandlerRequest } from './types';
import {
  getTransactionTypeValue,
  generateRPCProperties,
  generateDefaultTransactionMetrics,
} from './utils';

jest.mock('../../../../util/rpc-domain-utils', () => ({
  getNetworkRpcUrl: jest.fn(),
  extractRpcDomain: jest.fn(),
  RpcDomainStatus: {
    Invalid: 'invalid',
    Private: 'private',
    Unknown: 'unknown',
  },
}));

describe('getTransactionTypeValue', () => {
  it('should return correct string value for snake case conversion cases', () => {
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

  it('should return same value for non-snake case types', () => {
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

  it('should return "unknown" for undefined type', () => {
    expect(getTransactionTypeValue(undefined)).toBe('unknown');
  });

  it('should return "unknown" for unhandled transaction type', () => {
    expect(getTransactionTypeValue('nonexistentType' as TransactionType)).toBe(
      'unknown',
    );
  });
});

describe('generateRPCProperties', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the correct shape for a known domain', () => {
    (extractRpcDomain as jest.Mock).mockReturnValue('example.com');
    (getNetworkRpcUrl as jest.Mock).mockReturnValue('https://example.com');
    expect(generateRPCProperties('0x1')).toEqual({
      properties: { rpc_domain: 'example.com' },
      sensitiveProperties: {},
    });
  });

  it('returns the correct shape for an invalid domain', () => {
    (extractRpcDomain as jest.Mock).mockReturnValue(RpcDomainStatus.Invalid);
    (getNetworkRpcUrl as jest.Mock).mockReturnValue('invalid-url');
    expect(generateRPCProperties('0x2')).toEqual({
      properties: { rpc_domain: RpcDomainStatus.Invalid },
      sensitiveProperties: {},
    });
  });

  it('returns the correct shape for a private domain', () => {
    (extractRpcDomain as jest.Mock).mockReturnValue(RpcDomainStatus.Private);
    (getNetworkRpcUrl as jest.Mock).mockReturnValue('http://localhost:8545');
    expect(generateRPCProperties('0x3')).toEqual({
      properties: { rpc_domain: RpcDomainStatus.Private },
      sensitiveProperties: {},
    });
  });
});

describe('generateDefaultTransactionMetrics', () => {
  it('generate correct properties for batched confirmation', async () => {
    const metrics = await generateDefaultTransactionMetrics(
      MetaMetricsEvents.TRANSACTIONS_CONFIRM_STARTED,
      upgradeAccountConfirmation,
      {
        getState: () =>
          ({
            confirmationMetrics: {
              metricsById: { [upgradeAccountConfirmation.id]: {} },
            },
          } as RootState),
      } as TransactionEventHandlerRequest,
    );
    expect(metrics.properties).toStrictEqual({
      account_eip7702_upgraded: undefined,
      api_method: 'wallet_sendCalls',
      batch_transaction_count: 2,
      batch_transaction_method: 'eip7702',
      chain_id: '0xaa36a7',
      eip7702_upgrade_transaction: true,
      source: 'MetaMask Mobile',
      status: 'unapproved',
      transaction_contract_address: [],
      transaction_contract_method: [],
      transaction_envelope_type: '0x4',
      transaction_internal_id: 'aa0ff2b0-150f-11f0-9325-8f0b8505bc4f',
      transaction_type: 'batch',
    });
  });

  it('generate correct properties for upgrade only request', async () => {
    const metrics = await generateDefaultTransactionMetrics(
      MetaMetricsEvents.TRANSACTIONS_CONFIRM_STARTED,
      upgradeOnlyAccountConfirmation,
      {
        getState: () =>
          ({
            confirmationMetrics: {
              metricsById: { [upgradeOnlyAccountConfirmation.id]: {} },
            },
          } as RootState),
      } as TransactionEventHandlerRequest,
    );
    expect(metrics.properties).toStrictEqual({
      account_eip7702_upgraded: undefined,
      chain_id: '0xaa36a7',
      eip7702_upgrade_transaction: true,
      source: 'MetaMask Mobile',
      status: 'unapproved',
      transaction_envelope_type: '0x4',
      transaction_internal_id: 'aa0ff2b0-150f-11f0-9325-8f0b8505bc4f',
      transaction_type: 'batch',
    });
  });

  it('generate correct properties for rejected upgrade request', async () => {
    const metrics = await generateDefaultTransactionMetrics(
      MetaMetricsEvents.TRANSACTIONS_CONFIRM_STARTED,
      {
        ...upgradeOnlyAccountConfirmation,
        status: TransactionStatus.rejected,
        error: {
          code: EIP5792ErrorCode.RejectedUpgrade as unknown as string,
        } as TransactionError,
      },
      {
        getState: () =>
          ({
            confirmationMetrics: {
              metricsById: { [upgradeOnlyAccountConfirmation.id]: {} },
            },
          } as RootState),
      } as TransactionEventHandlerRequest,
    );
    expect(metrics.properties).toStrictEqual({
      account_eip7702_upgraded: undefined,
      source: 'MetaMask Mobile',
      chain_id: '0xaa36a7',
      eip7702_upgrade_rejection: true,
      eip7702_upgrade_transaction: true,
      status: 'rejected',
      transaction_envelope_type: '0x4',
      transaction_internal_id: 'aa0ff2b0-150f-11f0-9325-8f0b8505bc4f',
      transaction_type: 'batch',
    });
  });

  it('generate correct properties for batched approval request', async () => {
    const metrics = await generateDefaultTransactionMetrics(
      MetaMetricsEvents.TRANSACTIONS_CONFIRM_STARTED,
      batchApprovalConfirmation,
      {
        getState: () =>
          ({
            confirmationMetrics: {
              metricsById: { [batchApprovalConfirmation.id]: {} },
            },
          } as RootState),
      } as TransactionEventHandlerRequest,
    );
    expect(metrics.properties).toStrictEqual({
      account_eip7702_upgraded: '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
      source: 'MetaMask Mobile',
      api_method: 'wallet_sendCalls',
      batch_transaction_count: 2,
      batch_transaction_method: 'eip7702',
      chain_id: '0x1',
      eip7702_upgrade_transaction: false,
      status: 'unapproved',
      transaction_envelope_type: '0x2',
      transaction_contract_address: [
        '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
      ],
      transaction_contract_method: [],
      transaction_internal_id: '00e2c3a0-3537-11f0-a6bc-c5da15141f51',
      transaction_type: 'batch',
    });
  });
});
