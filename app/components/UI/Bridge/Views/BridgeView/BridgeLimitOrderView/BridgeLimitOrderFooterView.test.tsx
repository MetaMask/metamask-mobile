import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';
import { ethToken1Address } from '../../../_mocks_/initialState';
import { createBridgeTestState, createMockToken } from '../../../testUtils';
import type { RootState } from '../../../../../../reducers';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import useIsInsufficientBalance from '../../../hooks/useInsufficientBalance';
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

jest.mock('../../../hooks/useInsufficientBalance', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

/**
 * Builds Redux state that satisfies the footer's only render condition: a
 * source token with decimals and a source amount that is not a bare decimal
 * point. Limit orders no longer fetch quotes, so no quote state is needed.
 *
 * CV cannot cover these branches: Limit remounts on tab switch and resets the
 * token pair, so the footer's source amount cannot be held steady from a
 * rendered screen.
 */
function buildFooterState(
  bridgeReducerOverrides: Record<string, unknown> = {},
) {
  return createBridgeTestState({
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
      ...bridgeReducerOverrides,
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
    jest.mocked(useIsInsufficientBalance).mockReturnValue(false);
  });

  it('renders nothing when source amount is missing', () => {
    const state = buildFooterState({ sourceAmount: undefined });

    const { queryByTestId } = renderFooter(state);

    expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
  });

  it('renders nothing when source amount is only a decimal point', () => {
    const state = buildFooterState({ sourceAmount: '.' });

    const { queryByTestId } = renderFooter(state);

    expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
  });

  it('renders the confirm button without waiting on a fetched quote', () => {
    const { getByTestId } = renderFooter(buildFooterState());

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders an enabled confirm button when ctaDisabled is not set', () => {
    const { getByTestId } = renderFooter(buildFooterState());

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBeFalsy();
    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.busy,
    ).not.toBe(true);
  });

  it('disables the confirm button without a loading state when ctaDisabled is true', () => {
    const { getByTestId } = renderFooter(buildFooterState(), {
      ctaDisabled: true,
    });

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.busy,
    ).not.toBe(true);
    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON),
    ).toHaveTextContent('Create Order');
  });

  it('calls onCTAPress when the confirm button is pressed', () => {
    const onCTAPress = jest.fn();

    const { getByTestId } = renderFooter(buildFooterState(), {
      onCTAPress,
    });
    fireEvent.press(getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON));

    expect(onCTAPress).toHaveBeenCalledTimes(1);
  });

  it('disables the confirm button when source balance is too low', () => {
    jest.mocked(useIsInsufficientBalance).mockReturnValue(true);

    const onCTAPress = jest.fn();
    const { getByTestId } = renderFooter(buildFooterState(), {
      onCTAPress,
    });
    fireEvent.press(getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON));

    expect(
      getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
    expect(onCTAPress).not.toHaveBeenCalled();
  });
});
