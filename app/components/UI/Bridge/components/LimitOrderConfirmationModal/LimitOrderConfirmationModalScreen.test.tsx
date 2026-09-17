import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import Routes from '../../../../../constants/navigation/Routes';
import { useParams } from '../../../../../util/navigation/navUtils';
import { createBridgeTestState } from '../../testUtils';
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
});
