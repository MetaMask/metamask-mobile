import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';
import { mockUseBridgeQuoteData } from '../../_mocks_/useBridgeQuoteData.mock';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { createBridgeTestState } from '../../testUtils';
import type { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import RecurringConfirmOrderSheet from './RecurringConfirmOrderSheet';
import { RecurringConfirmOrderSheetSelectorsIDs } from './RecurringConfirmOrderSheet.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { formatMinimumReceived } from '../../utils/currencyUtils';
import { multiplyAmountByCount } from '../../utils/recurringConfirmTotals';

/**
 * CV cannot cover this sheet: Recurring remounts on tab switch and resets
 * the token pair, which clears seeded BridgeController quotes before Preview
 * Order can open it.
 */
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: ReactModule.forwardRef(
      (
        props: {
          children: unknown;
          testID?: string;
          onClose?: () => void;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => props.onClose?.(),
        }));

        return (
          <View testID={props.testID}>{props.children as React.ReactNode}</View>
        );
      },
    ),
  };
});

jest.mock('../../hooks/useBridgeQuoteData', () => ({
  useBridgeQuoteData: jest
    .fn()
    .mockImplementation(() => mockUseBridgeQuoteData),
}));

jest.mock('../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => {
  const { useBridgeQuoteData: useQuotedData } = jest.requireMock(
    '../../hooks/useBridgeQuoteData',
  );
  return {
    useBridgeQuoteDataContext: jest.fn(() => useQuotedData()),
  };
});

function buildState(
  bridgeReducerOverrides: Record<string, unknown> = {},
): DeepPartial<RootState> {
  return createBridgeTestState({
    bridgeReducerOverrides: {
      sourceAmount: '120',
      sourceToken: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1' as Hex,
        decimals: 18,
        image: '',
        name: 'Ether',
        symbol: 'ETH',
      },
      destToken: {
        address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
        chainId: '0xa' as Hex,
        decimals: 6,
        image: '',
        name: 'USD Coin',
        symbol: 'USDC',
      },
      ...bridgeReducerOverrides,
    },
  });
}

function renderSheet({
  isVisible = true,
  onClose = jest.fn(),
  state = buildState(),
}: {
  isVisible?: boolean;
  onClose?: () => void;
  state?: DeepPartial<RootState>;
} = {}) {
  return renderWithProvider(
    <RecurringConfirmOrderSheet isVisible={isVisible} onClose={onClose} />,
    { state },
  );
}

describe('RecurringConfirmOrderSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        destTokenAmount: '24.44',
        formattedQuoteData: {
          ...mockUseBridgeQuoteData.formattedQuoteData,
          networkFee: '$1.23',
        },
      }));
  });

  it('renders nothing when the sheet is hidden', () => {
    const { queryByTestId } = renderSheet({ isVisible: false });

    expect(
      queryByTestId(RecurringConfirmOrderSheetSelectorsIDs.SHEET),
    ).toBeNull();
  });

  it('shows per-order source amount and the all-orders total', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PAYING_PER_ORDER),
    ).toHaveTextContent(`${strings('bridge.recurring.paying_per_order')}120 ETH`);
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PAYING_ALL_ORDERS),
    ).toHaveTextContent(
      `${strings('bridge.recurring.paying_all_orders')}1,200 ETH`,
    );
  });

  it('shows dest token as receiving without an amount', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.RECEIVING),
    ).toHaveTextContent(`${strings('bridge.recurring.receiving')}USDC`);
  });

  it('shows estimated dest amounts per order and across all orders', () => {
    const { getByTestId, queryByTestId } = renderSheet();

    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_per_order')}24.44`,
    );
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_all_orders')}244.4`,
    );
    expect(
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER_SKELETON,
      ),
    ).not.toBeOnTheScreen();
  });

  it('caps paying and est receiving decimals like market min received', () => {
    const sourceAmount = '1.123456789012';
    const destTokenAmount = '0.012579999123';
    const repeat = 10;

    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        destTokenAmount,
        formattedQuoteData: {
          ...mockUseBridgeQuoteData.formattedQuoteData,
          networkFee: '$1.23',
        },
      }));

    const { getByTestId } = renderSheet({
      state: buildState({ sourceAmount }),
    });

    const payingAll = multiplyAmountByCount(sourceAmount, repeat);
    const receivingAll = multiplyAmountByCount(destTokenAmount, repeat);

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PAYING_PER_ORDER),
    ).toHaveTextContent(
      `${strings('bridge.recurring.paying_per_order')}${formatMinimumReceived(sourceAmount)} ETH`,
    );
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PAYING_ALL_ORDERS),
    ).toHaveTextContent(
      `${strings('bridge.recurring.paying_all_orders')}${formatMinimumReceived(payingAll ?? sourceAmount)} ETH`,
    );
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_per_order')}${formatMinimumReceived(destTokenAmount)}`,
    );
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_all_orders')}${formatMinimumReceived(receivingAll ?? destTokenAmount)}`,
    );
  });

  it('shows a fixed 180 day expiry', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.EXPIRES_AFTER),
    ).toHaveTextContent(
      `${strings('bridge.recurring.expires_after')}180 ${strings('bridge.recurring.unit_plural.day')}`,
    );
  });

  it('shows slippage as Auto when unset', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.SLIPPAGE),
    ).toHaveTextContent(`${strings('bridge.recurring.slippage_all_orders')}Auto`);
  });

  it('shows the shared slippage percent when set', () => {
    const { getByTestId } = renderSheet({
      state: buildState({
        slippage: '2',
      }),
    });

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.SLIPPAGE),
    ).toHaveTextContent(`${strings('bridge.recurring.slippage_all_orders')}2%`);
  });

  it('shows the per-order network fee from the quote', () => {
    const { getByTestId, queryByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_network_fee_per_order')}$1.23`,
    );
    expect(
      queryByTestId(RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('shows skeletons for quote-dependent values while a quote is loading', () => {
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        isLoading: true,
        destTokenAmount: '24.44',
        formattedQuoteData: {
          ...mockUseBridgeQuoteData.formattedQuoteData,
          networkFee: '$1.23',
        },
      }));

    const { getByTestId, queryByTestId } = renderSheet();

    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.FEE_DISCLAIMER_SKELETON,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER,
      ),
    ).not.toHaveTextContent('24.44');
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS,
      ),
    ).not.toHaveTextContent('244.4');
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE),
    ).not.toHaveTextContent('$1.23');
    expect(
      queryByTestId(RecurringConfirmOrderSheetSelectorsIDs.FEE_DISCLAIMER),
    ).not.toBeOnTheScreen();
  });

  it('keeps paying, receiving, expiry, and slippage populated while a quote is loading', () => {
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        isLoading: true,
        destTokenAmount: undefined,
        formattedQuoteData: undefined,
      }));

    const { getByTestId } = renderSheet({
      state: buildState({ slippage: '2' }),
    });

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PAYING_PER_ORDER),
    ).toHaveTextContent(`${strings('bridge.recurring.paying_per_order')}120 ETH`);
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PAYING_ALL_ORDERS),
    ).toHaveTextContent(
      `${strings('bridge.recurring.paying_all_orders')}1,200 ETH`,
    );
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.RECEIVING),
    ).toHaveTextContent(`${strings('bridge.recurring.receiving')}USDC`);
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.EXPIRES_AFTER),
    ).toHaveTextContent(
      `${strings('bridge.recurring.expires_after')}180 ${strings('bridge.recurring.unit_plural.day')}`,
    );
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.SLIPPAGE),
    ).toHaveTextContent(`${strings('bridge.recurring.slippage_all_orders')}2%`);
  });

  it('shows placeholders for est receiving and network fee when there is no quote', () => {
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        isLoading: false,
        destTokenAmount: undefined,
        formattedQuoteData: undefined,
      }));

    const { getByTestId, queryByTestId } = renderSheet();

    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_per_order')}--`,
    );
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_all_orders')}--`,
    );
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_network_fee_per_order')}-`,
    );
    expect(
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER_SKELETON,
      ),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('opens the shared slippage sheet from the edit control', () => {
    const { getByTestId } = renderSheet();

    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.SLIPPAGE_EDIT),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: '0x1',
        destChainId: '0xa',
      },
    });
  });

  it('calls onClose when Confirm is pressed', () => {
    const onClose = jest.fn();

    const { getByTestId } = renderSheet({ onClose });

    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the header close is pressed', () => {
    const onClose = jest.fn();

    const { getByTestId } = renderSheet({ onClose });

    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
