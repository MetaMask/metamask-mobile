import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { createBridgeTestState } from '../../testUtils';
import { RecurringConfirmOrderSheetScreen } from './RecurringConfirmOrderSheetScreen';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn(() => undefined),
}));

jest.mock('../../hooks/useBridgeQuoteData/BridgeQuoteDataContext', () => ({
  BridgeQuoteDataProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('./RecurringConfirmOrderSheet', () => ({
  __esModule: true,
  default: ({
    onEditSlippagePress,
    goBack,
  }: {
    onEditSlippagePress: () => void;
    goBack: () => void;
  }) => {
    const ReactModule = jest.requireActual<typeof React>('react');
    const { Pressable, Text } =
      jest.requireActual<typeof import('react-native')>('react-native');

    return ReactModule.createElement(
      ReactModule.Fragment,
      null,
      ReactModule.createElement(
        Pressable,
        { testID: 'edit-slippage', onPress: onEditSlippagePress },
        ReactModule.createElement(Text, null, 'Edit slippage'),
      ),
      ReactModule.createElement(
        Pressable,
        { testID: 'close-confirm', onPress: goBack },
        ReactModule.createElement(Text, null, 'Close confirm'),
      ),
    );
  },
}));

const sourceToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
};

const destToken = {
  address: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',
  chainId: '0xa' as Hex,
  decimals: 6,
  image: '',
  name: 'USD Coin',
  symbol: 'USDC',
};

function renderScreen() {
  return renderWithProvider(<RecurringConfirmOrderSheetScreen />, {
    state: createBridgeTestState({
      bridgeReducerOverrides: {
        sourceToken,
        destToken,
      },
    }),
  });
}

describe('RecurringConfirmOrderSheetScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the shared slippage modal above the confirmation modal', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('edit-slippage'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken.chainId,
        destChainId: destToken.chainId,
      },
    });
  });

  it('passes modal navigation dismissal to the confirmation sheet', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId('close-confirm'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
