import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { RequestStatus } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { mockUseBridgeQuoteData } from '../../../_mocks_/useBridgeQuoteData.mock';
import { useBridgeQuoteData } from '../../../hooks/useBridgeQuoteData';
import { mockQuoteWithMetadata } from '../../../_mocks_/bridgeQuoteWithMetadata';
import { createBridgeTestState } from '../../../testUtils';
import type { RootState } from '../../../../../../reducers';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { BridgeRecurringBuyFooterView } from './BridgeRecurringBuyFooterView';
import { strings } from '../../../../../../../locales/i18n';
import { formatMinimumReceived } from '../../../utils/currencyUtils';
import { initialRecurringState } from '../../../utils/recurringSchedule';

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
  useBridgeQuoteData: jest
    .fn()
    .mockImplementation(() => mockUseBridgeQuoteData),
}));

jest.mock('../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => {
  const { useBridgeQuoteData } = jest.requireMock(
    '../../../hooks/useBridgeQuoteData',
  );
  return {
    useBridgeQuoteDataContext: jest.fn(() => useBridgeQuoteData()),
  };
});

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
      sourceAmount: '1.0',
      sourceToken: {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x1' as Hex,
        decimals: 18,
        image: '',
        name: 'Ether',
        symbol: 'ETH',
      },
      ...(overrides.bridgeReducerOverrides ?? {}),
    },
  });
}

function renderFooter(
  state: DeepPartial<RootState>,
  {
    onPreviewOrder = jest.fn(),
    isPreviewDisabled,
  }: {
    onPreviewOrder?: () => void;
    isPreviewDisabled?: boolean;
  } = {},
) {
  return renderWithProvider(
    <BridgeRecurringBuyFooterView
      onPreviewOrder={onPreviewOrder}
      isPreviewDisabled={isPreviewDisabled}
    />,
    { state },
  );
}

describe('BridgeRecurringBuyFooterView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => mockUseBridgeQuoteData);
  });

  it('renders nothing when loading without an active quote', () => {
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockUseBridgeQuoteData,
        isLoading: true,
        activeQuote: null,
      }));

    const { queryByTestId } = renderFooter(buildActiveQuoteState());

    expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
  });

  it('renders nothing when there is no active quote', () => {
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
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

  it('shows the confirm button as loading when the quote is refreshing', () => {
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
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
      strings('bridge.recurring.spend_summary', {
        amount: formatMinimumReceived('1.0'),
        symbol: 'ETH',
        everyValue: '1',
        unit: strings('bridge.recurring.unit.hour'),
        repeatCount: '10',
      }),
    );
  });

  it('uses the plural unit when every is greater than 1', () => {
    const { getByTestId } = renderFooter(
      buildActiveQuoteState({
        bridgeReducerOverrides: {
          recurring: {
            ...initialRecurringState,
            everyValue: '2',
          },
        },
      }),
    );

    expect(
      getByTestId(BridgeViewSelectorsIDs.RECURRING_SPEND_SUMMARY),
    ).toHaveTextContent(
      strings('bridge.recurring.spend_summary', {
        amount: formatMinimumReceived('1.0'),
        symbol: 'ETH',
        everyValue: '2',
        unit: strings('bridge.recurring.unit_plural.hour'),
        repeatCount: '10',
      }),
    );
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
      strings('bridge.recurring.spend_summary', {
        amount: formatMinimumReceived(sourceAmount),
        symbol: 'ETH',
        everyValue: '1',
        unit: strings('bridge.recurring.unit.hour'),
        repeatCount: '10',
      }),
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
});
