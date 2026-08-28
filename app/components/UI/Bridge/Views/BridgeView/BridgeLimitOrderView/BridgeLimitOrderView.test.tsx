import React from 'react';
import type { CaipChainId } from '@metamask/utils';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../../locales/i18n';
import { createBridgeTestState } from '../../../testUtils';
import { createMockTokenWithBalance } from '../../../testUtils/fixtures';
import { mockUseBridgeQuoteData } from '../../../_mocks_/useBridgeQuoteData.mock';
import { useBridgeQuoteData } from '../../../hooks/useBridgeQuoteData';
import { useLimitOrderSwapInputs } from '../../../hooks/useLimitOrderSwapsInput';
import { useSwapsLimitOrderPriceAdjust } from '../../../hooks/useSwapsLimitOrderPriceAdjust';
import { useSwapsLimitOrderKeypad } from '../../../hooks/useSwapsLimitOrderKeypad';
import { useLatestBalance } from '../../../hooks/useLatestBalance';
import { LimitOrderExecutionType } from '../../../constants/limitOrders';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import BridgeLimitOrderView from './index';

/**
 * Unit tests for BridgeLimitOrderView orchestration (keypad footer swap,
 * dismiss/commit wiring, preset handlers). CV covers tab navigation and mock
 * orders data; these branches need isolated hook mocks to assert callback
 * composition without the full Bridge quote pipeline.
 */

jest.mock(
  '../../../../../../multichain-accounts/controllers/account-tree-controller',
  () => ({
    accountTreeControllerInit: jest.fn(() => ({
      controller: {
        state: { accountTree: { wallets: {} } },
      },
    })),
  }),
);

jest.mock('../../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest.fn(),
}));

jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => {
  const { useBridgeQuoteData: useBridgeQuoteDataMock } = jest.requireMock(
    '../../../hooks/useBridgeQuoteData',
  );

  return {
    BridgeQuoteDataProvider: ({ children }: { children: React.ReactNode }) =>
      children,
    useBridgeQuoteDataContext: jest.fn(() => useBridgeQuoteDataMock()),
  };
});

jest.mock('../../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(),
}));

jest.mock('../../../hooks/useLimitOrderSwapsInput', () => ({
  useLimitOrderSwapInputs: jest.fn(),
}));

jest.mock('../../../hooks/useSwapsLimitOrderPriceAdjust', () => ({
  useSwapsLimitOrderPriceAdjust: jest.fn(),
}));

jest.mock('../../../hooks/useSwapsLimitOrderKeypad', () => ({
  useSwapsLimitOrderKeypad: jest.fn(),
}));

jest.mock('../../../components/SwapsKeypad', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    SwapsKeypad: ReactActual.forwardRef(
      (
        { children }: { children?: React.ReactNode },
        ref: React.Ref<unknown>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          open: jest.fn(),
          close: jest.fn(),
          isOpen: jest.fn(() => false),
        }));

        return <View testID="mock-swaps-keypad">{children}</View>;
      },
    ),
  };
});

jest.mock('./BridgeLimitOrderFooterView', () => ({
  BridgeLimitOrderFooterView: () => null,
}));

jest.mock('../../../components/SwapsInputs', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TextInput } = jest.requireActual('react-native');

  return {
    SwapsInputs: ({
      sourceTokenAreaTestID,
      destTokenAreaTestID,
      onSourceInputPress,
    }: {
      sourceTokenAreaTestID?: string;
      destTokenAreaTestID?: string;
      onSourceInputPress?: () => void;
    }) => (
      <View>
        <TextInput
          testID="limit-source-token-area-input"
          onPressIn={onSourceInputPress}
        />
        <View testID={sourceTokenAreaTestID} />
        <View testID={destTokenAreaTestID} />
        <TextInput testID="limit-dest-token-area-input" />
      </View>
    ),
  };
});

jest.mock('../../../components/OrdersTabs', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../components/SwapsBanners', () => ({
  SwapsBanners: ({ children }: { children?: React.ReactNode }) => children,
  HardwareWalletUnsupportedBanner: () => null,
  InsufficientNativeReserveBanner: () => null,
  MissingQuoteAndAssetsPriceDataBanner: () => null,
  QuoteErrorBanner: () => null,
  StellarTrustlineBanner: () => null,
  TokenWarningBanner: () => null,
}));

jest.mock('../../../components/LimitOrderPriceAdjustCard', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    LimitOrderPriceAdjustCard: ({
      hasVisibleBanner,
      onMarketPresetPress,
      onCustomPresetPress,
      onLimitPriceInputPress,
    }: {
      hasVisibleBanner: boolean;
      onMarketPresetPress?: () => void;
      onCustomPresetPress?: () => void;
      onLimitPriceInputPress?: () => void;
    }) => (
      <View
        testID={
          hasVisibleBanner
            ? 'limit-order-price-adjust-with-banner'
            : 'limit-order-price-adjust-without-banner'
        }
      >
        <View
          testID="limit-order-limit-price-input"
          onTouchEnd={onLimitPriceInputPress}
        />
        <View
          testID="limit-order-market-preset"
          onTouchEnd={onMarketPresetPress}
        />
        <View
          testID="limit-order-custom-preset"
          onTouchEnd={onCustomPresetPress}
        />
      </View>
    ),
  };
});

const mockSourceToken = createMockTokenWithBalance({
  symbol: 'ETH',
  name: 'Ether',
});

const mockCommitCustomPercent = jest.fn();
const mockCloseKeypad = jest.fn();
const mockHandleMarketPress = jest.fn();
const mockHandleCustomPress = jest.fn();
const mockFocusCustomPercent = jest.fn();
const mockFocusAmount = jest.fn();
const mockFocusLimitPrice = jest.fn();

let mockIsAmountFocused = false;
let mockIsCustomPercentFocused = false;
let mockSourceAmount = '';

function buildSwapInputsMock() {
  return {
    destToken: createMockTokenWithBalance({ symbol: 'USDC' }),
    destTokenAmount: '24.44',
    enabledChainIds: ['eip155:1'] as CaipChainId[],
    handleDestTokenPress: jest.fn(),
    handleFlipTokensPress: jest.fn(),
    handleSourceMaxPress: jest.fn(),
    handleSourcePresetAmountSelect: jest.fn(),
    handleSourceTokenPress: jest.fn(),
    isDestAmountLoading: false,
    isFlipDisabled: false,
    isQuoteSponsored: false,
    sourceAmount: mockSourceAmount,
    sourceAmountInput: {
      amount: mockSourceAmount,
      selection: undefined,
      handleFocus: jest.fn(),
      handleSelectionChange: jest.fn(),
      canToggle: false,
      handleToggle: jest.fn(),
      inputPrefix: undefined,
      secondaryValue: undefined,
      balanceCheckAmount: undefined,
      keypadValue: mockSourceAmount,
      keypadCurrency: 'ETH',
      keypadDecimals: 18,
      handleKeypadChange: jest.fn(),
      resetToTokenMode: jest.fn(),
      syncFiatAmountToTokenAmount: jest.fn(),
      isFiatMode: false,
    },
    sourceToken: mockSourceToken,
  };
}

function buildPriceAdjustMock() {
  return {
    commitCustomPercent: mockCommitCustomPercent,
    counterToken: mockSourceToken,
    customValue: '',
    handleCustomPress: mockHandleCustomPress,
    handleCustomValueChange: jest.fn(),
    handleLimitPriceChange: jest.fn(),
    handleMarketPress: mockHandleMarketPress,
    handlePercentPress: jest.fn(),
    isCustomActive: false,
    isLimitFiatMode: false,
    executionType: LimitOrderExecutionType.SELL,
    limitPrice: '1',
    marketComparison: undefined,
    onAmountTypeTogglePress: undefined,
    onQuoteUnitPress: jest.fn(),
    quotedSymbol: 'USDC',
    secondaryValue: undefined,
    value: '1',
  };
}

function buildKeypadMock() {
  return {
    close: mockCloseKeypad,
    customPercentSelection: undefined,
    focusAmount: mockFocusAmount,
    focusCustomPercent: mockFocusCustomPercent,
    focusLimitPrice: mockFocusLimitPrice,
    handleChange: jest.fn(),
    handleCustomPercentSelectionChange: jest.fn(),
    handleLimitPriceSelectionChange: jest.fn(),
    isAmountFocused: mockIsAmountFocused,
    isCustomPercentFocused: mockIsCustomPercentFocused,
    keypadProps: {
      value: mockSourceAmount,
      currency: 'ETH',
      decimals: 18,
    },
    keypadRef: { current: null },
    limitPriceSelection: undefined,
  };
}

function renderLimitOrderView() {
  return renderWithProvider(<BridgeLimitOrderView />, {
    state: createBridgeTestState({
      bridgeReducerOverrides: {
        sourceToken: mockSourceToken,
      },
    }),
  });
}

describe('BridgeLimitOrderView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsAmountFocused = false;
    mockIsCustomPercentFocused = false;
    mockSourceAmount = '';

    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => mockUseBridgeQuoteData);
    jest.mocked(useLatestBalance).mockReturnValue({
      displayBalance: '1.0',
      atomicBalance: undefined,
    });
    jest
      .mocked(useLimitOrderSwapInputs)
      .mockImplementation(() => buildSwapInputsMock());
    jest
      .mocked(useSwapsLimitOrderPriceAdjust)
      .mockImplementation(() => buildPriceAdjustMock());
    jest
      .mocked(useSwapsLimitOrderKeypad)
      .mockImplementation(() => buildKeypadMock());
  });

  it('renders the limit order container and source token input', () => {
    const { getByTestId } = renderLimitOrderView();

    expect(
      getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BridgeViewSelectorsIDs.LIMIT_SOURCE_TOKEN_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BridgeViewSelectorsIDs.LIMIT_DEST_TOKEN_INPUT),
    ).toBeOnTheScreen();
  });

  it('does not render recurring You get copy on the dest token row', () => {
    const { queryByText } = renderLimitOrderView();

    expect(
      queryByText(strings('bridge.recurring.you_get')),
    ).not.toBeOnTheScreen();
  });

  it('renders amount quick picks when the amount keypad is focused without a source amount', () => {
    mockIsAmountFocused = true;
    mockSourceAmount = '';

    const { getByText, queryByTestId } = renderLimitOrderView();

    expect(getByText('25%')).toBeOnTheScreen();
    expect(
      queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD),
    ).not.toBeOnTheScreen();
  });

  it('renders the keypad confirm button when the amount keypad is focused with a non-zero source amount', () => {
    mockIsAmountFocused = true;
    mockSourceAmount = '2';

    const { getByTestId, queryByText } = renderLimitOrderView();

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON_KEYPAD),
    ).toBeOnTheScreen();
    expect(queryByText('25%')).not.toBeOnTheScreen();
  });

  it('commits the custom percent and closes the keypad when dismiss runs while custom percent is focused', () => {
    mockIsCustomPercentFocused = true;

    const { getByTestId } = renderLimitOrderView();

    fireEvent(
      getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_DISMISS_AREA),
      'responderRelease',
    );

    expect(mockCommitCustomPercent).toHaveBeenCalledTimes(1);
    expect(mockCloseKeypad).toHaveBeenCalledTimes(1);
  });

  it('closes the keypad without committing custom percent when dismiss runs while custom percent is not focused', () => {
    mockIsCustomPercentFocused = false;

    const { getByTestId } = renderLimitOrderView();

    fireEvent(
      getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_DISMISS_AREA),
      'responderRelease',
    );

    expect(mockCommitCustomPercent).not.toHaveBeenCalled();
    expect(mockCloseKeypad).toHaveBeenCalledTimes(1);
  });

  it('commits custom percent when source amount is pressed while custom percent is focused', () => {
    mockIsCustomPercentFocused = true;

    const { getByTestId } = renderLimitOrderView();

    fireEvent(getByTestId('limit-source-token-area-input'), 'pressIn');

    expect(mockCommitCustomPercent).toHaveBeenCalledTimes(1);
    expect(mockFocusAmount).toHaveBeenCalledTimes(1);
  });

  it('commits custom percent when limit price is pressed while custom percent is focused', () => {
    mockIsCustomPercentFocused = true;

    const { getByTestId } = renderLimitOrderView();

    fireEvent(getByTestId('limit-order-limit-price-input'), 'touchEnd');

    expect(mockCommitCustomPercent).toHaveBeenCalledTimes(1);
    expect(mockFocusLimitPrice).toHaveBeenCalledTimes(1);
  });

  it('does not commit custom percent when source amount is pressed while custom percent is not focused', () => {
    mockIsCustomPercentFocused = false;

    const { getByTestId } = renderLimitOrderView();

    fireEvent(getByTestId('limit-source-token-area-input'), 'pressIn');

    expect(mockCommitCustomPercent).not.toHaveBeenCalled();
    expect(mockFocusAmount).toHaveBeenCalledTimes(1);
  });

  it('calls handleMarketPress and closes the keypad when the market preset is pressed', () => {
    const { getByTestId } = renderLimitOrderView();

    fireEvent(getByTestId('limit-order-market-preset'), 'touchEnd');

    expect(mockHandleMarketPress).toHaveBeenCalledTimes(1);
    expect(mockCloseKeypad).toHaveBeenCalledTimes(1);
    expect(mockCommitCustomPercent).not.toHaveBeenCalled();
  });

  it('calls handleCustomPress and focuses custom percent when the custom preset is pressed', () => {
    const { getByTestId } = renderLimitOrderView();

    fireEvent(getByTestId('limit-order-custom-preset'), 'touchEnd');

    expect(mockHandleCustomPress).toHaveBeenCalledTimes(1);
    expect(mockFocusCustomPercent).toHaveBeenCalledTimes(1);
  });

  it('renders the price adjust card without banner spacing before banners report layout height', () => {
    const { getByTestId, queryByTestId } = renderLimitOrderView();

    expect(
      getByTestId('limit-order-price-adjust-without-banner'),
    ).toBeOnTheScreen();
    expect(
      queryByTestId('limit-order-price-adjust-with-banner'),
    ).not.toBeOnTheScreen();
  });
});
