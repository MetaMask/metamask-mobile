import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { createBridgeTestState } from '../../testUtils';
import { useAutoUpgradeEIP7702Account } from '../../hooks/useAutoUpgradeEIP7702Account';
import { useEIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';
import { useFiatToUsdRate } from '../../hooks/useFiatToUsdRate';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { recurringOrdersApiClient } from '../../api/recurringOrders.client';
import {
  createMockPrepareRecurringDelegationResponse,
  MOCK_RECURRING_OPEN_ORDER,
  MOCK_RECURRING_PREPARE_QUERY,
} from '../../api/recurringOrders.mock';
import { showRecurringOrderCreatedToast } from './RecurringConfirmOrderSheet.utils';
import { RecurringConfirmOrderSheetScreen } from './RecurringConfirmOrderSheetScreen';
import {
  FeatureId,
  MetaMetricsSwapsEventSource,
  MetricsSwapType,
} from '@metamask/bridge-controller';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { OrderType } from '../../types/advancedOrders';
import { useCreateRecurringOrder } from '../../hooks/useCreateRecurringOrder';
import { signLimitOrderDelegations } from '../../utils/limitOrders/signLimitOrderDelegations';
import { getRecurringOrderDelegationParams } from '../../utils/recurringOrders/getRecurringOrderDelegationParams';
import { showGenericErrorToast } from '../../utils/showGenericErrorToast';
import {
  finishRecurringOrderTrace,
  startRecurringOrderCreateTrace,
} from '../../utils/recurringOrderTrace';
import { TraceName } from '../../../../../util/trace';

const expectAdvancedOrderProperties = (
  event: { category: string },
  properties: {
    location: string;
    feature_id: FeatureId;
    order_type: OrderType;
    error?: string;
  } & Record<string, unknown>,
) => {
  const { createEventBuilder } = useAnalytics();

  expect(createEventBuilder).toHaveBeenCalledWith(event);
  const callIndex = jest
    .mocked(createEventBuilder)
    .mock.calls.map((call) => call[0])
    .lastIndexOf(event);
  const added = jest.mocked(createEventBuilder).mock.results[callIndex].value
    .addProperties.mock.calls[0][0] as Record<string, unknown>;

  expect(added).toEqual(properties);
  expect(added).toHaveProperty('order_type');
  expect(added).not.toHaveProperty('type');
  expect(added).not.toHaveProperty('orderType');
};

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockAutoUpgradeEIP7702Account = jest.fn();
const mockCreateRecurringOrder = jest.fn();

jest.mock('../../../../../core/Engine', () => ({
  context: {
    BridgeController: {
      resetState: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  BridgeQuoteDataProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useBridgeQuoteDataContext: jest.fn(),
}));

const mockActiveQuote = {
  quote: {
    requestId: 'quote-1',
    aggregator: 'lifi',
    protocols: ['uniswap'],
    gasIncluded: true,
    gasIncluded7702: false,
    dest: { usd: '99.5' },
    feeData: { network: [{ usd: '0.42' }] },
    priceData: { priceImpact: { amount: '0.0031' } },
  },
  estimatedProcessingTimeInSeconds: 90,
};

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../hooks/useAutoUpgradeEIP7702Account', () => ({
  useAutoUpgradeEIP7702Account: jest.fn(),
}));

jest.mock('../../hooks/useEIP7702UpgradeFee', () => ({
  useEIP7702UpgradeFee: jest.fn(),
}));

jest.mock('../../hooks/useFiatToUsdRate', () => ({
  useFiatToUsdRate: jest.fn(),
}));

jest.mock('../../api/recurringOrders.client', () => ({
  recurringOrdersApiClient: {
    prepareRecurringDelegation: jest.fn(),
  },
}));

jest.mock('../../hooks/useCreateRecurringOrder', () => ({
  useCreateRecurringOrder: jest.fn(),
}));

jest.mock('../../utils/limitOrders/signLimitOrderDelegations', () => ({
  signLimitOrderDelegations: jest.fn(),
}));

jest.mock('../../utils/recurringOrderTrace', () => ({
  finishRecurringOrderTrace: jest.fn(),
  startRecurringOrderCreateTrace: jest.fn(),
}));

jest.mock(
  '../../utils/recurringOrders/getRecurringOrderDelegationParams',
  () => ({
    getRecurringOrderDelegationParams: jest.fn(),
  }),
);

jest.mock('../../utils/showGenericErrorToast', () => ({
  showGenericErrorToast: jest.fn(),
}));

jest.mock('./RecurringConfirmOrderSheet.utils', () => ({
  showRecurringOrderCreatedToast: jest.fn(),
}));

jest.mock('./RecurringConfirmOrderSheet', () => ({
  __esModule: true,
  default: ({
    delegationFee,
    isPriceRangeConversionReady,
    isSubmitting,
    onConfirm,
    onDelegationFeeInfoPress,
    goBack,
  }: {
    delegationFee: { status: string };
    isPriceRangeConversionReady: boolean;
    isSubmitting: boolean;
    onConfirm: () => void;
    onDelegationFeeInfoPress: () => void;
    goBack: () => void;
  }) => {
    const ReactModule = jest.requireActual<typeof React>('react');
    const { Pressable, Text } =
      jest.requireActual<typeof import('react-native')>('react-native');

    return ReactModule.createElement(
      ReactModule.Fragment,
      null,
      ReactModule.createElement(
        Text,
        { testID: 'delegation-fee-status' },
        delegationFee.status,
      ),
      ReactModule.createElement(
        Pressable,
        {
          testID: 'confirm-order',
          onPress: onConfirm,
          disabled: !isPriceRangeConversionReady,
          accessibilityState: {
            disabled: !isPriceRangeConversionReady,
          },
        },
        ReactModule.createElement(
          Text,
          null,
          isSubmitting ? 'Submitting' : 'Confirm',
        ),
      ),
      ReactModule.createElement(
        Pressable,
        {
          testID: 'delegation-fee-info',
          onPress: onDelegationFeeInfoPress,
        },
        ReactModule.createElement(Text, null, 'Delegation fee info'),
      ),
      ReactModule.createElement(
        Pressable,
        { testID: 'close-confirm', onPress: goBack },
        ReactModule.createElement(Text, null, 'Close confirm'),
      ),
    );
  },
}));

const sourceToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
};

const destToken = {
  address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  chainId: '0xa' as Hex,
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
};

const EXPECTED_TOKEN_PROPERTIES = {
  chain_id_source: 'eip155:1',
  chain_id_destination: 'eip155:10',
  token_symbol_source: 'ETH',
  token_symbol_destination: 'USDC',
  token_address_source: 'eip155:1/slip44:60',
  token_address_destination:
    'eip155:10/erc20:0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  token_security_type_destination: null,
  swap_type: MetricsSwapType.CROSSCHAIN,
  provider: 'lifi_uniswap',
  usd_quoted_gas: 0.42,
  usd_quoted_return: 99.5,
  quoted_time_minutes: 1.5,
  gas_included: true,
  gas_included_7702: false,
  price_impact: 0.0031,
};

const configuredRecurringState = {
  everyValue: '2',
  everyUnit: 'day' as const,
  repeatCount: '4',
  priceRange: {
    tokenSide: 'source' as const,
    currency: 'USD' as const,
    min: '1000',
    max: '2000',
  },
};

function renderScreen(
  bridgeReducerOverrides: NonNullable<
    Parameters<typeof createBridgeTestState>[0]
  >['bridgeReducerOverrides'] = {},
  currentCurrency: 'usd' | 'eur' = 'usd',
) {
  const state = createBridgeTestState({
    bridgeReducerOverrides: {
      sourceToken,
      destToken,
      ...bridgeReducerOverrides,
    },
  });

  return renderWithProvider(<RecurringConfirmOrderSheetScreen />, {
    state: {
      ...state,
      engine: {
        ...state.engine,
        backgroundState: {
          ...state.engine?.backgroundState,
          AssetsController: {
            ...state.engine?.backgroundState?.AssetsController,
            selectedCurrency: currentCurrency,
          },
        },
      },
    },
  });
}

describe('RecurringConfirmOrderSheetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useEIP7702UpgradeFee).mockReturnValue({
      status: 'not-required',
      retry: jest.fn(),
    });
    jest.mocked(useAutoUpgradeEIP7702Account).mockReturnValue({
      autoUpgradeEIP7702Account: mockAutoUpgradeEIP7702Account,
      getUpgradeStatus: jest.fn(),
    });
    mockAutoUpgradeEIP7702Account.mockResolvedValue(undefined);
    jest.mocked(useFiatToUsdRate).mockReturnValue(1);
    jest.mocked(useParams).mockReturnValue({
      location: MetaMetricsSwapsEventSource.TokenView,
    });
    jest.mocked(useBridgeQuoteDataContext).mockReturnValue({
      activeQuote: mockActiveQuote,
    } as never);
    jest
      .mocked(getRecurringOrderDelegationParams)
      .mockReturnValue(MOCK_RECURRING_PREPARE_QUERY);
    const prepareResponse = createMockPrepareRecurringDelegationResponse(
      MOCK_RECURRING_PREPARE_QUERY,
    );
    jest
      .mocked(recurringOrdersApiClient.prepareRecurringDelegation)
      .mockResolvedValue(prepareResponse);
    jest
      .mocked(signLimitOrderDelegations)
      .mockResolvedValue(prepareResponse.delegations);
    mockCreateRecurringOrder.mockResolvedValue({
      order: MOCK_RECURRING_OPEN_ORDER,
    });
    jest.mocked(useCreateRecurringOrder).mockReturnValue({
      createRecurringOrder: mockCreateRecurringOrder,
      isSubmitting: false,
      error: null,
      reset: jest.fn(),
    });
    jest.mocked(startRecurringOrderCreateTrace).mockReturnValue({
      id: 'create-trace-id',
      name: TraceName.RecurringOrderCreate,
    });
  });

  it('opens the delegation fee info modal above the confirmation modal', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('delegation-fee-info'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_DELEGATION_FEE_INFO_MODAL,
    });
  });

  it('passes the delegation fee estimate to the confirmation sheet', () => {
    jest.mocked(useEIP7702UpgradeFee).mockReturnValue({
      status: 'ready',
      displayFee: '$1.23',
      preciseNativeFeeInHex: '0x1',
      retry: jest.fn(),
    });

    const { getByTestId } = renderScreen();

    expect(getByTestId('delegation-fee-status')).toHaveTextContent('ready');
  });

  it('passes modal navigation dismissal to the confirmation sheet', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('close-confirm'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('waits for auto-upgrade before submitting the recurring order', async () => {
    let resolveUpgrade: () => void = () => undefined;
    mockAutoUpgradeEIP7702Account.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpgrade = resolve;
        }),
    );
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('confirm-order'));

    expect(mockAutoUpgradeEIP7702Account).toHaveBeenCalledWith();
    expect(mockCreateRecurringOrder).not.toHaveBeenCalled();
    expect(getByTestId('confirm-order')).toHaveTextContent('Submitting');

    resolveUpgrade();

    await waitFor(() => {
      expect(mockCreateRecurringOrder).toHaveBeenCalledTimes(1);
      expect(showRecurringOrderCreatedToast).toHaveBeenCalledTimes(1);
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('prepares, signs, and creates the live order in sequence', async () => {
    const { getByTestId } = renderScreen({
      recurring: configuredRecurringState,
      sourceAmount: '1',
    });

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(mockCreateRecurringOrder).toHaveBeenCalledTimes(1);
    });
    const prepareResponse = createMockPrepareRecurringDelegationResponse(
      MOCK_RECURRING_PREPARE_QUERY,
    );
    expect(
      recurringOrdersApiClient.prepareRecurringDelegation,
    ).toHaveBeenCalledWith(MOCK_RECURRING_PREPARE_QUERY);
    expect(signLimitOrderDelegations).toHaveBeenCalledWith(
      prepareResponse.delegations,
    );
    expect(mockCreateRecurringOrder).toHaveBeenCalledWith({
      accountAddress: MOCK_RECURRING_PREPARE_QUERY.accountAddress,
      clientOrderId: MOCK_RECURRING_PREPARE_QUERY.clientOrderId,
      src: {
        assetId: MOCK_RECURRING_PREPARE_QUERY.srcAssetId,
        amount: MOCK_RECURRING_PREPARE_QUERY.srcAmount,
      },
      dest: {
        assetId: MOCK_RECURRING_PREPARE_QUERY.destAssetId,
      },
      priceTolerance: 3,
      schedule: {
        every: MOCK_RECURRING_PREPARE_QUERY.every,
        unit: MOCK_RECURRING_PREPARE_QUERY.unit,
        repeatCount: MOCK_RECURRING_PREPARE_QUERY.repeatCount,
      },
      priceRange: {
        side: 'src',
        currency: 'USD',
        min: '1000',
        max: '2000',
      },
      delegations: prepareResponse.delegations,
    });
    expect(
      mockAutoUpgradeEIP7702Account.mock.invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(recurringOrdersApiClient.prepareRecurringDelegation).mock
        .invocationCallOrder[0],
    );
    expect(
      jest.mocked(recurringOrdersApiClient.prepareRecurringDelegation).mock
        .invocationCallOrder[0],
    ).toBeLessThan(
      jest.mocked(signLimitOrderDelegations).mock.invocationCallOrder[0],
    );
    expect(
      jest.mocked(signLimitOrderDelegations).mock.invocationCallOrder[0],
    ).toBeLessThan(mockCreateRecurringOrder.mock.invocationCallOrder[0]);
    expect(finishRecurringOrderTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'create-trace-id' }),
      { result: 'success' },
    );
  });

  it('includes the recurring price tolerance override', async () => {
    const { getByTestId } = renderScreen({
      recurring: configuredRecurringState,
      sourceAmount: '1',
      recurringPriceTolerance: '0.75',
    });

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(mockCreateRecurringOrder).toHaveBeenCalledWith(
        expect.objectContaining({ priceTolerance: 0.75 }),
      );
    });
  });

  it('submits when the EUR-to-USD conversion is available', async () => {
    jest.mocked(useFiatToUsdRate).mockReturnValue(1.08);
    const { getByTestId } = renderScreen(
      {
        recurring: {
          ...configuredRecurringState,
          priceRange: {
            tokenSide: 'source',
            currency: 'EUR',
            min: '1000',
            max: '2000',
          },
        },
      },
      'eur',
    );

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(mockCreateRecurringOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: {
            side: 'src',
            currency: 'USD',
            min: '1080',
            max: '2160',
          },
        }),
      );
    });
  });

  it('disables submission while a non-USD conversion rate is unavailable', () => {
    jest.mocked(useFiatToUsdRate).mockReturnValue(undefined);
    const { getByTestId } = renderScreen(
      {
        recurring: {
          ...configuredRecurringState,
          priceRange: {
            tokenSide: 'source',
            currency: 'EUR',
            min: '1000',
            max: '2000',
          },
        },
      },
      'eur',
    );

    const confirmButton = getByTestId('confirm-order');
    fireEvent.press(confirmButton);

    expect(confirmButton.props.accessibilityState.disabled).toBe(true);
    expect(mockAutoUpgradeEIP7702Account).not.toHaveBeenCalled();
    expect(mockCreateRecurringOrder).not.toHaveBeenCalled();
  });

  it('resets shared market inputs while preserving recurring fields', async () => {
    const { getByTestId, store } = renderScreen({
      balanceRefreshKey: 3,
      destAmount: '10',
      isMaxSourceAmount: true,
      recurring: configuredRecurringState,
      selectedQuoteRequestId: 'quote-id',
      sourceAmount: '1',
    });

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
    expect(store.getState().bridge).toEqual(
      expect.objectContaining({
        balanceRefreshKey: 4,
        destAmount: undefined,
        isMaxSourceAmount: false,
        recurring: configuredRecurringState,
        selectedQuoteRequestId: undefined,
        sourceAmount: undefined,
      }),
    );
  });

  it('surfaces upgrade failures without submitting', async () => {
    const error = new Error('Upgrade failed');
    mockAutoUpgradeEIP7702Account.mockRejectedValue(error);
    const { getByTestId, store } = renderScreen({
      recurring: configuredRecurringState,
      sourceAmount: '1',
    });

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(showGenericErrorToast).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateRecurringOrder).not.toHaveBeenCalled();
    expect(showRecurringOrderCreatedToast).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(store.getState().bridge.recurring).toEqual(configuredRecurringState);
    expect(store.getState().bridge.sourceAmount).toBe('1');
    expect(getByTestId('confirm-order')).toHaveTextContent('Confirm');
    expect(finishRecurringOrderTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'create-trace-id' }),
      {
        result: 'error',
        failurePhase: 'account_upgrade',
      },
    );
  });

  it('records delegation preparation failures', async () => {
    jest
      .mocked(recurringOrdersApiClient.prepareRecurringDelegation)
      .mockRejectedValue(new Error('Preparation failed'));
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(finishRecurringOrderTrace).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'create-trace-id' }),
        {
          result: 'error',
          failurePhase: 'delegation_prepare',
        },
      );
    });
  });

  it('records delegation signing failures', async () => {
    jest
      .mocked(signLimitOrderDelegations)
      .mockRejectedValue(new Error('Signing failed'));
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(finishRecurringOrderTrace).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'create-trace-id' }),
        {
          result: 'error',
          failurePhase: 'signing',
        },
      );
    });
  });

  it('shows a generic error when order submission fails', async () => {
    mockCreateRecurringOrder.mockRejectedValue(
      new Error('Order submission failed'),
    );
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(showGenericErrorToast).toHaveBeenCalledTimes(1);
    });
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('preserves recurring inputs when order submission fails', async () => {
    mockCreateRecurringOrder.mockRejectedValue(
      new Error('Order submission failed'),
    );
    const { getByTestId, store } = renderScreen({
      recurring: configuredRecurringState,
      sourceAmount: '1',
    });

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(showGenericErrorToast).toHaveBeenCalledTimes(1);
    });
    expect(store.getState().bridge.recurring).toEqual(configuredRecurringState);
    expect(store.getState().bridge.sourceAmount).toBe('1');
    expect(showRecurringOrderCreatedToast).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(finishRecurringOrderTrace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'create-trace-id' }),
      {
        result: 'error',
        failurePhase: 'create',
      },
    );
  });

  it('ignores duplicate confirmation presses', async () => {
    mockAutoUpgradeEIP7702Account.mockReturnValue(
      new Promise<void>(() => undefined),
    );
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('confirm-order'));
    fireEvent.press(getByTestId('confirm-order'));

    expect(mockAutoUpgradeEIP7702Account).toHaveBeenCalledTimes(1);
  });

  it('does not open the transaction confirmation modal', async () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('confirm-order'));

    await waitFor(() => {
      expect(mockCreateRecurringOrder).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigate).not.toHaveBeenCalledWith(
      Routes.CONFIRMATION_REQUEST_MODAL,
    );
  });

  describe('advanced order events', () => {
    it('tracks ADVANCED_ORDER_COMPLETED with an order_type key after the order is submitted', async () => {
      const { getByTestId } = renderScreen({
        recurring: configuredRecurringState,
      });

      fireEvent.press(getByTestId('confirm-order'));

      await waitFor(() => {
        expect(mockCreateRecurringOrder).toHaveBeenCalledTimes(1);
      });
      expectAdvancedOrderProperties(
        MetaMetricsEvents.ADVANCED_ORDER_COMPLETED,
        {
          ...EXPECTED_TOKEN_PROPERTIES,
          location: 'Token View',
          feature_id: FeatureId.RECURRING_ORDER,
          order_type: OrderType.SELL_BELOW,
        },
      );
    });

    it('tracks ADVANCED_ORDER_FAILED with an order_type key when account auto-upgrade fails', async () => {
      mockAutoUpgradeEIP7702Account.mockRejectedValue(
        new Error('Upgrade failed'),
      );
      const { getByTestId } = renderScreen({
        recurring: configuredRecurringState,
      });

      fireEvent.press(getByTestId('confirm-order'));

      await waitFor(() => {
        expect(showGenericErrorToast).toHaveBeenCalledTimes(1);
      });
      expectAdvancedOrderProperties(MetaMetricsEvents.ADVANCED_ORDER_FAILED, {
        ...EXPECTED_TOKEN_PROPERTIES,
        location: 'Token View',
        feature_id: FeatureId.RECURRING_ORDER,
        order_type: OrderType.SELL_BELOW,
        error: 'delegation_failed',
      });
    });

    it('tracks ADVANCED_ORDER_FAILED with an order_type key when the order cannot be submitted', async () => {
      jest
        .mocked(mockCreateRecurringOrder)
        .mockRejectedValue(new Error('Order submission failed'));
      const { getByTestId } = renderScreen({
        recurring: configuredRecurringState,
      });

      fireEvent.press(getByTestId('confirm-order'));

      await waitFor(() => {
        expect(showGenericErrorToast).toHaveBeenCalledTimes(1);
      });
      expectAdvancedOrderProperties(MetaMetricsEvents.ADVANCED_ORDER_FAILED, {
        ...EXPECTED_TOKEN_PROPERTIES,
        location: 'Token View',
        feature_id: FeatureId.RECURRING_ORDER,
        order_type: OrderType.SELL_BELOW,
        error: 'Order submission failed',
      });
    });
  });
});
