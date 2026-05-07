import React from 'react';
import { render } from '@testing-library/react-native';
import { CaipChainId, Hex } from '@metamask/utils';

import { getHeaderCompactStandardNavbarOptions } from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { BridgeToken } from '../../types';
import { BatchSellReview } from './BatchSellReview';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';

const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockHeaderOptions = { title: 'mock-header-options' };
const mockSelectedTokens: BridgeToken[] = [
  {
    address: '0x1111111111111111111111111111111111111111',
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: 'ETH',
    balance: '1.498',
  },
  {
    address: '0x2222222222222222222222222222222222222222',
    chainId: '0x1' as Hex,
    decimals: 18,
    symbol: 'UNI',
    balance: '154.297',
  },
];
let mockDestinationToken: BridgeToken | undefined = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
  image: 'usdc-image-url',
};
const mockStablecoinsByChain: Record<CaipChainId, never[]> = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Pressable, View, Text } = jest.requireActual('react-native');

  return {
    AvatarToken: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
    AvatarTokenSize: { Lg: 'lg', Sm: 'sm' },
    Box: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, props, children),
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Between: 'space-between', Center: 'center' },
    Button: ({
      children,
      isDisabled,
      onPress,
      testID,
    }: {
      children?: React.ReactNode;
      isDisabled?: boolean;
      onPress?: () => void;
      testID?: string;
    }) =>
      ReactActual.createElement(
        Pressable,
        { accessibilityState: { disabled: isDisabled }, onPress, testID },
        ReactActual.createElement(Text, null, children),
      ),
    ButtonSize: { Lg: 'lg' },
    ButtonVariant: { Primary: 'primary' },
    FontWeight: { Medium: 'medium' },
    Icon: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
    IconColor: { IconDefault: 'icon-default' },
    IconName: { Info: 'info' },
    IconSize: { Sm: 'sm' },
    Text: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Text, props, children),
    TextColor: { TextDefault: 'text-default' },
    TextVariant: { BodyMd: 'body-md', HeadingLg: 'heading-lg' },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const ReactActual = jest.requireActual('react');
  const { ScrollView } = jest.requireActual('react-native');

  return {
    ScrollView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(ScrollView, props, children),
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, props, children),
  };
});

jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => ({
    getHeaderCompactStandardNavbarOptions: jest.fn(() => mockHeaderOptions),
  }),
);

jest.mock('../../../../../component-library/components-temp/Skeleton', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    Skeleton: ({ testID }: { testID?: string }) =>
      ReactActual.createElement(View, { testID }),
  };
});

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBatchSellSourceTokens: jest.fn(() => mockSelectedTokens),
  selectBatchSellDestStablecoinsByChain: jest.fn(() => mockStablecoinsByChain),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../BatchSellTokenSelect/BatchSellTokenSelect.utils', () => ({
  getBatchSellDestinationToken: jest.fn(() => mockDestinationToken),
}));

jest.mock('./BatchSellReviewTokenRow', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, View } = jest.requireActual('react-native');

  return {
    BatchSellReviewTokenRow: ({
      percent,
      token,
      tokenKey,
    }: {
      percent: number;
      token: { symbol: string };
      tokenKey: string;
    }) =>
      ReactActual.createElement(
        View,
        { testID: `batch-sell-review-token-row-${tokenKey}` },
        ReactActual.createElement(Text, null, token.symbol),
        ReactActual.createElement(Text, null, `${percent}%`),
      ),
  };
});

describe('BatchSellReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDestinationToken = {
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x1' as Hex,
      decimals: 6,
      symbol: 'USDC',
      image: 'usdc-image-url',
    };
  });

  it('renders the quote loading screen', () => {
    const { getByTestId, getByText } = render(<BatchSellReview />);

    expect(
      getByTestId(BatchSellReviewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Total received')).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellReviewSelectorsIDs.TOTAL_RECEIVED_SKELETON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BatchSellReviewSelectorsIDs.DESTINATION_TOKEN_PILL),
    ).toBeOnTheScreen();
    expect(getByText('USDC')).toBeOnTheScreen();
    expect(getByText('ETH')).toBeOnTheScreen();
    expect(getByText('UNI')).toBeOnTheScreen();
  });

  it('sets selected token percents to 100% on entry', () => {
    const { getAllByText } = render(<BatchSellReview />);

    expect(getAllByText('100%')).toHaveLength(mockSelectedTokens.length);
  });

  it('keeps the review button disabled while quotes load', () => {
    const { getByTestId, getByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('Review')).toBeOnTheScreen();
    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
  });

  it('shows UNKNOWN when there is no destination token match', () => {
    mockDestinationToken = undefined;

    const { getByTestId, getByText, queryByText } = render(<BatchSellReview />);
    const reviewButton = getByTestId(BatchSellReviewSelectorsIDs.REVIEW_BUTTON);

    expect(getByText('UNKNOWN')).toBeOnTheScreen();
    expect(queryByText('USDC')).toBeNull();
    expect(reviewButton.props.accessibilityState.disabled).toBe(true);
  });

  it('uses the compact standard header', () => {
    render(<BatchSellReview />);

    expect(getHeaderCompactStandardNavbarOptions).toHaveBeenCalledWith({
      title: '',
      onBack: expect.any(Function),
      includesTopInset: true,
    });
    expect(mockSetOptions).toHaveBeenCalledWith(mockHeaderOptions);

    const [{ onBack }] = (getHeaderCompactStandardNavbarOptions as jest.Mock)
      .mock.calls[0];
    onBack();

    expect(mockGoBack).toHaveBeenCalled();
  });
});
