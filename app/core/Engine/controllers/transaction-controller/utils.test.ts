import { TransactionType } from '@metamask/transaction-controller';
import { getTransactionTypeValue, generateRPCProperties } from './utils';
import { getNetworkRpcUrl, extractRpcDomain, RpcDomainStatus } from '../../../../util/rpc-domain-utils';

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
