import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { mockTheme } from '../../../../../../util/theme';
import { RequestStatus } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { mockUseBridgeQuoteData } from '../../../_mocks_/useBridgeQuoteData.mock';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { mockQuoteWithMetadata } from '../../../_mocks_/bridgeQuoteWithMetadata';
import { createBridgeTestState } from '../../../testUtils';
import type { RootState } from '../../../../../../reducers';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { BridgeRecurringBuyFooterView } from './BridgeRecurringBuyFooterView';
import { strings } from '../../../../../../../locales/i18n';
import { formatMinimumReceived } from '../../../utils/currencyUtils';
import {
  initialRecurringState,
  RECURRING_INTERVAL_UNITS,
} from '../../../utils/recurringSchedule';

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

jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  useBridgeQuoteDataContext: jest
    .fn()
    .mockImplementation(() => mockUseBridgeQuoteData),
}));

/**
 * Builds Redux state that satisfies BridgeRecurringBuyFooterView render
 * conditions: active quote, valid source amount, and quotesLastFetched.
 *
 * CV cannot cover these branches: Recurring remounts on tab switch and
 * resets the token pair, which clears seeded BridgeController quotes before
 * the footer can read them.
 */
function buildActiveQuoteState(
  overrides: {
    bridgeControllerOverrides?: Record<string, unknown>;
    bridgeReducerOverrides?: Record<string, unknown>;
  } = {},
) {
  return createBridgeTestState({
    bridgeControllerOverrides: {
      quotesLoadingStatus: RequestStatus.FETCHED,
      quotes: [mockQuoteWithMetadata],
      quotesLastFetched: Date.now(),
      ...(overrides.bridgeControllerOverrides ?? {}),
    },
    bridgeReducerOverrides: {
      sourceAmount: '120',
      sourceToken: {
        address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
        chainId: '0x1' as Hex,
        decimals: 6,
        image: '',
        name: 'USD Coin',
        symbol: 'USDC',
      },
      ...(overrides.bridgeReducerOverrides ?? {}),
    },
  });
}

function renderFooter(
  state: DeepPartial<RootState>,
  {
    onPreviewOrder = jest.fn(),
    label = strings('bridge.recurring.preview_order'),
    destinationTokenSymbol = 'ETH',
    isBelowMinAmount = false,
    isPreviewDisabled,
  }: {
    onPreviewOrder?: () => void;
    label?: string;
    destinationTokenSymbol?: string | null;
    isBelowMinAmount?: boolean;
    isPreviewDisabled?: boolean;
  } = {},
) {
  return renderWithProvider(
    <BridgeRecurringBuyFooterView
      onPreviewOrder={onPreviewOrder}
      label={label}
      destinationTokenSymbol={destinationTokenSymbol ?? undefined}
      isBelowMinAmount={isBelowMinAmount}
      isPreviewDisabled={isPreviewDisabled}
    />,
    { state },
  );
}

describe('BridgeRecurringBuyFooterView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useBridgeQuoteDataContext)
      .mockImplementation(() => mockUseBridgeQuoteData);
  });

  it('renders a disabled loading button while fetching the initial quote', () => {
    jest.mocked(useBridgeQuoteDataContext).mockImplementation(() => ({
      ...mockUseBridgeQuoteData,
      isLoading: true,
      activeQuote: null,
    }));
    const state = buildActiveQuoteState({
      bridgeControllerOverrides: {
        quotes: [],
        quotesLastFetched: null,
      },
    });

    const { getByTestId } = renderFooter(state);

    const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
    expect(button).toBeOnTheScreen();
    expect(button.props.accessibilityState?.busy).toBe(true);
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('renders the minimum without loading when a below-minimum quote is pending', () => {
    jest.mocked(useBridgeQuoteDataContext).mockImplementation(() => ({
      ...mockUseBridgeQuoteData,
      isLoading: true,
      activeQuote: null,
    }));
    const label = strings('bridge.recurring.min_order_amount', {
      amount: '$100.00',
    });
    const state = buildActiveQuoteState({
      bridgeControllerOverrides: {
        quotes: [],
        quotesLastFetched: null,
      },
    });

    const { getByTestId } = renderFooter(state, {
      label,
      isBelowMinAmount: true,
    });

    const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
    expect(button).toHaveTextContent(label);
    expect(button.props.accessibilityState?.busy).not.toBe(true);
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('renders nothing when there is no active quote', () => {
    jest.mocked(useBridgeQuoteDataContext).mockImplementation(() => ({
      ...mockUseBridgeQuoteData,
      isLoading: false,
      activeQuote: null,
    }));

    const { queryByTestId } = renderFooter(buildActiveQuoteState());

    expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
  });

  it('renders nothing when source amount is missing', () => {
    const state = buildActiveQuoteState({
      bridgeReducerOverrides: { sourceAmount: undefined },
    });

    const { queryByTestId } = renderFooter(state);

    expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
  });

  it('renders nothing when quotesLastFetched is null', () => {
    const state = buildActiveQuoteState({
      bridgeControllerOverrides: { quotesLastFetched: null },
    });

    const { queryByTestId } = renderFooter(state);

    expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
  });

  it('renders the confirm button when quote, amount, and last-fetched are set', () => {
    const { getByTestId } = renderFooter(buildActiveQuoteState());

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).toHaveTextContent(strings('bridge.recurring.preview_order'));
  });

  it('renders the supplied confirm button label', () => {
    const label = strings('bridge.recurring.min_order_amount', {
      amount: '€90.00',
    });

    const { getByTestId } = renderFooter(buildActiveQuoteState(), { label });

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).toHaveTextContent(label);
  });

  it('shows the confirm button as loading when the quote is refreshing', () => {
    jest.mocked(useBridgeQuoteDataContext).mockImplementation(() => ({
      ...mockUseBridgeQuoteData,
      isLoading: true,
    }));

    const { getByTestId } = renderFooter(buildActiveQuoteState());

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.busy,
    ).toBe(true);
  });

  it('calls onPreviewOrder when Preview Order is pressed', () => {
    const onPreviewOrder = jest.fn();

    const { getByTestId } = renderFooter(buildActiveQuoteState(), {
      onPreviewOrder,
    });

    fireEvent.press(getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON));

    expect(onPreviewOrder).toHaveBeenCalledTimes(1);
  });

  it('does not call onPreviewOrder when Preview Order is disabled', () => {
    const onPreviewOrder = jest.fn();

    const { getByTestId } = renderFooter(buildActiveQuoteState(), {
      onPreviewOrder,
      isPreviewDisabled: true,
    });

    fireEvent.press(getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON));

    expect(onPreviewOrder).not.toHaveBeenCalled();
  });

  it('renders the spend summary for the default schedule', () => {
    const { getByTestId } = renderFooter(buildActiveQuoteState());

    expect(
      getByTestId(BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY),
    ).toHaveTextContent(
      'Swapping 120 USDC for ETH every hour. Repeats 10 times.',
    );
  });

  it.each(RECURRING_INTERVAL_UNITS)(
    'uses the plural %s unit when every is greater than 1',
    (everyUnit) => {
      const { getByTestId } = renderFooter(
        buildActiveQuoteState({
          bridgeReducerOverrides: {
            recurring: {
              ...initialRecurringState,
              everyValue: '2',
              everyUnit,
            },
          },
        }),
      );

      expect(
        getByTestId(BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY),
      ).toHaveTextContent(
        `Swapping 120 USDC for ETH every 2 ${strings(
          `bridge.recurring.unit_plural.${everyUnit}`,
        )}. Repeats 10 times.`,
      );
    },
  );

  it('uses once when repeat count is 1', () => {
    const { getByTestId } = renderFooter(
      buildActiveQuoteState({
        bridgeReducerOverrides: {
          recurring: {
            ...initialRecurringState,
            repeatCount: '1',
          },
        },
      }),
    );

    expect(
      getByTestId(BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY),
    ).toHaveTextContent('Swapping 120 USDC for ETH every hour. Repeats once.');
  });

  it('renders copy in muted grey with user values in white at the same weight', () => {
    const { getByTestId, getByText } = renderFooter(buildActiveQuoteState());

    const summary = getByTestId(BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY);
    const highlightedValues = [
      getByText('120 USDC'),
      getByText('ETH'),
      getByText('hour'),
      getByText('10 times'),
    ];

    expect(summary).toHaveStyle({
      color: mockTheme.colors.text.alternative,
    });
    highlightedValues.forEach((value) => {
      expect(value).toHaveStyle({ color: mockTheme.colors.text.default });
      expect(StyleSheet.flatten(value.props.style).fontFamily).toBe(
        StyleSheet.flatten(summary.props.style).fontFamily,
      );
    });
  });

  it('caps spend summary amount decimals like market min received', () => {
    const sourceAmount = '1.123456789012';
    const { getByTestId } = renderFooter(
      buildActiveQuoteState({
        bridgeReducerOverrides: { sourceAmount },
      }),
    );

    expect(
      getByTestId(BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY),
    ).toHaveTextContent(
      `Swapping ${formatMinimumReceived(
        sourceAmount,
      )} USDC for ETH every hour. Repeats 10 times.`,
    );
  });

  it('hides the spend summary when repeat count is empty', () => {
    const { getByTestId, queryByTestId } = renderFooter(
      buildActiveQuoteState({
        bridgeReducerOverrides: {
          recurring: {
            ...initialRecurringState,
            repeatCount: '',
          },
        },
      }),
    );

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY),
    ).toBeNull();
  });

  it('hides the spend summary when source amount is missing', () => {
    const { queryByTestId } = renderFooter(
      buildActiveQuoteState({
        bridgeReducerOverrides: { sourceAmount: undefined },
      }),
    );

    expect(
      queryByTestId(BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY),
    ).toBeNull();
  });

  it('hides the spend summary when destination token is missing', () => {
    const { queryByTestId } = renderFooter(buildActiveQuoteState(), {
      destinationTokenSymbol: null,
    });

    expect(
      queryByTestId(BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY),
    ).toBeNull();
  });
});
