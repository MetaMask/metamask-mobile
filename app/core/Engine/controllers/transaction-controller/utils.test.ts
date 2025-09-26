import {
  TransactionError,
  TransactionStatus,
  TransactionType,
  GasFeeEstimateType,
  FeeMarketGasFeeEstimates,
  TransactionMeta,
  GasFeeEstimateLevel,
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
import {
  getTransactionTypeValue,
  generateRPCProperties,
  generateDefaultTransactionMetrics,
} from './utils';
// eslint-disable-next-line import/no-namespace
import * as TransactionUtilities from '../../../../util/transactions';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import { IMetaMetricsEvent } from '../../../Analytics/MetaMetrics.types';
import {
  TransactionEventHandlerRequest,
  type TransactionMetrics,
} from './types';

jest.mock('../../../Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(),
  },
}));

jest.mock('../../../../util/address', () => ({
  getAddressAccountType: jest.fn().mockReturnValue('MetaMask'),
  isValidHexAddress: jest.fn().mockReturnValue(true),
}));

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
  const FROM_ADDRESS_MOCK = '0x6D404AfE1a6A07Aa3CbcBf9Fd027671Df628ebFc';
  const mockMetametricsEvent = {
    name: 'test_event',
    category: 'test_category',
  } as unknown as IMetaMetricsEvent;

  const mockTransactionMeta: Partial<TransactionMeta> = {
    chainId: '0x1',
    id: 'test-id-123',
    type: TransactionType.simpleSend,
    gasFeeEstimatesLoaded: true,
    status: 'submitted' as TransactionStatus,
    gasFeeEstimates: {
      type: 'fee-market',
    } as unknown as FeeMarketGasFeeEstimates,
    userFeeLevel: 'medium',
    txParams: {
      authorizationList: [],
      from: FROM_ADDRESS_MOCK,
    },
  };

  const mockMetricsById = {
    'test-id-123': {
      properties: { additional_property: 'test_value' },
      sensitiveProperties: { sensitive_data: 'sensitive_value' },
    } as TransactionMetrics,
  };

  const mockGetState = jest.fn(
    () =>
      ({
        confirmationMetrics: {
          metricsById: mockMetricsById,
        },
      } as unknown as RootState),
  );

  const mockEventHandlerRequest: Partial<TransactionEventHandlerRequest> = {
    getState: mockGetState,
  };

  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    addSensitiveProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue('built-event'),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (MetricsEventBuilder.createEventBuilder as jest.Mock).mockReturnValue(
      mockEventBuilder,
    );
  });

  it('generates default transaction metrics', async () => {
    const result = await generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      mockTransactionMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result).toEqual({
      metametricsEvent: mockMetametricsEvent,
      properties: {
        account_eip7702_upgraded: undefined,
        account_type: 'MetaMask',
        additional_property: 'test_value',
        chain_id: '0x1',
        dapp_host_name: 'N/A',
        eip7702_upgrade_transaction: false,
        gas_estimation_failed: false,
        gas_fee_presented: expect.any(Array),
        gas_fee_selected: 'medium',
        source: 'MetaMask Mobile',
        status: 'submitted',
        transaction_contract_method: [],
        transaction_envelope_type: undefined,
        transaction_internal_id: 'test-id-123',
        transaction_type: 'simple_send',
      },
      sensitiveProperties: {
        from_address: FROM_ADDRESS_MOCK,
        sensitive_data: 'sensitive_value',
        to_address: undefined,
        value: undefined,
      },
    });
  });

  it('generates default transaction metrics if confirmation metrics are not available', async () => {
    mockGetState.mockReturnValueOnce({
      confirmationMetrics: {
        metricsById: {},
      },
    } as unknown as RootState);

    const result = await generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      mockTransactionMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result).toEqual({
      metametricsEvent: mockMetametricsEvent,
      properties: {
        account_eip7702_upgraded: undefined,
        account_type: 'MetaMask',
        chain_id: '0x1',
        dapp_host_name: 'N/A',
        eip7702_upgrade_transaction: false,
        gas_estimation_failed: false,
        gas_fee_presented: expect.any(Array),
        gas_fee_selected: 'medium',
        source: 'MetaMask Mobile',
        status: 'submitted',
        transaction_contract_method: [],
        transaction_envelope_type: undefined,
        transaction_internal_id: 'test-id-123',
        transaction_type: 'simple_send',
      },
      sensitiveProperties: {
        from_address: FROM_ADDRESS_MOCK,
        to_address: undefined,
        value: undefined,
      },
    });
  });

  it('handles transactions with different types', async () => {
    const contractInteractionMeta = {
      ...mockTransactionMeta,
      type: TransactionType.contractInteraction,
    };

    const result = await generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      contractInteractionMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result.properties.transaction_type).toBe('contract_interaction');
  });

  it('handles transactions with undefined type', async () => {
    const undefinedTypeMeta = {
      ...mockTransactionMeta,
      type: undefined,
    };

    const result = await generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      undefinedTypeMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result.properties.transaction_type).toBe('unknown');
  });

  it('adds transaction_contract_method to the metrics', async () => {
    jest.spyOn(TransactionUtilities, 'getMethodData').mockResolvedValue({
      name: 'transfer',
    } as never);

    const result = await generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      mockTransactionMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result.properties.transaction_contract_method).toEqual(['transfer']);
  });

  describe('gas related metrics', () => {
    it('merges gas fee metrics', async () => {
      const customGasMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: false,
        userFeeLevel: 'custom',
      };

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        customGasMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.gas_estimation_failed).toBe(true);
      expect(result.properties.gas_fee_selected).toBe('custom');
      expect(result.properties.gas_fee_presented).toEqual(['custom']);
    });

    it('includes low, medium, high options for FeeMarket and Legacy types', async () => {
      const feeMarketMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: true,
        gasFeeEstimates: {
          type: GasFeeEstimateType.FeeMarket,
        } as unknown as FeeMarketGasFeeEstimates,
      };

      const feeMarketResult = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        feeMarketMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(feeMarketResult.properties.gas_fee_presented).toEqual([
        'custom',
        GasFeeEstimateLevel.Low,
        GasFeeEstimateLevel.Medium,
        GasFeeEstimateLevel.High,
      ]);

      const legacyMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: true,
        gasFeeEstimates: {
          type: GasFeeEstimateType.Legacy,
        } as unknown as FeeMarketGasFeeEstimates,
      };

      const legacyResult = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        legacyMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(legacyResult.properties.gas_fee_presented).toEqual([
        'custom',
        GasFeeEstimateLevel.Low,
        GasFeeEstimateLevel.Medium,
        GasFeeEstimateLevel.High,
      ]);
    });

    it('includes network_proposed option for GasPrice type', async () => {
      const gasPriceMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: true,
        gasFeeEstimates: {
          type: GasFeeEstimateType.GasPrice,
        } as unknown as FeeMarketGasFeeEstimates,
      };

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        gasPriceMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.gas_fee_presented).toEqual([
        'custom',
        'network_proposed',
      ]);
    });

    it('includes dapp_proposed option when dappSuggestedGasFees is present', async () => {
      const dappSuggestedMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: true,
        gasFeeEstimates: {
          type: GasFeeEstimateType.FeeMarket,
        } as unknown as FeeMarketGasFeeEstimates,
        dappSuggestedGasFees: {
          gasPrice: '0x1',
        },
      };

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        dappSuggestedMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.gas_fee_presented).toEqual([
        'custom',
        GasFeeEstimateLevel.Low,
        GasFeeEstimateLevel.Medium,
        GasFeeEstimateLevel.High,
        'dapp_proposed',
      ]);
    });

    it('combines all gas fee options correctly when all conditions are met', async () => {
      const combinedOptionsMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: true,
        gasFeeEstimates: {
          type: GasFeeEstimateType.GasPrice,
        } as unknown as FeeMarketGasFeeEstimates,
        dappSuggestedGasFees: {
          gasPrice: '0x1',
        },
      };

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        combinedOptionsMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.gas_fee_presented).toEqual([
        'custom',
        'network_proposed',
        'dapp_proposed',
      ]);
    });

    it('only includes custom option when gasFeeEstimatesLoaded is false', async () => {
      const noEstimatesMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: false,
        gasFeeEstimates: {
          type: GasFeeEstimateType.FeeMarket,
        } as unknown as FeeMarketGasFeeEstimates,
        dappSuggestedGasFees: {
          gasPrice: '0x1',
        },
      };

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        noEstimatesMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.gas_fee_presented).toEqual(['custom']);
      expect(result.properties.gas_estimation_failed).toBe(true);
    });
  });

  describe('batch transaction metrics', () => {
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
        account_type: 'MetaMask',
        api_method: 'wallet_sendCalls',
        batch_transaction_count: 2,
        batch_transaction_method: 'eip7702',
        chain_id: '0xaa36a7',
        dapp_host_name: 'metamask.github.io',
        eip7702_upgrade_transaction: true,
        error: undefined,
        gas_estimation_failed: true,
        gas_fee_presented: ['custom'],
        gas_fee_selected: undefined,
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
        account_type: 'MetaMask',
        chain_id: '0xaa36a7',
        dapp_host_name: 'metamask',
        eip7702_upgrade_transaction: true,
        error: undefined,
        gas_estimation_failed: true,
        gas_fee_presented: ['custom'],
        gas_fee_selected: undefined,
        source: 'MetaMask Mobile',
        status: 'unapproved',
        transaction_contract_method: [],
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
        account_type: 'MetaMask',
        chain_id: '0xaa36a7',
        dapp_host_name: 'metamask',
        eip7702_upgrade_rejection: true,
        eip7702_upgrade_transaction: true,
        error: undefined,
        gas_estimation_failed: true,
        gas_fee_presented: ['custom'],
        gas_fee_selected: undefined,
        source: 'MetaMask Mobile',
        status: 'rejected',
        transaction_contract_method: [],
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
        account_type: 'MetaMask',
        api_method: 'wallet_sendCalls',
        batch_transaction_count: 2,
        batch_transaction_method: 'eip7702',
        chain_id: '0x1',
        dapp_host_name: 'jumper123.exchange',
        eip7702_upgrade_transaction: false,
        error: undefined,
        gas_estimation_failed: false,
        gas_fee_presented: ['custom', 'low', 'medium', 'high'],
        gas_fee_selected: 'medium',
        source: 'MetaMask Mobile',
        status: 'unapproved',
        transaction_contract_address: [
          '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE',
        ],
        transaction_contract_method: [],
        transaction_envelope_type: '0x2',
        transaction_internal_id: '00e2c3a0-3537-11f0-a6bc-c5da15141f51',
        transaction_type: 'batch',
      });
    });
  });
});
