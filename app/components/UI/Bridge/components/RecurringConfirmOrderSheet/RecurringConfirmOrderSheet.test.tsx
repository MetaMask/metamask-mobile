import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { ThemeProvider, Theme } from '@metamask/design-system-twrnc-preset';
import { brandColor, darkTheme } from '@metamask/design-tokens';
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
import { BridgeTabKey } from '../../Views/BridgeView/BridgeView.constants';
import { createBridgeTestState } from '../../testUtils';
import type { RootState } from '../../../../../reducers';
import { strings } from '../../../../../../locales/i18n';
import RecurringConfirmOrderSheet from './RecurringConfirmOrderSheet';
import { RecurringConfirmOrderSheetSelectorsIDs } from './RecurringConfirmOrderSheet.testIds';
import { formatMinimumReceived } from '../../utils/currencyUtils';
import { multiplyAmountByCount } from '../../utils/recurringConfirmTotals';
import type { EIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';

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

jest.mock('../../../Rewards/hooks/useVipTier', () => ({
  useVipTier: () => null,
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
  currentCurrency = 'USD',
  delegationFee = {
    status: 'ready',
    displayFee: '$1.23',
    preciseNativeFeeInHex: '0x1',
    retry: jest.fn(),
  },
  fiatToUsdRate = 1,
  goBack = jest.fn(),
  isPriceRangeConversionReady = true,
  isSubmitting = false,
  onConfirm = jest.fn(),
  onDelegationFeeInfoPress = jest.fn(),
  state = buildState(),
  latestSourceBalance = SUFFICIENT_SOURCE_BALANCE,
  theme = Theme.Light,
}: {
  currentCurrency?: string;
  delegationFee?: EIP7702UpgradeFee;
  fiatToUsdRate?: number;
  goBack?: () => void;
  isPriceRangeConversionReady?: boolean;
  isSubmitting?: boolean;
  onConfirm?: () => void;
  onDelegationFeeInfoPress?: () => void;
  state?: DeepPartial<RootState>;
  latestSourceBalance?:
    | { displayBalance: string; atomicBalance: BigNumber }
    | undefined;
  theme?: Theme;
} = {}) {
  jest.mocked(useBridgeSession).mockReturnValue({
    selectedTab: BridgeTabKey.Recurring,
    renderedTab: BridgeTabKey.Recurring,
    setSelectedTab: jest.fn(),
    setRenderedTab: jest.fn(),
    latestSourceBalance,
    quoteParams: {},
    setQuoteParams: jest.fn(),
  });
  return renderWithProvider(
    <ThemeProvider theme={theme}>
      <RecurringConfirmOrderSheet
        currentCurrency={currentCurrency}
        delegationFee={delegationFee}
        fiatToUsdRate={fiatToUsdRate}
        isPriceRangeConversionReady={isPriceRangeConversionReady}
        isSubmitting={isSubmitting}
        onConfirm={onConfirm}
        onDelegationFeeInfoPress={onDelegationFeeInfoPress}
        goBack={goBack}
      />
    </ThemeProvider>,
    { state },
  );
}

const flattenStyle = (node: { props: Record<string, unknown> }) =>
  StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>);

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

  it('shows source placeholders when the source amount is unavailable', () => {
    const { getByTestId } = renderSheet({
      state: buildState({ sourceAmount: undefined }),
    });

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PAYING_PER_ORDER),
    ).toHaveTextContent(`${strings('bridge.recurring.paying_per_order')}--`);
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PAYING_ALL_ORDERS),
    ).toHaveTextContent(`${strings('bridge.recurring.paying_all_orders')}--`);
  });

  it('shows dest token as receiving without an amount', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.RECEIVING),
    ).toHaveTextContent(`${strings('bridge.recurring.receiving')}USDC`);
  });

  it('paints token avatars with the sheet surface instead of white in dark mode', () => {
    const { getByTestId } = renderSheet({ theme: Theme.Dark });

    const receivingTokenStyle = flattenStyle(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.RECEIVING_TOKEN),
    );
    const delegationFeeTokenStyle = flattenStyle(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE_TOKEN),
    );

    expect(receivingTokenStyle.backgroundColor).toBe(
      darkTheme.colors.background.elevated1,
    );
    expect(receivingTokenStyle.backgroundColor).not.toBe(brandColor.white);
    expect(delegationFeeTokenStyle.backgroundColor).toBe(
      darkTheme.colors.background.elevated1,
    );
  });

  it('shows the stored currency range with its selected token', () => {
    const { getByTestId } = renderSheet({
      state: buildState({
        recurring: {
          everyValue: '1',
          everyUnit: 'day',
          repeatCount: '10',
          priceRange: {
            tokenSide: 'source',
            currency: 'EUR',
            min: '900',
            max: '1100',
          },
        },
      }),
    });

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PRICE_RANGE),
    ).toHaveTextContent(
      `${strings('bridge.recurring.price_range.label')}€900.00 - €1,100.00`,
    );
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PRICE_RANGE_TOKEN),
    ).toBeOnTheScreen();
  });

  it('shows Not set when no price range exists', () => {
    const { getByTestId, queryByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PRICE_RANGE),
    ).toHaveTextContent(
      `${strings('bridge.recurring.price_range.label')}${strings(
        'bridge.recurring.price_range.not_set',
      )}`,
    );
    expect(
      queryByTestId(RecurringConfirmOrderSheetSelectorsIDs.PRICE_RANGE_TOKEN),
    ).not.toBeOnTheScreen();
  });

  it('uses the destination token for a destination-side price range', () => {
    const { getByTestId } = renderSheet({
      state: buildState({
        sourceToken: undefined,
        recurring: {
          everyValue: '1',
          everyUnit: 'day',
          repeatCount: '10',
          priceRange: {
            tokenSide: 'dest',
            currency: 'USD',
            min: '20',
            max: '30',
          },
        },
      }),
    });

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PRICE_RANGE_TOKEN),
    ).toBeOnTheScreen();
  });

  it('shows the local currency notice when EUR is selected for a configured range', () => {
    const state = buildState({
      recurring: {
        everyValue: '1',
        everyUnit: 'day',
        repeatCount: '10',
        priceRange: {
          tokenSide: 'source',
          currency: 'EUR',
          min: '900',
          max: '1100',
        },
      },
    });

    const { getByTestId } = renderSheet({
      currentCurrency: 'EUR',
      fiatToUsdRate: 0.5,
      state,
    });

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.LOCAL_CURRENCY_NOTICE),
    ).toHaveTextContent(
      strings('bridge.recurring.local_currency_notice', {
        rate: '2.00',
        currency: 'EUR',
      }),
    );
  });

  it('shows an unavailable rate when the fiat conversion rate is invalid', () => {
    const state = buildState({
      recurring: {
        everyValue: '1',
        everyUnit: 'day',
        repeatCount: '10',
        priceRange: {
          tokenSide: 'source',
          currency: 'EUR',
          min: '900',
          max: '1100',
        },
      },
    });

    const { getByTestId } = renderSheet({
      currentCurrency: 'EUR',
      fiatToUsdRate: 0,
      state,
    });

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.LOCAL_CURRENCY_NOTICE),
    ).toHaveTextContent(
      strings('bridge.recurring.local_currency_notice', {
        rate: '--',
        currency: 'EUR',
      }),
    );
  });

  it('hides the local currency notice when USD is selected', () => {
    const state = buildState({
      recurring: {
        everyValue: '1',
        everyUnit: 'day',
        repeatCount: '10',
        priceRange: {
          tokenSide: 'source',
          currency: 'USD',
          min: '900',
          max: '1100',
        },
      },
    });

    const { queryByTestId } = renderSheet({ state });

    expect(
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.LOCAL_CURRENCY_NOTICE,
      ),
    ).not.toBeOnTheScreen();
  });

  it('hides the local currency notice when no price range is set', () => {
    const state = buildState();

    const { queryByTestId } = renderSheet({
      currentCurrency: 'EUR',
      state,
    });

    expect(
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.LOCAL_CURRENCY_NOTICE,
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows destination token metadata for estimated amounts', () => {
    const { getByTestId, queryByTestId } = renderSheet();

    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_per_order')}24.44 USDC`,
    );
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_all_orders')}244.4 USDC`,
    );
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER_TOKEN,
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS_TOKEN,
      ),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER_SKELETON,
      ),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS_SKELETON,
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
      `${strings('bridge.recurring.est_receiving_per_order')}${formatMinimumReceived(destTokenAmount)} USDC`,
    );
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_all_orders')}${formatMinimumReceived(receivingAll ?? destTokenAmount)} USDC`,
    );
  });

  it('omits the global expiry limit from confirmation', () => {
    const { queryByText } = renderSheet();

    expect(
      queryByText(strings('bridge.recurring.expires_after')),
    ).not.toBeOnTheScreen();
  });

  it('shows the default recurring price tolerance when unset', () => {
    const { getByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PRICE_TOLERANCE),
    ).toHaveTextContent(`${strings('bridge.cost_tolerance')}3%`);
  });

  it('shows the recurring price tolerance override when set', () => {
    const { getByTestId } = renderSheet({
      state: buildState({
        recurringPriceTolerance: '2',
      }),
    });

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PRICE_TOLERANCE),
    ).toHaveTextContent(`${strings('bridge.cost_tolerance')}2%`);
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

  it('keeps paying, receiving, and price tolerance populated while a quote is loading', () => {
    jest.mocked(useBridgeQuoteDataContext).mockImplementation(() => ({
      ...mockUseBridgeQuoteData,
      isLoading: true,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
    }));

    const { getByTestId } = renderSheet({
      state: buildState({ recurringPriceTolerance: '2' }),
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
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.PRICE_TOLERANCE),
    ).toHaveTextContent(`${strings('bridge.cost_tolerance')}2%`);
  });

  it('omits the global expiry limit while a quote is loading', () => {
    jest.mocked(useBridgeQuoteDataContext).mockImplementation(() => ({
      ...mockUseBridgeQuoteData,
      isLoading: true,
    }));

    const { queryByText } = renderSheet();

    expect(
      queryByText(strings('bridge.recurring.expires_after')),
    ).not.toBeOnTheScreen();
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
      `${strings('bridge.recurring.est_receiving_per_order')}-- USDC`,
    );
    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS,
      ),
    ).toHaveTextContent(
      `${strings('bridge.recurring.est_receiving_all_orders')}-- USDC`,
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

  it('omits destination metadata when the destination token is unavailable', () => {
    const { getByTestId, queryByTestId } = renderSheet({
      state: buildState({ destToken: undefined }),
    });

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
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER_TOKEN,
      ),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS_TOKEN,
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

  it('shows the Member badge and no-fee copy for a subscription discount', () => {
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
                  quoteBpsFee: 0.004156,
                  baseBpsFee: 87.5,
                  discountType: 'subscription',
                },
              ],
            },
          },
        },
      }));

    const { getByTestId, queryByTestId } = renderSheet();

    expect(getByTestId('rewards-member-badge')).toHaveTextContent(
      strings('rewards.pro_member_badge_label'),
    );
    expect(queryByTestId('rewards-discount-badge')).not.toBeOnTheScreen();
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.FEE_DISCLAIMER),
    ).toHaveTextContent(
      `${strings('rewards.pro_member_badge_label')}${strings('bridge.fee_percentage', { feePercentage: 0.875 })}${strings('bridge.no_fees_with_orange')}`,
    );
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.FEE_DISCLAIMER),
    ).not.toHaveTextContent('MetaMask fee');
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

  it('shows the estimated one-time delegation fee and native token', () => {
    const { getByTestId, queryByTestId } = renderSheet();

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE),
    ).toHaveTextContent('Account upgrade fee$1.23');
    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE_TOKEN),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE_SKELETON,
      ),
    ).not.toBeOnTheScreen();
  });

  it('includes the delegation fee in the gas balance check', () => {
    renderSheet({
      delegationFee: {
        status: 'ready',
        displayFee: '$1.23',
        preciseNativeFeeInHex: '0x123',
        retry: jest.fn(),
      },
    });

    expect(useHasSufficientGas).toHaveBeenCalledWith({
      additionalGasFeeInHex: '0x123',
      quote: mockUseBridgeQuoteData.activeQuote,
    });
  });

  it('hides the delegation fee row and disables Confirm while checking whether an upgrade is required', () => {
    const onConfirm = jest.fn();
    const { getByTestId, queryByTestId } = renderSheet({
      delegationFee: { status: 'checking', retry: jest.fn() },
      onConfirm,
    });

    expect(
      queryByTestId(RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE),
    ).not.toBeOnTheScreen();
    const confirmButton = getByTestId(
      RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
    );

    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows a skeleton and disables Confirm while estimating delegation fee', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderSheet({
      delegationFee: { status: 'loading', retry: jest.fn() },
      onConfirm,
    });

    expect(
      getByTestId(
        RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE_SKELETON,
      ),
    ).toBeOnTheScreen();
    const confirmButton = getByTestId(
      RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
    );

    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('hides the delegation fee row when an upgrade is not required', () => {
    const onConfirm = jest.fn();
    const { getByTestId, queryByTestId } = renderSheet({
      delegationFee: { status: 'not-required', retry: jest.fn() },
      onConfirm,
    });

    expect(
      queryByTestId(RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE),
    ).not.toBeOnTheScreen();
    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON),
    );
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows a placeholder and disables Confirm when estimation fails', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderSheet({
      delegationFee: { status: 'error', retry: jest.fn() },
      onConfirm,
    });

    expect(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE),
    ).toHaveTextContent('Account upgrade fee--');
    const confirmButton = getByTestId(
      RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
    );

    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls the delegation fee info handler from the info control', () => {
    const onDelegationFeeInfoPress = jest.fn();
    const { getByTestId } = renderSheet({ onDelegationFeeInfoPress });

    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE_INFO),
    );

    expect(onDelegationFeeInfoPress).toHaveBeenCalledTimes(1);
  });

  it('calls the confirm handler when Confirm is pressed', () => {
    const onConfirm = jest.fn();

    const { getByTestId } = renderSheet({ onConfirm });

    fireEvent.press(
      getByTestId(RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON),
    );

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading and disables Confirm while submitting', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderSheet({
      isSubmitting: true,
      onConfirm,
    });

    const confirmButton = getByTestId(
      RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
    );

    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    fireEvent.press(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables Confirm while the price range conversion is pending', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = renderSheet({
      isPriceRangeConversionReady: false,
      onConfirm,
    });

    const confirmButton = getByTestId(
      RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
    );
    fireEvent.press(confirmButton);

    expect(confirmButton.props.accessibilityState?.disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
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
