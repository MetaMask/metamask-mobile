import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { BigNumber } from 'ethers';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';
import { mockUseBridgeQuoteData } from '../../_mocks_/useBridgeQuoteData.mock';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { BRIDGE_MM_FEE_RATE } from '@metamask/bridge-controller';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useBridgeSession } from '../../hooks/useBridgeSession';
import { useHasSufficientGas } from '../../hooks/useHasSufficientGas';
import { createBridgeTestState } from '../../testUtils';
import type { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import RecurringConfirmOrderSheet from './RecurringConfirmOrderSheet';
import { RecurringConfirmOrderSheetSelectorsIDs } from './RecurringConfirmOrderSheet.testIds';
import { formatMinimumReceived } from '../../utils/currencyUtils';
import { multiplyAmountByCount } from '../../utils/recurringConfirmTotals';

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
          goBack?: () => void;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: () => props.goBack?.(),
        }));

        return (
          <View testID={props.testID}>{props.children as React.ReactNode}</View>
        );
      },
    ),
  };
});

jest.mock('../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest.fn(),
}));

jest.mock('../../hooks/useHasSufficientGas', () => ({
  useHasSufficientGas: jest.fn(() => true),
}));

jest.mock('../../hooks/useBridgeSession', () => ({
  useBridgeSession: jest.fn(),
}));

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

const SUFFICIENT_SOURCE_BALANCE = {
  displayBalance: '1000',
  atomicBalance: BigNumber.from('1000000000000000000000'),
};

const INSUFFICIENT_SOURCE_BALANCE = {
  displayBalance: '1',
  atomicBalance: BigNumber.from('1000000000000000000'),
};

function renderSheet({
  goBack = jest.fn(),
  onEditSlippagePress = jest.fn(),
  state = buildState(),
  latestSourceBalance = SUFFICIENT_SOURCE_BALANCE,
}: {
  goBack?: () => void;
  onEditSlippagePress?: () => void;
  state?: DeepPartial<RootState>;
  latestSourceBalance?:
    | { displayBalance: string; atomicBalance: BigNumber }
    | undefined;
} = {}) {
  jest.mocked(useBridgeSession).mockReturnValue({
    latestSourceBalance,
  } as ReturnType<typeof useBridgeSession>);
  return renderWithProvider(
    <RecurringConfirmOrderSheet
      onEditSlippagePress={onEditSlippagePress}
      goBack={goBack}
    />,
    { state },
  );
}

describe('RecurringConfirmOrderSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useBridgeQuoteDataContext as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        destTokenAmount: '24.44',
        formattedQuoteData: {
          ...mockUseBridgeQuoteData.formattedQuoteData,
          networkFee: '$1.23',
        },
      }));
    jest.mocked(useHasSufficientGas).mockReturnValue(true);
  });

  it('shows per-order source amount and the all-orders total', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PAYING_PER_ORDER),
    ).toHaveTextContent(
      `${strings('bridge.recurring.paying_per_order')}120 ETH`,
    );
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
      .mocked(useBridgeQuoteDataContext as unknown as jest.Mock)
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
    ).toHaveTextContent(
      `${strings('bridge.recurring.slippage_all_orders')}Auto`,
    );
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
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE_SKELETON,
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows skeletons for quote-dependent values while a quote is loading', () => {
    jest
      .mocked(useBridgeQuoteDataContext as unknown as jest.Mock)
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
    jest.mocked(useBridgeQuoteDataContext).mockImplementation(() => ({
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
    ).toHaveTextContent(
      `${strings('bridge.recurring.paying_per_order')}120 ETH`,
    );
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
    jest.mocked(useBridgeQuoteDataContext).mockImplementation(() => ({
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
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE_SKELETON,
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows the MetaMask fee disclaimer from the quote', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.FEE_DISCLAIMER),
    ).toHaveTextContent(
      strings('bridge.fee_disclaimer', { feePercentage: BRIDGE_MM_FEE_RATE }),
    );
  });

  it('shows the discounted fee disclaimer when the quote has a promo discount', () => {
    jest
      .mocked(useBridgeQuoteDataContext as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        destTokenAmount: '24.44',
        formattedQuoteData: {
          ...mockUseBridgeQuoteData.formattedQuoteData,
          networkFee: '$1.23',
        },
        activeQuote: {
          ...mockQuoteWithMetadata,
          quote: {
            ...mockQuoteWithMetadata.quote,
            feeData: {
              metabridge: [
                {
                  quoteBpsFee: 0,
                  baseBpsFee: 87.5,
                  discountType: 'promo',
                },
              ],
            },
          },
        },
      }));

    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.FEE_DISCLAIMER),
    ).toHaveTextContent(
      `${strings('bridge.discount_badge_promo')}${strings('bridge.fee_percentage', { feePercentage: 0.875 })}${strings('bridge.fee_percentage_meta_mask', { feePercentage: 0 })}`,
    );
  });

  it('shows the no MetaMask fee disclaimer when dest fee is zero', () => {
    jest
      .mocked(useBridgeQuoteDataContext as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        destTokenAmount: '24.44',
        formattedQuoteData: {
          ...mockUseBridgeQuoteData.formattedQuoteData,
          networkFee: '$1.23',
        },
        activeQuote: {
          ...mockQuoteWithMetadata,
          quote: {
            ...mockQuoteWithMetadata.quote,
            dest: {
              ...mockQuoteWithMetadata.quote.dest,
              asset: {
                ...mockQuoteWithMetadata.quote.dest.asset,
                symbol: 'mUSD',
              },
            },
            feeData: { metabridge: [{ quoteBpsFee: 0, baseBpsFee: 87.5 }] },
          },
        },
      }));

    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.FEE_DISCLAIMER),
    ).toHaveTextContent(
      strings('bridge.no_mm_fee_disclaimer', { destTokenSymbol: 'mUSD' }),
    );
  });

  it('calls the slippage edit handler from the edit control', () => {
    const onEditSlippagePress = jest.fn();
    const { getByTestId } = renderSheet({ onEditSlippagePress });

    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.SLIPPAGE_EDIT),
    );

    expect(onEditSlippagePress).toHaveBeenCalledTimes(1);
  });

  it('goes back when Confirm is pressed', () => {
    const goBack = jest.fn();

    const { getByTestId } = renderSheet({ goBack });

    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('goes back when the header close is pressed', () => {
    const goBack = jest.fn();

    const { getByTestId } = renderSheet({ goBack });

    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('disables Confirm and shows Insufficient funds when source balance is below the per-order amount', () => {
    const goBack = jest.fn();
    const { getByTestId } = renderSheet({
      latestSourceBalance: INSUFFICIENT_SOURCE_BALANCE,
      goBack,
    });

    const confirmButton = getByTestId(
      RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
    );

    fireEvent.press(confirmButton);

    expect(confirmButton).toHaveTextContent(
      strings('bridge.insufficient_funds'),
    );
    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    expect(goBack).not.toHaveBeenCalled();
  });

  it('shows Confirm when source balance covers the per-order amount', () => {
    const { getByTestId } = renderSheet();

    const confirmButton = getByTestId(
      RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
    );

    expect(confirmButton).toHaveTextContent(
      strings('bridge.recurring.confirm'),
    );
    expect(confirmButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('closes from the header when Confirm is disabled for insufficient funds', () => {
    const goBack = jest.fn();
    const { getByTestId } = renderSheet({
      latestSourceBalance: INSUFFICIENT_SOURCE_BALANCE,
      goBack,
    });

    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('disables Confirm and shows Insufficient gas when native gas is short', () => {
    jest.mocked(useHasSufficientGas).mockReturnValue(false);

    const { getByTestId } = renderSheet({
      latestSourceBalance: SUFFICIENT_SOURCE_BALANCE,
    });

    const confirmButton = getByTestId(
      RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
    );

    expect(confirmButton).toHaveTextContent(strings('bridge.insufficient_gas'));
    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows Insufficient funds when source balance and gas are both short', () => {
    jest.mocked(useHasSufficientGas).mockReturnValue(false);

    const { getByTestId } = renderSheet({
      latestSourceBalance: INSUFFICIENT_SOURCE_BALANCE,
    });

    const confirmButton = getByTestId(
      RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
    );

    expect(confirmButton).toHaveTextContent(
      strings('bridge.insufficient_funds'),
    );
    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
  });
});
