import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import {
  selectDestToken,
  selectSlippage,
  selectSourceToken,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';
import { useTokenFiatRate } from '../../hooks/useTokenFiatRate';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import LimitOrdersView from './LimitOrdersView';
import {
  calculateLimitTriggerFiat,
  LIMIT_ORDER_EXPIRATION_OPTIONS,
  LimitOrdersSelectorsIDs,
  type LimitOrderRowModel,
} from './limitOrders';

const mockUseSelector = jest.fn();
const mockUseDispatch = jest.fn();
const mockNavigate = jest.fn();
const mockUseTokenFiatRate = jest.mocked(useTokenFiatRate);
const mockUseBridgeQuoteDataContext = jest.mocked(useBridgeQuoteDataContext);
type QuoteDataContext = ReturnType<typeof useBridgeQuoteDataContext>;

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: unknown) => mockUseSelector(selector),
  useDispatch: () => mockUseDispatch,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/useTokenFiatRate', () => ({
  useTokenFiatRate: jest.fn(),
}));

jest.mock('../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

const sourceToken = {
  address: '0xsource',
  chainId: '0x1',
  symbol: 'ETH',
};

const destinationToken = {
  address: '0xdestination',
  chainId: '0x1',
  symbol: 'USDC',
};

const createOrder = (
  overrides: Partial<LimitOrderRowModel> = {},
): LimitOrderRowModel => ({
  id: 'order-1',
  sourceToken: { symbol: 'ETH' },
  destinationToken: { symbol: 'USDC' },
  sourceAmount: '1',
  destinationAmount: '2,000',
  triggerPrice: '$2,000.00',
  expiration: '1 week',
  networkName: 'Ethereum',
  status: 'filled',
  ...overrides,
});

const renderLimitOrdersView = (
  props: React.ComponentProps<typeof LimitOrdersView> = {},
) => render(<LimitOrdersView {...props} />);

const configureSelectorState = (slippage?: string) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectSourceToken) {
      return sourceToken;
    }
    if (selector === selectDestToken) {
      return destinationToken;
    }
    if (selector === selectSlippage) {
      return slippage;
    }
    if (selector === selectCurrentCurrency) {
      return 'USD';
    }
    return undefined;
  });
};

const createQuoteDataContext = (
  overrides: Partial<QuoteDataContext> = {},
): QuoteDataContext =>
  ({
    quoteRate: 2,
    isLoading: false,
    isExpired: false,
    isActiveQuoteForCurrentTokenPair: true,
    ...overrides,
  }) as QuoteDataContext;

describe('LimitOrdersView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureSelectorState();
    mockUseTokenFiatRate.mockReturnValue(100);
    mockUseBridgeQuoteDataContext.mockReturnValue(createQuoteDataContext());
  });

  it('calculates trigger fiat values from the quote rate and source fiat rate', () => {
    const triggerFiat = calculateLimitTriggerFiat({
      quoteRate: 2,
      sourceTokenFiatRate: 100,
      offset: -5,
    });

    expect(triggerFiat).toBe(47.5);
  });

  it.each([
    ['loading', { isLoading: true }],
    ['expired', { isExpired: true }],
    ['for a different token pair', { isActiveQuoteForCurrentTokenPair: false }],
    ['zero-rate', { quoteRate: 0 }],
    ['invalid-rate', { quoteRate: Number.NaN }],
  ])(
    'disables trigger presets when the quote is %s',
    (_condition, overrides) => {
      mockUseBridgeQuoteDataContext.mockReturnValue(
        createQuoteDataContext(overrides),
      );

      const { getByTestId } = renderLimitOrdersView();

      expect(
        getByTestId(`${LimitOrdersSelectorsIDs.TRIGGER_PRESET_PREFIX}-0`).props
          .accessibilityState.disabled,
      ).toBe(true);
      expect(
        getByTestId(LimitOrdersSelectorsIDs.TRIGGER_PRICE),
      ).toHaveTextContent(strings('bridge.limit_order.quote_unavailable'));
    },
  );

  it('renders all expiration options and updates the selected value', () => {
    const { getByTestId, getByText } = renderLimitOrdersView();

    expect(
      getByText(strings('bridge.limit_order.expiration.1_week')),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(LimitOrdersSelectorsIDs.EXPIRATION_ROW));

    for (const option of LIMIT_ORDER_EXPIRATION_OPTIONS) {
      const optionRow = getByTestId(
        `${LimitOrdersSelectorsIDs.EXPIRATION_SHEET}-${option.value}`,
      );

      expect(optionRow).toBeOnTheScreen();
      expect(optionRow).toHaveTextContent(strings(option.labelKey));
    }

    fireEvent.press(
      getByTestId(`${LimitOrdersSelectorsIDs.EXPIRATION_SHEET}-10m`),
    );

    expect(
      getByText(strings('bridge.limit_order.expiration.10_minutes')),
    ).toBeOnTheScreen();
  });

  it.each([
    ['undefined', undefined, true],
    ['initialized', '0.5', false],
  ])(
    'handles %s slippage without changing the default',
    (_state, slippage, shouldInitialize) => {
      configureSelectorState(slippage);
      renderLimitOrdersView();

      if (shouldInitialize) {
        expect(mockUseDispatch).toHaveBeenCalledWith(setSlippage('2'));
      } else {
        expect(mockUseDispatch).not.toHaveBeenCalledWith(setSlippage('2'));
      }
    },
  );

  it('navigates to the existing slippage modal with both chain IDs', () => {
    const { getByTestId } = renderLimitOrdersView();

    fireEvent.press(getByTestId(LimitOrdersSelectorsIDs.SLIPPAGE_ROW));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken.chainId,
        destChainId: destinationToken.chainId,
      },
    });
  });

  it('switches order tabs, keeps the network filter a no-op, and renders passed rows', () => {
    const { getByTestId, getByText } = renderLimitOrdersView({
      openOrders: [createOrder({ status: 'open' })],
      historyOrders: [createOrder({ id: 'order-2' })],
    });

    expect(
      getByText(strings('bridge.limit_order.status.open')),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(LimitOrdersSelectorsIDs.HISTORY_TAB));

    expect(
      getByText(strings('bridge.limit_order.status.filled')),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(LimitOrdersSelectorsIDs.NETWORK_FILTER));

    expect(
      getByText(strings('bridge.limit_order.status.filled')),
    ).toBeOnTheScreen();
  });

  it('renders empty states when no orders are passed', () => {
    const { getByTestId } = renderLimitOrdersView();

    expect(
      getByTestId(LimitOrdersSelectorsIDs.OPEN_ORDERS_EMPTY),
    ).toBeOnTheScreen();

    fireEvent.press(getByTestId(LimitOrdersSelectorsIDs.HISTORY_TAB));

    expect(
      getByTestId(LimitOrdersSelectorsIDs.HISTORY_EMPTY),
    ).toBeOnTheScreen();
  });
});
