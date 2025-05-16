import {
  GasFeeEstimateType,
  FeeMarketGasFeeEstimates,
  TransactionMeta,
  TransactionStatus,
  TransactionType,
  GasFeeEstimateLevel,
} from '@metamask/transaction-controller';

import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';
import { IMetaMetricsEvent } from '../../../Analytics/MetaMetrics.types';
import {
  generateDefaultTransactionMetrics,
  getTransactionTypeValue,
} from './utils';
import {
  TransactionEventHandlerRequest,
  type TransactionMetrics,
} from './types';
import { RootState } from '../../../../reducers';

jest.mock('../../../Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(),
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

describe('generateDefaultTransactionMetrics', () => {
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

  it('generates default transaction metrics', () => {
    const result = generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      mockTransactionMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result).toEqual({
      metametricsEvent: mockMetametricsEvent,
      properties: {
        chain_id: '0x1',
        gas_estimation_failed: false,
        gas_fee_presented: expect.any(Array),
        gas_fee_selected: 'medium',
        transaction_internal_id: 'test-id-123',
        transaction_type: 'simple_send',
        status: 'submitted',
        additional_property: 'test_value',
      },
      sensitiveProperties: {
        sensitive_data: 'sensitive_value',
      },
    });
  });

  it('generates default transaction metrics if confirmation metrics are not available', () => {
    mockGetState.mockReturnValueOnce({
      confirmationMetrics: {
        metricsById: {},
      },
    } as unknown as RootState);

    const result = generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      mockTransactionMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result).toEqual({
      metametricsEvent: mockMetametricsEvent,
      properties: {
        chain_id: '0x1',
        gas_estimation_failed: false,
        gas_fee_presented: expect.any(Array),
        gas_fee_selected: 'medium',
        transaction_internal_id: 'test-id-123',
        transaction_type: 'simple_send',
        status: 'submitted',
      },
    });
  });

  it('handles transactions with different types', () => {
    const contractInteractionMeta = {
      ...mockTransactionMeta,
      type: TransactionType.contractInteraction,
    };

    const result = generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      contractInteractionMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result.properties.transaction_type).toBe('contract_interaction');
  });

  it('handles transactions with undefined type', () => {
    const undefinedTypeMeta = {
      ...mockTransactionMeta,
      type: undefined,
    };

    const result = generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      undefinedTypeMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result.properties.transaction_type).toBe('unknown');
  });

  describe('gas related metrics', () => {
    it('merges gas fee metrics', () => {
      const customGasMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: false,
        userFeeLevel: 'custom',
      };

      const result = generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        customGasMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.gas_estimation_failed).toBe(true);
      expect(result.properties.gas_fee_selected).toBe('custom');
      expect(result.properties.gas_fee_presented).toEqual(['custom']);
    });

    it('includes low, medium, high options for FeeMarket and Legacy types', () => {
      // Test FeeMarket type
      const feeMarketMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: true,
        gasFeeEstimates: {
          type: GasFeeEstimateType.FeeMarket,
        } as unknown as FeeMarketGasFeeEstimates,
      };

      const feeMarketResult = generateDefaultTransactionMetrics(
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

      // Test Legacy type
      const legacyMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: true,
        gasFeeEstimates: {
          type: GasFeeEstimateType.Legacy,
        } as unknown as FeeMarketGasFeeEstimates,
      };

      const legacyResult = generateDefaultTransactionMetrics(
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

    it('includes network_proposed option for GasPrice type', () => {
      const gasPriceMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: true,
        gasFeeEstimates: {
          type: GasFeeEstimateType.GasPrice,
        } as unknown as FeeMarketGasFeeEstimates,
      };

      const result = generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        gasPriceMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.gas_fee_presented).toEqual([
        'custom',
        'network_proposed',
      ]);
    });

    it('includes dapp_proposed option when dappSuggestedGasFees is present', () => {
      const dappSuggestedMeta = {
        ...mockTransactionMeta,
        gasFeeEstimatesLoaded: true,
        gasFeeEstimates: {
          type: GasFeeEstimateType.FeeMarket,
        } as unknown as FeeMarketGasFeeEstimates,
        dappSuggestedGasFees: {
          // Values don't matter for this test, just need a non-null object
          gasPrice: '0x1',
        },
      };

      const result = generateDefaultTransactionMetrics(
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

    it('combines all gas fee options correctly when all conditions are met', () => {
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

      const result = generateDefaultTransactionMetrics(
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

    it('only includes custom option when gasFeeEstimatesLoaded is false', () => {
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

      const result = generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        noEstimatesMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.gas_fee_presented).toEqual(['custom']);
      expect(result.properties.gas_estimation_failed).toBe(true);
    });
  });
});
