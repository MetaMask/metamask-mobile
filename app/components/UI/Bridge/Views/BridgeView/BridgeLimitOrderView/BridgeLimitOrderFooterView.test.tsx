import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { RequestStatus } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';
import { mockUseBridgeQuoteData } from '../../../_mocks_/useBridgeQuoteData.mock';
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
 * conditions: a valid source amount and a quotesLastFetched timestamp.
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

function renderFooter(
  state: DeepPartial<RootState>,
  props: { onCTAPress?: () => void; ctaDisabled?: boolean } = {},
) {
  return renderWithProvider(
    <BridgeLimitOrderFooterView
      onCTAPress={props.onCTAPress ?? jest.fn()}
      ctaLabel="Create Order"
      ctaDisabled={props.ctaDisabled}
    />,
    { state },
  );
}

describe('BridgeLimitOrderFooterView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('renders an enabled confirm button when ctaDisabled is not set', () => {
    const { getByTestId } = renderFooter(buildActiveQuoteState());

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBeFalsy();
  });

  it('disables the confirm button when ctaDisabled is true', () => {
    const { getByTestId } = renderFooter(buildActiveQuoteState(), {
      ctaDisabled: true,
    });

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('calls onCTAPress when the confirm button is pressed', () => {
    const onCTAPress = jest.fn();

    const { getByTestId } = renderFooter(buildActiveQuoteState(), {
      onCTAPress,
    });
    fireEvent.press(getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON));

    expect(onCTAPress).toHaveBeenCalledTimes(1);
  });
});
