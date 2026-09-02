import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { RequestStatus } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { mockUseBridgeQuoteData } from '../../../_mocks_/useBridgeQuoteData.mock';
import { useBridgeQuoteData } from '../../../hooks/useBridgeQuoteData';
import { mockQuoteWithMetadata } from '../../../_mocks_/bridgeQuoteWithMetadata';
import { ethToken1Address } from '../../../_mocks_/initialState';
import { createBridgeTestState, createMockToken } from '../../../testUtils';
import type { RootState } from '../../../../../../reducers';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { BridgeLimitOrderFooterView } from './BridgeLimitOrderFooterView';

const pricedDestToken = createMockToken({
  address: ethToken1Address,
  symbol: 'TOKEN1',
});
const unpricedDestToken = createMockToken({
  address: '0x00000000000000000000000000000000000000ff',
  symbol: 'MUSD',
});

const quoteWithPriceImpact = {
  ...mockQuoteWithMetadata,
  quote: {
    ...mockQuoteWithMetadata.quote,
    priceData: {
      ...mockQuoteWithMetadata.quote.priceData,
      priceImpact: { amount: '0.01' },
    },
  },
};

const quoteWithoutPriceImpact = {
  ...mockQuoteWithMetadata,
  quote: {
    ...mockQuoteWithMetadata.quote,
    priceData: undefined,
  },
};

const mockQuoteDataWithPriceImpact = {
  ...mockUseBridgeQuoteData,
  activeQuote: quoteWithPriceImpact,
};

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
 * Builds Redux state that satisfies BridgeLimitOrderFooterView render
 * conditions: active quote, valid source amount, and quotesLastFetched.
 *
 * CV cannot cover these branches: Limit remounts on tab switch and resets
 * the token pair, which clears seeded BridgeController quotes before the
 * footer can read them.
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
      destToken: pricedDestToken,
      ...(overrides.bridgeReducerOverrides ?? {}),
    },
  });
}

function renderFooter(state: DeepPartial<RootState>) {
  return renderWithProvider(<BridgeLimitOrderFooterView />, { state });
}

describe('BridgeLimitOrderFooterView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => mockQuoteDataWithPriceImpact);
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
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBeFalsy();
  });

  it('disables the confirm button when the quote has no price data', () => {
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockQuoteDataWithPriceImpact,
        activeQuote: quoteWithoutPriceImpact,
      }));

    const { getByTestId } = renderFooter(buildActiveQuoteState());

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('disables the confirm button when a selected token has no fiat rate', () => {
    const { getByTestId } = renderFooter(
      buildActiveQuoteState({
        bridgeReducerOverrides: { destToken: unpricedDestToken },
      }),
    );

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('keeps the confirm button enabled while the quote is for a previous token pair', () => {
    jest
      .mocked(useBridgeQuoteData as unknown as jest.Mock)
      .mockImplementation(() => ({
        ...mockQuoteDataWithPriceImpact,
        isActiveQuoteForCurrentTokenPair: false,
        activeQuote: quoteWithoutPriceImpact,
      }));

    const { getByTestId } = renderFooter(
      buildActiveQuoteState({
        bridgeReducerOverrides: { destToken: unpricedDestToken },
      }),
    );

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBeFalsy();
  });
});
