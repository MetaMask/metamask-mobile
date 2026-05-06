import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { HighRateAlertModal } from './index';
import { HighRateAlertModalSelectorsIDs } from './HighRateAlertModal.testIds';
import { BridgeToken } from '../../types';

const mockGoToSwaps = jest.fn();

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ReactActual.forwardRef(
        (
          {
            children,
            testID,
          }: {
            children?: React.ReactNode;
            testID?: string;
          },
          ref: React.Ref<{
            onCloseBottomSheet: (callback?: () => void) => void;
          }>,
        ) => {
          ReactActual.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: (callback?: () => void) => {
              callback?.();
            },
          }));

          return <View testID={testID}>{children}</View>;
        },
      ),
    };
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native');

  return {
    BottomSheetFooter: ({
      primaryButtonProps,
    }: {
      primaryButtonProps?: {
        children?: React.ReactNode;
        onPress?: () => void;
        testID?: string;
      };
    }) => (
      <Pressable
        onPress={primaryButtonProps?.onPress}
        testID={primaryButtonProps?.testID}
      >
        <Text>{primaryButtonProps?.children}</Text>
      </Pressable>
    ),
    BottomSheetHeader: ({
      children,
      closeButtonProps,
      onClose,
    }: {
      children?: React.ReactNode;
      closeButtonProps?: { testID?: string };
      onClose?: () => void;
    }) => (
      <View>
        <Text>{children}</Text>
        <Pressable onPress={onClose} testID={closeButtonProps?.testID} />
      </View>
    ),
    Box: ({ children, ...props }: { children?: React.ReactNode }) => (
      <View {...props}>{children}</View>
    ),
    ButtonIconSize: { Md: 'md' },
    Text: ({ children, ...props }: { children?: React.ReactNode }) => (
      <Text {...props}>{children}</Text>
    ),
    TextColor: { TextDefault: 'text-default' },
    TextVariant: { BodySm: 'body-sm' },
  };
});

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../hooks/useSwapBridgeNavigation', () => ({
  SwapBridgeNavigationLocation: { MainView: 'MainView' },
  useSwapBridgeNavigation: () => ({ goToSwaps: mockGoToSwaps }),
}));

import { useParams } from '../../../../../util/navigation/navUtils';

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

const sourceToken: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ONE',
  name: 'One Token',
};

const destToken: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

describe('HighRateAlertModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ sourceToken, destToken });
  });

  it('renders the alert content and redirects to regular swaps', () => {
    const { getByTestId, getByText } = render(<HighRateAlertModal />);

    expect(getByTestId(HighRateAlertModalSelectorsIDs.SHEET)).toBeOnTheScreen();
    expect(getByText('High rate alert')).toBeOnTheScreen();
    expect(
      getByText(
        'Batch selling one token could lead to a higher rate. Want to do a swap instead?',
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(HighRateAlertModalSelectorsIDs.SWAP_INSTEAD_BUTTON),
    );

    expect(mockGoToSwaps).toHaveBeenCalledWith(sourceToken, destToken);
  });
});
