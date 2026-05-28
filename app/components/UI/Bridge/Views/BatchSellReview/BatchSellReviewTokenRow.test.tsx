import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';

import { BridgeToken } from '../../types';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';
import { BatchSellReviewTokenRow } from './BatchSellReviewTokenRow';

const mockToken: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ETH',
  image: 'eth-image-url',
  balance: '1.498123456',
};
const mockTokenKey = `${mockToken.chainId}:${mockToken.address}`;

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Pressable: RNPressable,
    View: RNView,
    Text: RNText,
  } = jest.requireActual('react-native');

  return {
    AvatarToken: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(RNView, { testID }),
    AvatarTokenSize: { Lg: 'lg' },
    Box: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(RNView, props, children),
    BoxAlignItems: { Center: 'center' },
    BoxFlexDirection: { Row: 'row' },
    ButtonIcon: ({
      accessibilityLabel,
      isDisabled,
      onPress,
      testID,
    }: {
      accessibilityLabel?: string;
      isDisabled?: boolean;
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        RNPressable,
        {
          accessibilityLabel,
          accessibilityState: { disabled: Boolean(isDisabled) },
          disabled: isDisabled,
          onPress: isDisabled ? undefined : onPress,
          testID,
        },
        null,
      ),
    ButtonIconSize: { Md: 'md' },
    FontWeight: { Medium: 'medium' },
    IconColor: { IconAlternative: 'icon-alternative' },
    IconName: { Customize: 'customize', RemoveMinus: 'remove-minus' },
    Text: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(RNText, props, children),
    TextColor: { TextAlternative: 'text-alternative' },
    TextVariant: { BodySm: 'body-sm' },
  };
});

jest.mock('../../../../../component-library/components-temp/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');

  return {
    Skeleton: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(RNView, { testID }),
  };
});

jest.mock('./BatchSellPercentageSlider', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable: RNPressable, Text: RNText } =
    jest.requireActual('react-native');

  return {
    BatchSellPercentageSlider: ({
      onValueChange,
      testID,
      value,
    }: {
      onValueChange: (value: number) => void;
      testID?: string;
      value: number;
    }) =>
      ReactActual.createElement(
        RNPressable,
        { testID, onPress: () => onValueChange(75) },
        ReactActual.createElement(RNText, null, `${value}%`),
      ),
  };
});

describe('BatchSellReviewTokenRow', () => {
  const mockOnPercentChange = jest.fn();
  const mockOnSlippagePress = jest.fn();
  const mockOnRemovePress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders token loading row content', () => {
    const { getByTestId, getByText } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        onPercentChange={mockOnPercentChange}
        onSlippagePress={mockOnSlippagePress}
        onRemovePress={mockOnRemovePress}
      />,
    );

    expect(
      getByTestId(`${BatchSellReviewSelectorsIDs.TOKEN_ROW}-${mockTokenKey}`),
    ).toBeOnTheScreen();
    expect(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_AMOUNT_SKELETON}-${mockTokenKey}`,
      ),
    ).toBeOnTheScreen();
    expect(getByText('1.49812 ETH • 100%')).toBeOnTheScreen();
  });

  it('matches token picker balance formatting for tiny balances', () => {
    const { getByText } = render(
      <BatchSellReviewTokenRow
        token={{ ...mockToken, balance: '0.000001' }}
        tokenKey={mockTokenKey}
        percent={100}
        onPercentChange={mockOnPercentChange}
      />,
    );

    expect(getByText('< 0.00001 ETH • 100%')).toBeOnTheScreen();
  });

  it('forwards slider percent changes', () => {
    const { getByTestId } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        onPercentChange={mockOnPercentChange}
      />,
    );

    fireEvent.press(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.TOKEN_SLIDER}-${mockTokenKey}`,
      ),
    );

    expect(mockOnPercentChange).toHaveBeenCalledWith(mockTokenKey, 75);
  });

  it('forwards slippage and remove presses', () => {
    const { getByTestId } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        onPercentChange={mockOnPercentChange}
        onSlippagePress={mockOnSlippagePress}
        onRemovePress={mockOnRemovePress}
      />,
    );

    fireEvent.press(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.CUSTOMIZE_BUTTON}-${mockTokenKey}`,
      ),
    );
    fireEvent.press(
      getByTestId(
        `${BatchSellReviewSelectorsIDs.REMOVE_BUTTON}-${mockTokenKey}`,
      ),
    );

    expect(mockOnSlippagePress).toHaveBeenCalledWith(mockToken);
    expect(mockOnRemovePress).toHaveBeenCalledWith(mockToken);
  });

  it('disables remove presses', () => {
    const { getByTestId } = render(
      <BatchSellReviewTokenRow
        token={mockToken}
        tokenKey={mockTokenKey}
        percent={100}
        onPercentChange={mockOnPercentChange}
        onRemovePress={mockOnRemovePress}
        isRemoveTokenDisabled
      />,
    );
    const removeButton = getByTestId(
      `${BatchSellReviewSelectorsIDs.REMOVE_BUTTON}-${mockTokenKey}`,
    );

    fireEvent.press(removeButton);

    expect(removeButton.props.accessibilityState.disabled).toBe(true);
    expect(mockOnRemovePress).not.toHaveBeenCalled();
  });
});
