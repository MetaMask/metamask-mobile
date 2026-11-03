import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  FeatureId,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { createBridgeTestState } from '../../../testUtils';
import { OrderType } from '../../../types/advancedOrders';
import { useRecurringOrders } from '../../../hooks/useRecurringOrders';
import { useSentinelFeeTokenValidation } from '../../../hooks/useSentinelFeeTokenValidation';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useRecurringBuySwapInputs } from './useRecurringBuySwapInputs';
import { useRecurringBuyKeypad } from './useRecurringBuyKeypad';
import BridgeRecurringBuyView from './index';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../hooks/useBridgeSession', () => ({
  useBridgeSession: jest.fn().mockReturnValue({
    latestSourceBalance: { displayBalance: '1.0' },
    recurringOrdersTab: 'open',
    setRecurringOrdersTab: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

jest.mock('../../../hooks/useRecurringOrders', () => ({
  useRecurringOrders: jest.fn(),
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
    isPreviewDisabled,
  }: {
    onPreviewOrder: () => void;
    isPreviewDisabled?: boolean;
  }) => {
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
      ReactModule.createElement(Text, null, 'Preview'),
    );
  },
}));

jest.mock('../../../components/SwapsInputs', () => ({
  SwapsInputs: () => null,
}));

jest.mock('../../../components/SwapsKeypad', () => ({
  SwapsKeypad: () => null,
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

jest.mock('../../../components/RecurringScheduleFields', () => ({
  __esModule: true,
  default: () => null,
}));

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

const expectAdvancedOrderProperties = (
  event: { category: string },
  properties: {
    location: string;
    feature_id: FeatureId;
    order_type: OrderType;
    error?: string;
  },
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
    jest.mocked(useBridgeQuoteDataContext).mockReturnValue({
      activeQuote: { quote: { requestId: 'quote-1' } },
      isLoading: false,
    } as never);
    jest.mocked(useRecurringOrders).mockReturnValue({
      data: { pages: [] },
      isLoading: false,
      refetch: jest.fn(),
    } as never);
    jest.mocked(useSentinelFeeTokenValidation).mockReturnValue({
      isValid: true,
      retry: jest.fn(),
    });
    jest.mocked(useRecurringBuySwapInputs).mockReturnValue({
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
      sourceAmountInput: { value: '1' },
      sourceToken,
      sourceAmount: '1',
    } as never);
    jest.mocked(useRecurringBuyKeypad).mockReturnValue({
      close: jest.fn(),
      focusAmount: jest.fn(),
      focusEvery: jest.fn(),
      focusRepeat: jest.fn(),
      handleChange: jest.fn(),
      isAmountFocused: false,
      keypadProps: { value: '1', currency: 'ETH', decimals: 18 },
      keypadRef: { current: null },
    } as never);
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
      location: 'Bottom Nav Bar',
      feature_id: FeatureId.RECURRING_ORDER,
      order_type: OrderType.SELL_BELOW,
    });
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
});
