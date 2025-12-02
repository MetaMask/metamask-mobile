import { createStateFixture, deepMerge } from '../stateFixture';
import type { DeepPartial } from '../../renderWithProvider';
import type { RootState } from '../../../../reducers';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../reducers/fiatOrders';
import { DepositOrderType } from '@consensys/native-ramps-sdk';

export interface InitialStateDepositOptions {
  deterministicFiat?: boolean;
  order?: Partial<FiatOrder>;
}

export function buildDefaultDepositOrder(
  overrides?: Partial<FiatOrder>,
): FiatOrder {
  const providerOrderId = 'provider_abcdef123456';
  const base: FiatOrder = {
    id: 'test-order-id-123456',
    provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
    createdAt: Date.now(),
    amount: '100',
    currency: 'USD',
    cryptoAmount: '0.05',
    cryptocurrency: 'USDC',
    fee: '2.50',
    state: FIAT_ORDER_STATES.COMPLETED,
    account: '0x0000000000000000000000000000000000000001',
    network: 'eip155:1',
    excludeFromPurchases: false,
    orderType: DepositOrderType.Deposit,
    // Minimal DepositOrder shape used by the view
    data: {
      provider: 'transak',
      providerOrderId,
      providerOrderLink: 'https://transak.com/order/123',
      network: {
        chainId: 'eip155:1',
        name: 'Ethereum Main Network',
      },
      cryptoCurrency: {
        id: 'usdc-1',
        name: 'USD Coin',
        symbol: 'USDC',
        iconUrl:
          'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
      },
      statusDescription: 'Funds arrived',
    } as unknown as FiatOrder['data'],
  };
  return deepMerge(
    base,
    (overrides || {}) as unknown as Record<string, unknown>,
  );
}

export function initialStateDepositOrderDetails(
  options: InitialStateDepositOptions = {},
) {
  const { deterministicFiat, order } = options;
  const builder = createStateFixture()
    .withMinimalAccounts()
    .withMinimalMainnetNetwork()
    .withMinimalMultichainNetwork(true)
    .withRemoteFeatureFlags({
      enableMultichainAccountsState2: {
        enabled: true,
        featureVersion: '2',
        minimumVersion: '0.0.0',
      },
    })
    .withPreferences({
      smartTransactionsOptInStatus: false,
      useTokenDetection: false,
      useNftDetection: false,
      isIpfsGatewayEnabled: false,
      securityAlertsEnabled: false,
      tokenNetworkFilter: { '0x1': true },
      displayNftMedia: false,
      useSafeChainsListValidation: true,
      showMultiRpcModal: false,
    })
    .withAccountTreeForSelectedAccount()
    .withMinimalKeyringController()
    .withMinimalTransactionController()
    .withMinimalGasFee()
    .withMinimalSmartTransactions()
    .withMinimalTokenRates()
    .withMinimalMultichainAssetsRates()
    .withMinimalMultichainAssets()
    .withMinimalMultichainBalances()
    .withMinimalMultichainTransactions()
    .withRemoteFeatureFlags({});

  if (deterministicFiat) {
    // Reuse existing deterministic controllers provisioning from the fixture helpers
    builder
      .withBridgeRecommendedQuoteEvmSimple({}) // injects CurrencyRateController/TokenRates deterministically
      .withOverrides({
        engine: {
          backgroundState: {
            // Remove BridgeController noise added by helper above
            BridgeController: {
              quoteRequest: {
                srcChainId: undefined,
                srcTokenAddress: undefined,
                destChainId: undefined,
                destTokenAddress: undefined,
                destAddress: undefined,
                srcAmount: undefined,
                slippage: 0.005,
              },
              isInPolling: false,
              quotesLastFetched: 0,
              quotes: [],
              recommendedQuote: undefined,
              quotesLoadingStatus: 'IDLE',
            },
          },
        },
      } as unknown as DeepPartial<RootState>);
  }

  const depositOrder = buildDefaultDepositOrder(order);

  builder.withOverrides({
    fiatOrders: {
      orders: [depositOrder],
    },
    engine: {
      backgroundState: {
        MultichainNetworkController: {
          // Ensure selector-safe defaults exist
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
          networksWithTransactionActivity: {},
          isEvmSelected: true,
        },
      },
    },
  } as unknown as DeepPartial<RootState>);

  return builder;
}
