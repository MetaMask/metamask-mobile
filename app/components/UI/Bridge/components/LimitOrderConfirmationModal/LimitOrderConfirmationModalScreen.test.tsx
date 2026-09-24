import React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import type { Caip19AssetId } from '@metamask/assets-controller';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import { useParams } from '../../../../../util/navigation/navUtils';
import { merge } from 'lodash';
import { createBridgeTestState } from '../../testUtils';
import { setLimitOrderMarketComparison } from '../../../../../core/redux/slices/bridge';
import { useEIP7702UpgradeFee } from '../../hooks/useEIP7702UpgradeFee';
import { useFetchLimitOrdersDelegations } from '../../api/limitOrders/getDelegations';
import { useCreateLimitOrder } from '../../api/limitOrders/create';
import { signLimitOrderDelegations } from '../../utils/limitOrders/signLimitOrderDelegations';
import { ToastSeverity } from '@metamask/design-system-react-native';
import { LimitOrderConfirmationModalScreen } from './LimitOrderConfirmationModalScreen';
import { LimitOrderConfirmationModalSelectorsIDs } from './testIds';
import { TokenAvatarSelectorsIDs } from './TokenAvatar/testIds';
import type { LimitOrderConfirmationModalParams } from './types';

const mockGoBack = jest.fn();
const mockToast = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
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

jest.mock('../../api/limitOrders/create', () => ({
  useCreateLimitOrder: jest.fn(),
}));

jest.mock('../../utils/limitOrders/signLimitOrderDelegations', () => ({
  signLimitOrderDelegations: jest.fn(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    toast: (...args: unknown[]) => mockToast(...args),
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
const mockUseCreateLimitOrder = jest.mocked(useCreateLimitOrder);
const mockCreateLimitOrder = jest.fn();
const mockSignLimitOrderDelegations = jest.mocked(signLimitOrderDelegations);

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

const mockTrigger = {
  kind: 'dest_price' as const,
  threshold: 'above' as const,
  price: '3412.2',
};

const mockParams: LimitOrderConfirmationModalParams = {
  sourceToken: mockSourceToken,
  destToken: mockDestToken,
  payingAmount: '0.1 ETH',
  triggerPrice: '$3,412.20',
  triggerToken: mockDestToken,
  expiry: '7 days',
  order: mockOrder,
  trigger: mockTrigger,
};

const MOCK_DELEGATION = {
  purpose: 'swap' as const,
  delegation: {
    delegate: '0x0000000000000000000000000000000000000a11',
    delegator: '0x4751FD55E5B9723f427Cf1a298f785Ec2adCf123',
    authority:
      '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    caveats: [],
    salt: '0x6572bcee6cc79e0b70128c9dd1f65f0075ebcac9b8aa38e8b6af0fa4757f2050',
    signature: '0x',
  },
  typedData: {
    domain: {
      name: 'DelegationManager',
      version: '1',
      chainId: 10,
      verifyingContract: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
    },
    primaryType: 'Delegation',
    types: { Delegation: [{ name: 'delegate', type: 'address' }] },
    message: { delegate: '0x0000000000000000000000000000000000000a11' },
  },
};

const MOCK_DELEGATIONS_RESPONSE = {
  // CAIP-2, which the create request takes in decimal instead.
  chainId: 'eip155:10',
  delegationManager: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
  swapRouter: '0x962287c9d5B8a682389E61edAE90ec882325d08b',
  approvalRequired: false,
  order: {
    clientOrderId: '26b0d825-79da-45a9-ab7d-1397a091b80e',
    account: 'eip155:10:0x4751FD55E5B9723f427Cf1a298f785Ec2adCf123',
    src: { assetId: mockOrder.sourceAssetId, amount: mockOrder.sourceAmount },
    dest: {
      assetId: mockOrder.destAssetId,
      amount: mockOrder.destAmount,
      minAmount: '334395600',
    },
    priceTolerance: 200,
    expiresAt: 1789054610,
  },
  delegations: [MOCK_DELEGATION],
};

// What the signing step hands back: the same delegation, with the delegator's
// signature replacing the empty one the API issued.
const MOCK_SIGNED_DELEGATIONS = [
  {
    ...MOCK_DELEGATION,
    delegation: { ...MOCK_DELEGATION.delegation, signature: '0xsignature' },
  },
];

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
    mockSignLimitOrderDelegations.mockResolvedValue(MOCK_SIGNED_DELEGATIONS);
    mockCreateLimitOrder.mockResolvedValue({
      order: { id: '2421deda-7395-4ec9-82b8-3384aa7320e4' },
    });
    mockUseCreateLimitOrder.mockReturnValue(mockCreateLimitOrder);
  });

  describe('USD price notice', () => {
    const withCurrency = (selectedCurrency: string) =>
      merge({}, createBridgeTestState({}), {
        engine: {
          backgroundState: { AssetsController: { selectedCurrency } },
        },
      });

    it('displays the USD trigger price when the display currency is not USD', () => {
      const { getByTestId } = renderScreen(withCurrency('EUR'));

      expect(
        getByTestId(LimitOrderConfirmationModalSelectorsIDs.USD_PRICE_NOTICE),
      ).toHaveTextContent(
        'For display purposes you see the values in your selected currency but the actual order will be logged based on the USD exchange rate (~$3,412.2)',
      );
    });

    it('does not display when the display currency is USD', () => {
      const { queryByTestId } = renderScreen(withCurrency('usd'));

      expect(
        queryByTestId(LimitOrderConfirmationModalSelectorsIDs.USD_PRICE_NOTICE),
      ).toBeNull();
    });

    // A ratio trigger is priced in the counter token, so no exchange rate
    // takes part in placing the order.
    it('does not display for a limit price entered in token units', () => {
      mockUseParams.mockReturnValue({
        ...mockParams,
        trigger: { ...mockTrigger, kind: 'ratio', price: '2684.275413' },
      });
      const { queryByTestId } = renderScreen(withCurrency('RUB'));

      expect(
        queryByTestId(LimitOrderConfirmationModalSelectorsIDs.USD_PRICE_NOTICE),
      ).toBeNull();
    });

    it('does not display without a trigger', () => {
      mockUseParams.mockReturnValue({ ...mockParams, trigger: undefined });
      const { queryByTestId } = renderScreen(withCurrency('EUR'));

      expect(
        queryByTestId(LimitOrderConfirmationModalSelectorsIDs.USD_PRICE_NOTICE),
      ).toBeNull();
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
    const { getByTestId, getByText } = renderScreen(createBridgeTestState({}));

    expect(getByText('Confirm order')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(mockFetchLimitOrdersDelegations).toHaveBeenCalledTimes(1);
    });
  });

  it('creates the order from the delegations response, the trigger and the live cost tolerance', async () => {
    const { getByTestId } = renderScreen(
      createBridgeTestState({
        bridgeReducerOverrides: { limitOrderCostTolerance: '0.5' },
      }),
    );

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(mockCreateLimitOrder).toHaveBeenCalledWith({
        clientOrderId: MOCK_DELEGATIONS_RESPONSE.order.clientOrderId,
        // Converted from the CAIP-2 chain id of the delegations response.
        chainId: 10,
        trigger: mockTrigger,
        // The dest amount as requested, not the one the tolerance was applied to.
        requestedDestAmount: mockOrder.destAmount,
        // A percent, matching the one the delegations were requested with.
        priceTolerance: 0.5,
        // Signed, since the API rejects the delegations it issued unsigned.
        delegations: MOCK_SIGNED_DELEGATIONS,
      });
    });
  });

  it('signs the delegations the API issued before creating the order', async () => {
    const { getByTestId } = renderScreen(createBridgeTestState({}));

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(mockSignLimitOrderDelegations).toHaveBeenCalledWith(
        MOCK_DELEGATIONS_RESPONSE.delegations,
      );
    });
  });

  it('displays an error banner and creates no order when the delegations cannot be signed', async () => {
    mockSignLimitOrderDelegations.mockRejectedValue(
      new Error('keyring locked'),
    );
    const { getByTestId, getByText } = renderScreen(createBridgeTestState({}));

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(
        getByText("Could not create an order: the order couldn't be signed."),
      ).toBeOnTheScreen();
    });
    expect(getByText('Try again')).toBeOnTheScreen();
    expect(mockCreateLimitOrder).not.toHaveBeenCalled();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('retries the signing when pressed after a signature failure', async () => {
    mockSignLimitOrderDelegations.mockRejectedValueOnce(
      new Error('keyring locked'),
    );
    const { getByTestId, getByText } = renderScreen(createBridgeTestState({}));
    const primaryButton = getByTestId(
      LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON,
    );

    fireEvent.press(primaryButton);
    await waitFor(() => expect(getByText('Try again')).toBeOnTheScreen());

    fireEvent.press(primaryButton);

    await waitFor(() => {
      expect(mockCreateLimitOrder).toHaveBeenCalledTimes(1);
    });
    expect(mockSignLimitOrderDelegations).toHaveBeenCalledTimes(2);
  });

  it('dismisses the sheet once the order is created', async () => {
    const { getByTestId } = renderScreen(createBridgeTestState({}));

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the order created success toast once the order is created', async () => {
    const { getByTestId } = renderScreen(createBridgeTestState({}));

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledTimes(1);
    });
    expect(mockToast).toHaveBeenCalledWith({
      severity: ToastSeverity.Success,
      title: 'Order created',
      description: "We'll let you know when it’s filled.",
      showCloseButton: false,
    });
  });

  it('displays an error banner when the order cannot be created', async () => {
    mockCreateLimitOrder.mockRejectedValue(new Error('boom'));
    const { getByTestId, getByText } = renderScreen(createBridgeTestState({}));

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(
        getByText("Could not create an order: the order couldn't be placed."),
      ).toBeOnTheScreen();
    });
    expect(getByText('Try again')).toBeOnTheScreen();
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it('retries the order creation when pressed after a failure', async () => {
    mockCreateLimitOrder.mockRejectedValueOnce(new Error('boom'));
    const { getByTestId, getByText } = renderScreen(createBridgeTestState({}));
    const primaryButton = getByTestId(
      LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON,
    );

    fireEvent.press(primaryButton);
    await waitFor(() => expect(getByText('Try again')).toBeOnTheScreen());

    fireEvent.press(primaryButton);

    await waitFor(() => {
      expect(mockCreateLimitOrder).toHaveBeenCalledTimes(2);
    });
    // The retry goes back for delegations, which keeps the same client order id
    // and so leaves the create request idempotent.
    expect(mockFetchLimitOrdersDelegations).toHaveBeenCalledTimes(2);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('displays an error banner instead of creating an order when the trigger is missing', async () => {
    mockUseParams.mockReturnValue({ ...mockParams, trigger: undefined });
    const { getByTestId, getByText } = renderScreen(createBridgeTestState({}));

    fireEvent.press(
      getByTestId(LimitOrderConfirmationModalSelectorsIDs.PRIMARY_BUTTON),
    );

    await waitFor(() => {
      expect(
        getByText(
          'Could not create an order: the trigger price is unavailable.',
        ),
      ).toBeOnTheScreen();
    });
    expect(mockFetchLimitOrdersDelegations).not.toHaveBeenCalled();
    expect(mockCreateLimitOrder).not.toHaveBeenCalled();
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
    expect(mockSignLimitOrderDelegations).not.toHaveBeenCalled();
    expect(mockCreateLimitOrder).not.toHaveBeenCalled();
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
