import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  AdvancedOrderMetricsEventName,
  FeatureId,
  MetaMetricsSwapsEventSource,
  MetricsSwapType,
} from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { merge } from 'lodash';
import { strings } from '../../../../../../../locales/i18n';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Routes from '../../../../../../constants/navigation/Routes';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { createBridgeTestState } from '../../../testUtils';
import {
  evmAccountAddress,
  initialState,
  solanaAccountAddress,
  solanaAccountId,
} from '../../../_mocks_/initialState';
import { RecurringOrderState } from '../../../api/recurringOrders.types';
import { OrderType } from '../../../types/advancedOrders';
import { useRecurringOrders } from '../../../hooks/useRecurringOrders';
import { useRecurringOrdersListTrace } from '../../../hooks/useRecurringOrdersListTrace';
import { useSentinelFeeTokenValidation } from '../../../hooks/useSentinelFeeTokenValidation';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useBridgeSession } from '../../../hooks/useBridgeSession';
import { useHasSufficientGas } from '../../../hooks/useHasSufficientGas';
import useIsInsufficientBalance from '../../../hooks/useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../../../hooks/useInsufficientNativeReserveError';
import { useIsNetworkFeeUnavailable } from '../../../hooks/useIsNetworkFeeUnavailable';
import type { UseOrderMinAmountResult } from '../../../hooks/useOrderMinAmount';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../../util/deviceCapability';
import {
  RECURRING_ORDERS_CONSTRAINED_REFETCH_INTERVAL,
  RECURRING_ORDERS_REFETCH_INTERVAL,
} from '../../../constants/recurringOrders';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { BridgeTabKey } from '../BridgeView.constants';
import { useBridgeQuoteEvents } from '../../../hooks/useBridgeQuoteEvents';
import { useRecurringBuySwapInputs } from './useRecurringBuySwapInputs';
import { useRecurringBuyKeypad } from './useRecurringBuyKeypad';
import BridgeRecurringBuyView from './index';

const mockNavigate = jest.fn();
const mockUseIsFocused = jest.fn();
const mockCloseKeypad = jest.fn();
const mockSourceInputBlur = jest.fn();
const mockScheduleFieldsBlur = jest.fn();
let mockPreviewOrderHandler: (() => void) | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useIsFocused: () => mockUseIsFocused(),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../hooks/useBridgeSession', () => ({
  useBridgeSession: jest.fn(),
}));

jest.mock('../../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

jest.mock('../../../hooks/useBridgeQuoteEvents', () => ({
  useBridgeQuoteEvents: jest.fn(),
}));

jest.mock('../../../hooks/useHasSufficientGas', () => ({
  useHasSufficientGas: jest.fn(),
}));

jest.mock('../../../hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../hooks/useInsufficientNativeReserveError', () => ({
  useInsufficientNativeReserveError: jest.fn(),
}));

jest.mock('../../../hooks/useIsNetworkFeeUnavailable', () => ({
  useIsNetworkFeeUnavailable: jest.fn(),
}));

jest.mock('../../../hooks/useRecurringOrders', () => ({
  useRecurringOrders: jest.fn(),
}));

jest.mock('../../../hooks/useRecurringOrdersListTrace', () => ({
  useRecurringOrdersListTrace: jest.fn(),
}));

jest.mock('../../../hooks/useSentinelFeeTokenValidation', () => ({
  useSentinelFeeTokenValidation: jest.fn(),
}));

jest.mock('./useRecurringBuySwapInputs', () => ({
  useRecurringBuySwapInputs: jest.fn(),
}));

jest.mock('./useRecurringBuyKeypad', () => ({
  useRecurringBuyKeypad: jest.fn(),
}));

jest.mock('./BridgeRecurringBuyFooterView', () => ({
  BridgeRecurringBuyFooterView: ({
    onPreviewOrder,
    label,
    isPreviewDisabled,
  }: {
    onPreviewOrder: () => void;
    label: string;
    isPreviewDisabled?: boolean;
  }) => {
    mockPreviewOrderHandler = onPreviewOrder;
    const ReactModule = jest.requireActual<typeof React>('react');
    const { Pressable, Text } =
      jest.requireActual<typeof import('react-native')>('react-native');

    return ReactModule.createElement(
      Pressable,
      {
        testID: 'preview-order',
        onPress: onPreviewOrder,
        disabled: isPreviewDisabled,
        accessibilityState: { disabled: isPreviewDisabled },
      },
      ReactModule.createElement(Text, null, label),
    );
  },
}));

jest.mock('../../../components/SwapsInputs', () => {
  const ReactModule = jest.requireActual<typeof React>('react');

  return {
    SwapsInputs: ({
      inputRef,
    }: {
      inputRef: React.Ref<{
        blur: () => void;
        focus: () => void;
        isFocused: () => boolean;
      }>;
    }) => {
      ReactModule.useImperativeHandle(inputRef, () => ({
        blur: mockSourceInputBlur,
        focus: jest.fn(),
        isFocused: jest.fn(() => false),
      }));

      return null;
    },
  };
});

jest.mock('../../../components/SwapsKeypad', () => ({
  SwapsKeypad: ({ onClose }: { onClose?: () => void }) => {
    const ReactModule = jest.requireActual<typeof React>('react');
    const { Pressable } =
      jest.requireActual<typeof import('react-native')>('react-native');

    return ReactModule.createElement(Pressable, {
      testID: 'close-keypad',
      onPress: onClose,
    });
  },
}));

jest.mock('../../../components/SwapsBanners', () => ({
  SwapsBanners: () => null,
  HardwareWalletUnsupportedBanner: () => null,
  InsufficientNativeReserveBanner: () => null,
  MissingQuoteAndAssetsPriceDataBanner: () => null,
  QuoteErrorBanner: () => null,
  DestAssetRequireActivateBanner: () => null,
  TokenWarningBanner: () => null,
}));

jest.mock('../../../components/OrdersTabs', () => ({
  __esModule: true,
  default: () => null,
  OrdersTabKey: { OpenOrders: 'open', History: 'history' },
}));

jest.mock('../../../components/PriceRangeRow', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../components/RecurringScheduleFields', () => {
  const ReactModule = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    default: ReactModule.forwardRef(
      (_props: unknown, ref: React.Ref<{ blur: () => void }>) => {
        ReactModule.useImperativeHandle(ref, () => ({
          blur: mockScheduleFieldsBlur,
        }));

        return null;
      },
    ),
  };
});

jest.mock('./RecurringOrderRow', () => ({
  createRecurringOrdersTab: () => ({
    orders: [],
    isLoading: false,
  }),
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

function createMockRecurringBuySwapInputs(
  recurringOrderMinAmount: UseOrderMinAmountResult = {
    formattedMinAmountInSelectedCurrency: '$100.00',
    hasError: false,
    isBelowMinAmount: false,
    minAmountUsd: 100,
  },
) {
  return {
    destToken,
    destTokenAmount: '10',
    enabledChainIds: [],
    handleDestTokenPress: jest.fn(),
    handleFlipTokensPress: jest.fn(),
    handleSourceMaxPress: jest.fn(),
    handleSourcePresetAmountSelect: jest.fn(),
    handleSourceTokenPress: jest.fn(),
    isDestAmountLoading: false,
    isFlipDisabled: false,
    isQuoteSponsored: false,
    recurringOrderMinAmount,
    sourceAmountInput: { value: '1' },
    sourceToken,
    sourceAmount: '1',
  };
}

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

describe('BridgeRecurringBuyView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreviewOrderHandler = undefined;
    mockUseIsFocused.mockReturnValue(true);
    jest.mocked(getHardwareTier).mockReturnValue('HIGH');
    jest.mocked(useNetworkTier).mockReturnValue('WIFI');
    jest.mocked(useHasSufficientGas).mockReturnValue(true);
    jest.mocked(useIsInsufficientBalance).mockReturnValue(false);
    jest.mocked(useInsufficientNativeReserveError).mockReturnValue(undefined);
    jest.mocked(useIsNetworkFeeUnavailable).mockReturnValue(false);
    jest.mocked(useBridgeSession).mockReturnValue({
      latestSourceBalance: { displayBalance: '1.0' },
      renderedTab: BridgeTabKey.Recurring,
      recurringOrdersTab: 'open',
      setRecurringOrdersTab: jest.fn(),
    } as never);
    jest.mocked(useBridgeQuoteDataContext).mockReturnValue({
      activeQuote: mockActiveQuote,
      isLoading: false,
    } as never);
    jest.mocked(useRecurringOrders).mockReturnValue({
      orders: [],
      isLoading: false,
      isError: false,
      isFetchingNextPage: false,
      fetchNextPage: jest.fn(),
      refetch: jest.fn(),
      refresh: jest.fn(),
    } as never);
    jest.mocked(useSentinelFeeTokenValidation).mockReturnValue({
      isValid: true,
      retry: jest.fn(),
    });
    jest
      .mocked(useRecurringBuySwapInputs)
      .mockReturnValue(createMockRecurringBuySwapInputs() as never);
    jest.mocked(useRecurringBuyKeypad).mockReturnValue({
      close: mockCloseKeypad,
      focusAmount: jest.fn(),
      focusEvery: jest.fn(),
      focusRepeat: jest.fn(),
      handleChange: jest.fn(),
      isAmountFocused: false,
      keypadProps: { value: '1', currency: 'ETH', decimals: 18 },
      keypadRef: { current: null },
    } as never);
  });

  it('tracks successful quote fetches as Advanced recurring-order events', () => {
    renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      {
        state: createBridgeTestState(),
      },
    );

    expect(useBridgeQuoteEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        eventName: AdvancedOrderMetricsEventName.QuotesReceived,
      }),
    );
  });

  it('tracks ADVANCED_ORDER_SUBMITTED with an order_type key when previewing an order', () => {
    const { getByTestId } = renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      {
        state: createBridgeTestState({
          bridgeReducerOverrides: {
            sourceToken,
            destToken,
            recurring: {
              everyValue: '2',
              everyUnit: 'day',
              repeatCount: '4',
              priceRange: {
                tokenSide: 'source',
                currency: 'USD',
                min: '1000',
                max: '2000',
              },
            },
          },
        }),
      },
    );

    fireEvent.press(getByTestId('preview-order'));

    expectAdvancedOrderProperties(MetaMetricsEvents.ADVANCED_ORDER_SUBMITTED, {
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
      location: 'Bottom Nav Bar',
      feature_id: FeatureId.RECURRING_ORDER,
      order_type: OrderType.SELL_BELOW,
    });
  });

  it('hands the entry point location to the confirmation modal', () => {
    const { getByTestId } = renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      {
        state: createBridgeTestState({
          bridgeReducerOverrides: { sourceToken, destToken },
        }),
      },
    );

    fireEvent.press(getByTestId('preview-order'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECURRING_CONFIRM_ORDER_MODAL,
      params: { location: MetaMetricsSwapsEventSource.BottomNavBar },
    });
  });

  it('blurs all fields and closes the keypad when tapping outside', () => {
    const { getByTestId } = renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      { state: createBridgeTestState() },
    );

    fireEvent(
      getByTestId(BridgeViewSelectorsIDs.RECURRING_BUY_DISMISS_AREA),
      'responderRelease',
    );

    expect(mockSourceInputBlur).toHaveBeenCalledTimes(1);
    expect(mockScheduleFieldsBlur).toHaveBeenCalledTimes(1);
    expect(mockCloseKeypad).toHaveBeenCalledTimes(1);
  });

  it('blurs all fields when the keypad is minimized', () => {
    const { getByTestId } = renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      { state: createBridgeTestState() },
    );

    fireEvent.press(getByTestId('close-keypad'));

    expect(mockSourceInputBlur).toHaveBeenCalledTimes(1);
    expect(mockScheduleFieldsBlur).toHaveBeenCalledTimes(1);
    expect(mockCloseKeypad).not.toHaveBeenCalled();
  });

  it('loads the orders of the EVM account of the selected group when a non-EVM account is selected', () => {
    renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      {
        state: createBridgeTestState(
          { bridgeReducerOverrides: { sourceToken, destToken } },
          merge({}, initialState, {
            engine: {
              backgroundState: {
                AccountsController: {
                  internalAccounts: { selectedAccount: solanaAccountId },
                },
              },
            },
          }),
        ),
      },
    );

    expect(useRecurringOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddress: evmAccountAddress,
        orderStates: [RecurringOrderState.Open],
      }),
    );
    expect(useRecurringOrders).toHaveBeenCalledWith(
      expect.objectContaining({
        walletAddress: evmAccountAddress,
        orderStates: expect.arrayContaining([RecurringOrderState.Completed]),
      }),
    );
    expect(useRecurringOrders).not.toHaveBeenCalledWith(
      expect.objectContaining({ walletAddress: solanaAccountAddress }),
    );
    expect(useRecurringOrdersListTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        listType: 'open',
      }),
    );
  });

  it('does not preview an order while the fee-token pair is unsupported', () => {
    jest.mocked(useSentinelFeeTokenValidation).mockReturnValue({
      isValid: false,
      reason: 'unsupported-pair',
      supportedTokenSymbols: ['USDC'],
      retry: jest.fn(),
    });
    const { getByTestId } = renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      {
        state: createBridgeTestState({
          bridgeReducerOverrides: {
            sourceToken,
            destToken,
            recurring: {
              everyValue: '2',
              everyUnit: 'day',
              repeatCount: '4',
            },
          },
        }),
      },
    );

    const previewButton = getByTestId('preview-order');
    fireEvent.press(previewButton);

    expect(previewButton.props.accessibilityState.disabled).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not preview an order below the recurring minimum', () => {
    jest.mocked(useRecurringBuySwapInputs).mockReturnValue(
      createMockRecurringBuySwapInputs({
        formattedMinAmountInSelectedCurrency: '€90.00',
        hasError: false,
        isBelowMinAmount: true,
        minAmountUsd: 100,
      }) as never,
    );
    const { getByTestId } = renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      {
        state: createBridgeTestState({
          bridgeReducerOverrides: { sourceToken, destToken },
        }),
      },
    );

    const previewButton = getByTestId('preview-order');
    mockPreviewOrderHandler?.();

    expect(previewButton.props.accessibilityState.disabled).toBe(true);
    expect(previewButton).toHaveTextContent(
      strings('bridge.recurring.min_order_amount', { amount: '€90.00' }),
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('fails closed when the minimum cannot be validated', () => {
    jest.mocked(useRecurringBuySwapInputs).mockReturnValue(
      createMockRecurringBuySwapInputs({
        formattedMinAmountInSelectedCurrency: undefined,
        hasError: true,
        isBelowMinAmount: false,
        minAmountUsd: 100,
      }) as never,
    );
    const { getByTestId } = renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      {
        state: createBridgeTestState({
          bridgeReducerOverrides: { sourceToken, destToken },
        }),
      },
    );

    const previewButton = getByTestId('preview-order');
    mockPreviewOrderHandler?.();

    expect(previewButton.props.accessibilityState.disabled).toBe(true);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it.each([
    {
      hardwareTier: 'HIGH',
      networkTier: 'WIFI',
      expectedInterval: RECURRING_ORDERS_REFETCH_INTERVAL,
    },
    {
      hardwareTier: 'LOW',
      networkTier: 'SLOW_CELLULAR',
      expectedInterval: RECURRING_ORDERS_CONSTRAINED_REFETCH_INTERVAL,
    },
    {
      hardwareTier: null,
      networkTier: null,
      expectedInterval: RECURRING_ORDERS_REFETCH_INTERVAL,
    },
    {
      hardwareTier: 'HIGH',
      networkTier: 'NONE',
      expectedInterval: undefined,
    },
  ] as const)(
    'uses $expectedInterval polling for $hardwareTier hardware and $networkTier network',
    ({ hardwareTier, networkTier, expectedInterval }) => {
      jest.mocked(getHardwareTier).mockReturnValue(hardwareTier);
      jest.mocked(useNetworkTier).mockReturnValue(networkTier);

      renderWithProvider(
        <BridgeRecurringBuyView
          location={MetaMetricsSwapsEventSource.BottomNavBar}
        />,
        { state: createBridgeTestState() },
      );

      const [openOrdersParams, historyParams] = jest
        .mocked(useRecurringOrders)
        .mock.calls.map(([params]) => params);
      expect(openOrdersParams.refetchInterval).toBe(expectedInterval);
      expect(historyParams.refetchInterval).toBeUndefined();
    },
  );

  it('polls History instead of Open Orders when History is selected', () => {
    jest.mocked(useBridgeSession).mockReturnValue({
      latestSourceBalance: { displayBalance: '1.0' },
      recurringOrdersTab: 'history',
      setRecurringOrdersTab: jest.fn(),
    } as never);

    renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      { state: createBridgeTestState() },
    );

    const [openOrdersParams, historyParams] = jest
      .mocked(useRecurringOrders)
      .mock.calls.map(([params]) => params);
    expect(openOrdersParams.refetchInterval).toBeUndefined();
    expect(historyParams.refetchInterval).toBe(
      RECURRING_ORDERS_REFETCH_INTERVAL,
    );
  });

  it('does not poll either orders query while the screen is hidden', () => {
    mockUseIsFocused.mockReturnValue(false);

    renderWithProvider(
      <BridgeRecurringBuyView
        location={MetaMetricsSwapsEventSource.BottomNavBar}
      />,
      { state: createBridgeTestState() },
    );

    jest.mocked(useRecurringOrders).mock.calls.forEach(([params]) => {
      expect(params.refetchInterval).toBeUndefined();
    });
  });
});
