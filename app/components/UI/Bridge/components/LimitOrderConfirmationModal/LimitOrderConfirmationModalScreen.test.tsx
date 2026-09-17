import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { createBridgeTestState } from '../../testUtils';
import { setLimitOrderMarketComparison } from '../../../../../core/redux/slices/bridge';
import { LimitOrderConfirmationModalScreen } from './LimitOrderConfirmationModalScreen';
import { LimitOrderConfirmationModalSelectorsIDs } from './testIds';
import type { LimitOrderConfirmationModalParams } from './types';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
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

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

const mockSourceToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
};

const mockDestToken = {
  address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  chainId: '0xa' as Hex,
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
};

const mockParams: LimitOrderConfirmationModalParams = {
  sourceToken: mockSourceToken,
  destToken: mockDestToken,
  payingAmount: '0.1 ETH',
  triggerPrice: '$3,412.20',
  triggerToken: mockDestToken,
  expiry: '7 days',
  networkFee: '$1.69',
  feeToken: mockSourceToken,
};

function renderScreen(state?: DeepPartial<RootState>) {
  return renderWithProvider(<LimitOrderConfirmationModalScreen />, { state });
}

describe('LimitOrderConfirmationModalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(mockParams);
  });

  it('displays the cost tolerance from bridge state', () => {
    const { getByText } = renderScreen(
      createBridgeTestState({
        bridgeReducerOverrides: { limitOrderCostTolerance: '0.5' },
      }),
    );

    expect(getByText('0.5%')).toBeOnTheScreen();
  });

  it('displays the default cost tolerance when none is set in bridge state', () => {
    const { getByText } = renderScreen(
      createBridgeTestState({
        bridgeReducerOverrides: { limitOrderCostTolerance: undefined },
      }),
    );

    expect(getByText('2%')).toBeOnTheScreen();
  });

  it('navigates to the limit order default cost tolerance modal when edit is pressed', () => {
    const { getByTestId } = renderScreen(createBridgeTestState({}));

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.COST_TOLERANCE_EDIT),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen:
        Routes.BRIDGE.MODALS.SWAPS_LIMIT_ORDER_DEFAULT_COST_TOLERANCE_MODAL,
    });
  });

  // The limit order screen writes the live comparison to
  // `limitOrderMarketComparison` (see BridgeLimitOrderView) and keeps doing
  // so while this modal is open on top of it. This screen just reads that
  // same value rather than deriving its own, so the two surfaces can never
  // disagree.
  it('displays the market comparison from bridge state', () => {
    const { getByTestId } = renderScreen(
      createBridgeTestState({
        bridgeReducerOverrides: {
          limitOrderMarketComparison: {
            label: '(+6.63% from market)',
            isNegative: false,
          },
        },
      }),
    );

    expect(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.TRIGGER_COMPARISON),
    ).toHaveTextContent('(+6.63% from market)');
  });

  it('updates the market comparison label as the background screen keeps writing to bridge state', async () => {
    const { getByTestId, queryByTestId, store } = renderScreen(
      createBridgeTestState({
        bridgeReducerOverrides: {
          limitOrderMarketComparison: {
            label: '(+6.63% from market)',
            isNegative: false,
          },
        },
      }),
    );

    expect(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.TRIGGER_COMPARISON),
    ).toHaveTextContent('(+6.63% from market)');

    // Simulates the limit order screen behind this modal continuing to
    // dispatch a fresh comparison as its live rate ticks.
    act(() => {
      store.dispatch(
        setLimitOrderMarketComparison({
          label: '(+7.10% from market)',
          isNegative: false,
        }),
      );
    });

    await waitFor(() => {
      expect(
        getByTestId(LimitOrderConfirmationModalSelectorsIDs.TRIGGER_COMPARISON),
      ).toHaveTextContent('(+7.10% from market)');
    });

    // And converging on the limit price clears it, in both places at once.
    act(() => {
      store.dispatch(setLimitOrderMarketComparison(undefined));
    });

    await waitFor(() => {
      expect(
        queryByTestId(
          LimitOrderConfirmationModalSelectorsIDs.TRIGGER_COMPARISON,
        ),
      ).toBeNull();
    });
  });

  it('omits the comparison row while none is stored in bridge state', () => {
    const { queryByTestId } = renderScreen(
      createBridgeTestState({
        bridgeReducerOverrides: { limitOrderMarketComparison: undefined },
      }),
    );

    expect(
      queryByTestId(LimitOrderConfirmationModalSelectorsIDs.TRIGGER_COMPARISON),
    ).toBeNull();
  });
});
