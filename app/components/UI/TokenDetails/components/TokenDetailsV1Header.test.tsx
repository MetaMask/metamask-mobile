import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { makeMutable } from 'react-native-reanimated';
import {
  TokenDetailsV1Header,
  TOKEN_DETAILS_V1_HEADER_TEST_IDS,
  type TokenDetailsV1HeaderProps,
} from './TokenDetailsV1Header';
import type { TokenDetailsRouteParams } from '../constants/constants';

const mockCopyContractAddress = jest.fn();
const mockResolveTokenContractAddress = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../hooks/useCopyTokenContractAddress', () => ({
  useCopyTokenContractAddress: () => mockCopyContractAddress,
}));

jest.mock('../../AssetOverview/utils/getTokenDetails', () => ({
  resolveTokenContractAddress: (...args: unknown[]) =>
    mockResolveTokenContractAddress(...args),
}));

jest.mock('../../../../util/address', () => ({
  formatAddress: jest.fn((address: string) => `${address.slice(0, 7)}...short`),
}));

jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({ isStockToken: () => false }),
}));

jest.mock('../../Assets/components/AssetLogo/AssetLogo', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(),
}));

const mockToken = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chainId: '0x1',
  symbol: 'PEPE',
  ticker: 'PEPE',
  name: 'Pepe',
  isETH: false,
  isNative: false,
  balanceError: null,
  image: '',
  logo: '',
  aggregators: [],
  decimals: 18,
} as unknown as TokenDetailsRouteParams;

const renderHeader = (props: Partial<TokenDetailsV1HeaderProps> = {}) =>
  render(
    <TokenDetailsV1Header
      token={mockToken}
      onBackPress={jest.fn()}
      {...props}
    />,
  );

const getIdentityStyle = (
  getByTestId: ReturnType<typeof render>['getByTestId'],
) =>
  StyleSheet.flatten(
    getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.IDENTITY).props.style,
  );

describe('TokenDetailsV1Header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResolveTokenContractAddress.mockReturnValue(mockToken.address);
  });

  it('renders the back button, identity and actions capsule', () => {
    const { getByTestId } = renderHeader();

    expect(
      getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.IDENTITY),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.ACTIONS_GROUP),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.TICKER),
    ).toHaveTextContent('PEPE');
  });

  it('hides the identity when the page is not scrolled', () => {
    const { getByTestId } = renderHeader({ scrollY: makeMutable(0) });

    expect(getIdentityStyle(getByTestId)).toMatchObject({
      opacity: 0,
      transform: [{ translateY: 6 }],
    });
  });

  it('shows the identity once scrolled past the hero section', () => {
    const { getByTestId } = renderHeader({ scrollY: makeMutable(200) });

    expect(getIdentityStyle(getByTestId)).toMatchObject({
      opacity: 1,
      transform: [{ translateY: 0 }],
    });
  });

  it('shows the identity when no scroll value is provided', () => {
    const { getByTestId } = renderHeader();

    expect(getIdentityStyle(getByTestId)).toMatchObject({ opacity: 1 });
  });

  it('calls onBackPress when the back button is pressed', () => {
    const onBackPress = jest.fn();
    const { getByTestId } = renderHeader({ onBackPress });

    fireEvent.press(getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.BACK_BUTTON));

    expect(onBackPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPriceAlertPress and onSharePress when the actions are pressed', () => {
    const onPriceAlertPress = jest.fn();
    const onSharePress = jest.fn();
    const { getByTestId } = renderHeader({ onPriceAlertPress, onSharePress });

    fireEvent.press(
      getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.PRICE_ALERT_BUTTON),
    );
    fireEvent.press(getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.SHARE_BUTTON));

    expect(onPriceAlertPress).toHaveBeenCalledTimes(1);
    expect(onSharePress).toHaveBeenCalledTimes(1);
  });

  it('renders the provided star button inside the actions capsule', () => {
    const { getByTestId, queryByTestId } = renderHeader({
      starButton: <Text testID="custom-star">star</Text>,
    });

    expect(getByTestId('custom-star')).toBeOnTheScreen();
    expect(queryByTestId('button-v1-watchlist-fallback')).toBeNull();
  });

  it('renders the age pill when a token age is provided', () => {
    const { getByTestId } = renderHeader({ tokenAge: '3d' });

    expect(
      getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.AGE_PILL),
    ).toHaveTextContent('3d');
  });

  it('omits the age pill when no token age is provided', () => {
    const { queryByTestId } = renderHeader({ tokenAge: null });

    expect(queryByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.AGE_PILL)).toBeNull();
  });

  it('renders the truncated contract address and copies it on press', () => {
    const { getByTestId } = renderHeader();

    expect(
      getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.ADDRESS),
    ).toHaveTextContent('0x69825...short');

    fireEvent.press(getByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.COPY_BUTTON));

    expect(mockCopyContractAddress).toHaveBeenCalledTimes(1);
  });

  it('omits the contract address for native tokens', () => {
    const { queryByTestId } = renderHeader({
      token: { ...mockToken, isNative: true },
    });

    expect(queryByTestId(TOKEN_DETAILS_V1_HEADER_TEST_IDS.SUBTITLE)).toBeNull();
  });
});
