import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';

import { BridgeTokenMetadata } from '../../constants/tokens';
import { BridgeToken } from '../../types';
import { BatchSellDestinationTokenSelectorModal } from './index';
import { BatchSellDestinationTokenSelectorModalSelectorsIDs } from './BatchSellDestinationTokenSelectorModal.testIds';

const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
const mockOnCloseBottomSheet = jest.fn();
const usdcAssetId =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType;
const usdtAssetId =
  'eip155:1/erc20:0xdac17f958d2ee523a2206206994597c13d831ec7' as CaipAssetType;
const mockSourceToken: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ETH',
};
let mockSelectedDestinationToken: BridgeToken | undefined;
let mockDestinationStablecoins: BridgeToken[];
let mockBalancesByAssetId: Record<
  string,
  { balance: string; balanceFiat?: string }
>;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (...classNames: (string | false | undefined)[]) =>
      classNames.filter(Boolean).join(' '),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    AvatarToken: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
    AvatarTokenSize: { Md: 'md' },
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          testID,
        }: {
          children?: React.ReactNode;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));

        return ReactActual.createElement(View, { testID }, children);
      },
    ),
    BottomSheetHeader: ({
      children,
      closeButtonProps,
      onClose,
    }: {
      children?: React.ReactNode;
      closeButtonProps?: { testID?: string };
      onClose?: () => void;
    }) =>
      ReactActual.createElement(
        View,
        null,
        ReactActual.createElement(Text, null, children),
        ReactActual.createElement(Pressable, {
          onPress: onClose,
          testID: closeButtonProps?.testID,
        }),
      ),
    BottomSheetRef: {},
    Box: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, props, children),
    BoxAlignItems: { Center: 'center' },
    BoxFlexDirection: { Row: 'row' },
    ButtonBase: ({
      children,
      onPress,
      style,
      testID,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      style?: (state: { pressed: boolean }) => string;
      testID?: string;
    }) =>
      ReactActual.createElement(
        Pressable,
        {
          accessibilityRole: 'button',
          onPress,
          style:
            typeof style === 'function' ? style({ pressed: false }) : style,
          testID,
        },
        children,
      ),
    ButtonIconSize: { Md: 'md' },
    FontWeight: { Medium: 'medium' },
    Text: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Text, props, children),
    TextColor: { TextDefault: 'text-default' },
    TextVariant: { BodyMd: 'body-md' },
  };
});

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBatchSellSourceTokens: jest.fn(() => [mockSourceToken]),
  selectBatchSellDestStablecoins: jest.fn(() => mockDestinationStablecoins),
  selectBatchSellDestToken: jest.fn(() => mockSelectedDestinationToken),
  setBatchSellDestToken: jest.fn((token: BridgeToken) => ({
    type: 'bridge/setBatchSellDestToken',
    payload: token,
  })),
}));

jest.mock('../../hooks/useBalancesByAssetId', () => ({
  useBalancesByAssetId: () => ({
    balancesByAssetId: mockBalancesByAssetId,
    tokensWithBalance: [],
  }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

describe('BatchSellDestinationTokenSelectorModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedDestinationToken = BridgeTokenMetadata[usdtAssetId];
    mockDestinationStablecoins = [
      BridgeTokenMetadata[usdcAssetId],
      BridgeTokenMetadata[usdtAssetId],
    ];
    mockBalancesByAssetId = {};
  });

  it('renders the stablecoin selector content', () => {
    const { getByTestId, getByText } = render(
      <BatchSellDestinationTokenSelectorModal />,
    );

    expect(
      getByTestId(BatchSellDestinationTokenSelectorModalSelectorsIDs.SHEET),
    ).toBeOnTheScreen();
    expect(getByText('Select a stablecoin')).toBeOnTheScreen();
    expect(getByText('USDC')).toBeOnTheScreen();
    expect(getByText('USDT')).toBeOnTheScreen();
  });

  it('renders the stablecoin fiat value from wallet balances', () => {
    mockBalancesByAssetId = {
      [usdcAssetId]: {
        balance: '123',
        balanceFiat: '$123.00',
      },
    };

    const { getByText, queryByText } = render(
      <BatchSellDestinationTokenSelectorModal />,
    );

    expect(getByText('$123.00')).toBeOnTheScreen();
    expect(queryByText('123')).not.toBeOnTheScreen();
    expect(queryByText('123 USDC')).not.toBeOnTheScreen();
  });

  it('does not render a balance fallback when fiat value is missing', () => {
    const { queryByText } = render(<BatchSellDestinationTokenSelectorModal />);

    expect(queryByText('0')).not.toBeOnTheScreen();
  });

  it('highlights the selected stablecoin row', () => {
    const { getByTestId } = render(<BatchSellDestinationTokenSelectorModal />);

    const selectedRow = getByTestId(
      `${BatchSellDestinationTokenSelectorModalSelectorsIDs.TOKEN_ROW}-0x1:0xdac17f958d2ee523a2206206994597c13d831ec7`,
    );

    expect(selectedRow.props.style).toContain('bg-muted');
  });

  it('closes the bottom sheet from the close button', () => {
    const { getByTestId } = render(<BatchSellDestinationTokenSelectorModal />);

    fireEvent.press(
      getByTestId(
        BatchSellDestinationTokenSelectorModalSelectorsIDs.CLOSE_BUTTON,
      ),
    );

    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });

  it('stores the selected stablecoin and closes the bottom sheet', () => {
    const { getByTestId } = render(<BatchSellDestinationTokenSelectorModal />);

    fireEvent.press(
      getByTestId(
        `${BatchSellDestinationTokenSelectorModalSelectorsIDs.TOKEN_ROW}-0x1:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48`,
      ),
    );

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'bridge/setBatchSellDestToken',
      payload: BridgeTokenMetadata[usdcAssetId],
    });
    expect(mockOnCloseBottomSheet).toHaveBeenCalled();
  });
});
