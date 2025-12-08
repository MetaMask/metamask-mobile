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
import { store } from '../../../../store';
import { NATIVE_TOKEN_ADDRESS } from '../../../../components/Views/confirmations/constants/tokens';

const TOKEN_ADDRESS_MOCK = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const TOKEN_ADDRESS_2_MOCK = '0xdac17f958d2ee523a2206206994597c13d831ec7';

jest.mock('../../../Analytics/MetricsEventBuilder', () => ({
  MetricsEventBuilder: {
    createEventBuilder: jest.fn(),
  },
}));

const mockGetAddressAccountType = jest.fn().mockReturnValue('MetaMask');
const mockIsValidHexAddress = jest.fn().mockReturnValue(true);
const mockIsHardwareAccount = jest.fn().mockReturnValue(false);

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  getAddressAccountType: (...args: unknown[]) =>
    mockGetAddressAccountType(...args),
  isValidHexAddress: (...args: unknown[]) => mockIsValidHexAddress(...args),
  isHardwareAccount: (...args: unknown[]) => mockIsHardwareAccount(...args),
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

jest.mock('../../../../store', () => ({
  store: {
    getState: jest.fn(),
  },
}));

/**
 * Helper function to mock native balance for an address on a specific chain
 */
function mockNativeBalance(
  chainId: string,
  address: string,
  balance: string | undefined,
): void {
  (store.getState as jest.Mock).mockReturnValue({
    engine: {
      backgroundState: {
        AccountTrackerController: {
          accountsByChainId: {
            [chainId]: {
              [address.toLowerCase()]: {
                balance,
              },
            },
          },
        },
      },
    },
  });
}

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

  it.each([
    ['predict_claim', TransactionType.predictClaim],
    ['predict_deposit', TransactionType.predictDeposit],
    ['predict_withdraw', TransactionType.predictWithdraw],
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
      gas: '0x1',
      maxFeePerGas: '0x1',
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
      }) as unknown as RootState,
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

    mockGetAddressAccountType.mockReturnValue('MetaMask');
    mockIsValidHexAddress.mockReturnValue(true);
    mockIsHardwareAccount.mockReturnValue(false);

    mockNativeBalance('0x1', FROM_ADDRESS_MOCK, '0x0000000000000000000');
  });

  it('generates default transaction metrics', async () => {
    const result = await generateDefaultTransactionMetrics(
      mockMetametricsEvent,
      mockTransactionMeta as TransactionMeta,
      mockEventHandlerRequest as TransactionEventHandlerRequest,
    );

    expect(result).toEqual({
      metametricsEvent: mockMetametricsEvent,
      properties: expect.objectContaining({
        account_eip7702_upgraded: undefined,
        account_hardware_type: null,
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
      }),
      sensitiveProperties: {
        sensitive_data: 'sensitive_value',
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
      properties: expect.objectContaining({
        account_eip7702_upgraded: undefined,
        account_hardware_type: null,
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
      }),
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

    describe('gas payment tokens', () => {
      it('includes gas_payment_tokens_available when gasFeeTokens are present', async () => {
        const metaWithGasFeeTokens = {
          ...mockTransactionMeta,
          gasFeeTokens: [
            { symbol: 'USDC', tokenAddress: TOKEN_ADDRESS_MOCK },
            { symbol: 'USDT', tokenAddress: TOKEN_ADDRESS_2_MOCK },
          ],
        };

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          metaWithGasFeeTokens as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_payment_tokens_available).toEqual([
          'USDC',
          'USDT',
        ]);
      });

      it('includes gas_paid_with when selectedGasFeeToken matches a token', async () => {
        const metaWithSelectedToken = {
          ...mockTransactionMeta,
          gasFeeTokens: [
            { symbol: 'USDC', tokenAddress: TOKEN_ADDRESS_MOCK },
            { symbol: 'USDT', tokenAddress: TOKEN_ADDRESS_2_MOCK },
          ],
          selectedGasFeeToken: TOKEN_ADDRESS_MOCK,
        };

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          metaWithSelectedToken as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_paid_with).toBe('USDC');
      });

      it('sets gas_paid_with to pre-funded_ETH when native token is selected', async () => {
        const metaWithNativeToken = {
          ...mockTransactionMeta,
          gasFeeTokens: [
            { symbol: 'USDC', tokenAddress: TOKEN_ADDRESS_MOCK },
            { symbol: 'USDT', tokenAddress: TOKEN_ADDRESS_2_MOCK },
          ],
          selectedGasFeeToken: NATIVE_TOKEN_ADDRESS,
        };

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          metaWithNativeToken as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_paid_with).toBe('pre-funded_ETH');
      });

      it('handles case-insensitive token address matching', async () => {
        const metaWithUppercaseAddress = {
          ...mockTransactionMeta,
          gasFeeTokens: [
            { symbol: 'USDC', tokenAddress: TOKEN_ADDRESS_MOCK.toLowerCase() },
          ],
          selectedGasFeeToken: TOKEN_ADDRESS_MOCK.toUpperCase(),
        };

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          metaWithUppercaseAddress as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_paid_with).toBe('USDC');
      });

      it('sets gas_insufficient_native_asset to false when balance is sufficient', async () => {
        mockNativeBalance('0x1', FROM_ADDRESS_MOCK, '0x1000000000000000000');

        const metaWithLowGas = {
          ...mockTransactionMeta,
          txParams: {
            ...mockTransactionMeta.txParams,
            gas: '0x5208',
            maxFeePerGas: '0x1',
          },
        };

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          metaWithLowGas as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_insufficient_native_asset).toBe(false);
      });

      it('sets gas_insufficient_native_asset to true when balance is insufficient', async () => {
        mockNativeBalance('0x1', FROM_ADDRESS_MOCK, '0x1');

        const metaWithHighGas = {
          ...mockTransactionMeta,
          txParams: {
            ...mockTransactionMeta.txParams,
            gas: '0x100000',
            maxFeePerGas: '0x100000000',
          },
        };

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          metaWithHighGas as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_insufficient_native_asset).toBe(true);
      });

      it('uses gasPrice for max gas cost calculation when maxFeePerGas is not available', async () => {
        mockNativeBalance('0x1', FROM_ADDRESS_MOCK, '0x1');

        const metaWithGasPrice = {
          ...mockTransactionMeta,
          txParams: {
            ...mockTransactionMeta.txParams,
            gas: '0x100000',
            gasPrice: '0x100000000',
            maxFeePerGas: undefined,
          },
        };

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          metaWithGasPrice as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_insufficient_native_asset).toBe(true);
      });

      it('handles missing account balance gracefully', async () => {
        mockNativeBalance('0x1', FROM_ADDRESS_MOCK, undefined);

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          mockTransactionMeta as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_insufficient_native_asset).toBe(true);
      });

      it('returns undefined for gas_paid_with when no token is selected', async () => {
        const metaWithoutSelectedToken = {
          ...mockTransactionMeta,
          gasFeeTokens: [{ symbol: 'USDC', tokenAddress: TOKEN_ADDRESS_MOCK }],
          selectedGasFeeToken: undefined,
        };

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          metaWithoutSelectedToken as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_paid_with).toBeUndefined();
      });

      it('returns undefined for gas_payment_tokens_available when gasFeeTokens is undefined', async () => {
        const metaWithoutGasFeeTokens = {
          ...mockTransactionMeta,
          gasFeeTokens: undefined,
        };

        const result = await generateDefaultTransactionMetrics(
          mockMetametricsEvent,
          metaWithoutGasFeeTokens as TransactionMeta,
          mockEventHandlerRequest as TransactionEventHandlerRequest,
        );

        expect(result.properties.gas_payment_tokens_available).toBeUndefined();
      });
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
            }) as RootState,
        } as TransactionEventHandlerRequest,
      );
      expect(metrics.properties).toEqual(
        expect.objectContaining({
          account_eip7702_upgraded: undefined,
          account_hardware_type: null,
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
        }),
      );
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
            }) as RootState,
        } as TransactionEventHandlerRequest,
      );
      expect(metrics.properties).toEqual(
        expect.objectContaining({
          account_eip7702_upgraded: undefined,
          account_hardware_type: null,
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
        }),
      );
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
            }) as RootState,
        } as TransactionEventHandlerRequest,
      );
      expect(metrics.properties).toEqual(
        expect.objectContaining({
          account_eip7702_upgraded: undefined,
          account_hardware_type: null,
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
        }),
      );
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
            }) as RootState,
        } as TransactionEventHandlerRequest,
      );
      expect(metrics.properties).toEqual(
        expect.objectContaining({
          account_eip7702_upgraded:
            '0x63c0c19a282a1b52b07dd5a65b58948a07dae32b',
          account_hardware_type: null,
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
        }),
      );
    });
  });

  describe('hardware wallet metrics', () => {
    it('sets account_hardware_type to Ledger for Ledger hardware wallet', async () => {
      mockIsHardwareAccount.mockReturnValue(true);
      mockGetAddressAccountType.mockReturnValue('Ledger');

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        mockTransactionMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.account_type).toBe('Ledger');
      expect(result.properties.account_hardware_type).toBe('Ledger');
    });

    it('sets account_hardware_type to QR Hardware for QR hardware wallet', async () => {
      mockIsHardwareAccount.mockReturnValue(true);
      mockGetAddressAccountType.mockReturnValue('QR Hardware');

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        mockTransactionMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.account_type).toBe('QR Hardware');
      expect(result.properties.account_hardware_type).toBe('QR Hardware');
    });

    it('sets account_hardware_type to null for non-hardware wallet', async () => {
      mockIsHardwareAccount.mockReturnValue(false);
      mockGetAddressAccountType.mockReturnValue('MetaMask');

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        mockTransactionMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.account_type).toBe('MetaMask');
      expect(result.properties.account_hardware_type).toBeNull();
    });

    it('sets account_type to unknown when from address is invalid', async () => {
      mockIsValidHexAddress.mockReturnValue(false);

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        mockTransactionMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.account_type).toBe('unknown');
      expect(result.properties.account_hardware_type).toBeNull();
    });

    it('defaults to unknown account_type when getAddressAccountType throws', async () => {
      mockIsValidHexAddress.mockReturnValue(true);
      mockGetAddressAccountType.mockImplementation(() => {
        throw new Error('Wallet locked');
      });

      const result = await generateDefaultTransactionMetrics(
        mockMetametricsEvent,
        mockTransactionMeta as TransactionMeta,
        mockEventHandlerRequest as TransactionEventHandlerRequest,
      );

      expect(result.properties.account_type).toBe('unknown');
      expect(result.properties.account_hardware_type).toBeNull();
    });
  });
});
