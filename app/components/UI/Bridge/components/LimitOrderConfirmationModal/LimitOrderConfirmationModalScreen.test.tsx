import React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import type { Caip19AssetId } from '@metamask/assets-controller';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { useParams } from '../../../../../util/navigation/navUtils';
import { createBridgeTestState } from '../../testUtils';
import { setLimitOrderMarketComparison } from '../../../../../core/redux/slices/bridge';
import { useEIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';
import { useFetchLimitOrdersDelegations } from '../../api/limitOrders/getDelegations';
import { LimitOrderConfirmationModalScreen } from './LimitOrderConfirmationModalScreen';
import { LimitOrderConfirmationModalSelectorsIDs } from './testIds';
import { TokenAvatarSelectorsIDs } from './TokenAvatar/testIds';
import type { LimitOrderConfirmationModalParams } from './types';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../hooks/useEIP7702UpgradeFee', () => ({
  useEIP7702UpgradeFee: jest.fn(),
}));

jest.mock('../../api/limitOrders/getDelegations', () => ({
  useFetchLimitOrdersDelegations: jest.fn(),
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
const mockUseEIP7702UpgradeFee = jest.mocked(useEIP7702UpgradeFee);
const mockUseFetchLimitOrdersDelegations = jest.mocked(
  useFetchLimitOrdersDelegations,
);
const mockFetchLimitOrdersDelegations = jest.fn();

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

const mockOrder = {
  sourceAssetId: 'eip155:1/slip44:60' as Caip19AssetId,
  sourceAmount: '100000000000000000',
  destAssetId:
    'eip155:10/erc20:0x3c499c542cef5e3811e1192ce70d8cc03d5c3359' as Caip19AssetId,
  destAmount: '341220000',
  expiresInMinutes: 10080,
};

const mockParams: LimitOrderConfirmationModalParams = {
  sourceToken: mockSourceToken,
  destToken: mockDestToken,
  payingAmount: '0.1 ETH',
  triggerPrice: '$3,412.20',
  triggerToken: mockDestToken,
  expiry: '7 days',
  order: mockOrder,
};

const MOCK_DELEGATIONS_RESPONSE = { delegations: [], approvalRequired: false };

function renderScreen(state?: DeepPartial<RootState>) {
  return renderWithProvider(<LimitOrderConfirmationModalScreen />, { state });
}

describe('LimitOrderConfirmationModalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue(mockParams);
    mockUseEIP7702UpgradeFee.mockReturnValue({
      status: 'ready',
      displayFee: '$1.69',
      preciseNativeFeeInHex: '0x1',
      retry: jest.fn(),
    });
    mockFetchLimitOrdersDelegations.mockResolvedValue(
      MOCK_DELEGATIONS_RESPONSE,
    );
    mockUseFetchLimitOrdersDelegations.mockReturnValue({
      fetchLimitOrdersDelegations: mockFetchLimitOrdersDelegations,
    });
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

  it('displays the estimated account upgrade fee as the network fee', () => {
    const { getByTestId } = renderScreen(createBridgeTestState({}));

    const networkFeeRow = getByTestId(
      LimitOrderConfirmationModalSelectorsIDs.NETWORK_FEE,
    );

    expect(within(networkFeeRow).getByText('$1.69')).toBeOnTheScreen();
  });

  it('omits the network fee row when the account is already delegated', () => {
    mockUseEIP7702UpgradeFee.mockReturnValue({
      status: 'not-required',
      retry: jest.fn(),
    });

    const { queryByTestId } = renderScreen(createBridgeTestState({}));

    expect(
      queryByTestId(LimitOrderConfirmationModalSelectorsIDs.NETWORK_FEE),
    ).toBeNull();
  });

  it('fetches the delegations to sign when the primary button is pressed while the fee estimate is ready', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const { getByTestId, getByText } = renderScreen(createBridgeTestState({}));

    expect(getByText('Confirm order')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(mockFetchLimitOrdersDelegations).toHaveBeenCalledTimes(1);
    });
    expect(warnSpy).toHaveBeenCalledWith(
      'Limit order delegations',
      MOCK_DELEGATIONS_RESPONSE,
    );
    warnSpy.mockRestore();
  });

  it('requests the delegations with the order params and the live cost tolerance', () => {
    renderScreen(
      createBridgeTestState({
        bridgeReducerOverrides: { limitOrderCostTolerance: '0.5' },
      }),
    );

    expect(mockUseFetchLimitOrdersDelegations).toHaveBeenCalledWith({
      ...mockOrder,
      costTolerance: '0.5',
    });
  });

  it('falls back to the default cost tolerance when none is set', () => {
    renderScreen(
      createBridgeTestState({
        bridgeReducerOverrides: { limitOrderCostTolerance: undefined },
      }),
    );

    expect(mockUseFetchLimitOrdersDelegations).toHaveBeenCalledWith({
      ...mockOrder,
      costTolerance: '2',
    });
  });

  it('displays an error banner when the delegations cannot be fetched', async () => {
    mockFetchLimitOrdersDelegations.mockRejectedValue(new Error('boom'));
    const { getByTestId, getByText } = renderScreen(createBridgeTestState({}));

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(
        getByText(
          'Could not create an order: unable to fetch delegation details.',
        ),
      ).toBeOnTheScreen();
    });
    expect(getByText('Try again')).toBeOnTheScreen();
  });

  it('retries the delegations fetch when pressed after a failure', async () => {
    mockFetchLimitOrdersDelegations.mockRejectedValueOnce(new Error('boom'));
    const { getByTestId, getByText } = renderScreen(createBridgeTestState({}));
    const primaryButton = getByTestId(
      LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON,
    );

    fireEvent.press(primaryButton);
    await waitFor(() => expect(getByText('Try again')).toBeOnTheScreen());

    fireEvent.press(primaryButton);

    await waitFor(() => {
      expect(mockFetchLimitOrdersDelegations).toHaveBeenCalledTimes(2);
    });
    expect(getByText('Confirm order')).toBeOnTheScreen();
  });

  it('displays an error banner and a "Try again" primary button when the fee estimate fails', () => {
    mockUseEIP7702UpgradeFee.mockReturnValue({
      status: 'error',
      retry: jest.fn(),
    });

    const { getByText } = renderScreen(createBridgeTestState({}));

    expect(getByText("Couldn't calculate the network fee.")).toBeOnTheScreen();
    expect(getByText('Try again')).toBeOnTheScreen();
  });

  it('retries the fee estimate instead of confirming when pressed after a failure', () => {
    const retry = jest.fn();
    mockUseEIP7702UpgradeFee.mockReturnValue({ status: 'error', retry });

    const { getByTestId } = renderScreen(createBridgeTestState({}));

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    expect(retry).toHaveBeenCalledTimes(1);
    expect(mockFetchLimitOrdersDelegations).not.toHaveBeenCalled();
  });

  it('derives the network fee token from the paying token chain', () => {
    const { getByTestId } = renderScreen(createBridgeTestState({}));

    const networkFeeRow = getByTestId(
      LimitOrderConfirmationModalSelectorsIDs.NETWORK_FEE,
    );

    // The native asset avatar for mainnet (mockSourceToken's chain) is
    // rendered alongside the fee amount, confirming `getNativeSourceToken`
    // was fed the paying token's chain id rather than left undefined.
    expect(
      within(networkFeeRow).getByTestId(TokenAvatarSelectorsIDs.TOKEN),
    ).toBeOnTheScreen();
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
