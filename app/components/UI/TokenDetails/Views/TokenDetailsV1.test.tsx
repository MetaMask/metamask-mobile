import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { TokenDetailsV1, TOKEN_DETAILS_V1_TEST_ID } from './TokenDetailsV1';
import type { TokenDetailsRouteParams } from '../constants/constants';
import {
  LIVE_PRICE_HEADER_TEST_ID,
  LIVE_PRICE_SCROLL_THRESHOLD_PX,
} from '../hooks/useLivePriceHeaderDescription';
import type { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import Routes from '../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => undefined),
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
    }),
  }),
}));

let mockCurrentPrice = 1;
jest.mock('../hooks/useTokenPrice', () => ({
  useTokenPrice: () => ({
    currentPrice: mockCurrentPrice,
    priceDiff: 0,
    comparePrice: 1,
    currentCurrency: 'usd',
  }),
}));

jest.mock('../hooks/useTokenSecurityData', () => ({
  useTokenSecurityData: () => ({ securityData: null, isLoading: false }),
}));

const mockUseIsPriceAlertsChainSupported = jest.fn(() => true);
jest.mock(
  '../../Assets/PriceAlerts/hooks/useIsPriceAlertsChainSupported',
  () => ({
    useIsPriceAlertsChainSupported: () => mockUseIsPriceAlertsChainSupported(),
  }),
);

jest.mock('../../Bridge/utils/exchange-rates', () => ({
  calcUsdAmountFromFiat: () => 1,
}));

jest.mock(
  '../../Assets/watchlist/components/WatchlistStarButton',
  () => () => null,
);

jest.mock('../components/ShareTokenBottomSheet', () => {
  const { Text: MockText } = jest.requireActual('react-native');
  return () => <MockText testID="share-token-bottom-sheet">share</MockText>;
});

jest.mock('../components/TokenDetailsInlineHeader', () => {
  const { Pressable: MockPressable, Text: MockText } =
    jest.requireActual('react-native');
  return {
    TokenDetailsInlineHeader: ({
      token,
      description,
      onBackPress,
      onPriceAlertPress,
      onSharePress,
    }: React.ComponentProps<typeof TokenDetailsInlineHeader>) => (
      <>
        <MockText>{token.symbol}</MockText>
        {description}
        <MockPressable testID="mock-back" onPress={onBackPress} />
        {onPriceAlertPress && (
          <MockPressable
            testID="mock-price-alert"
            onPress={onPriceAlertPress}
          />
        )}
        {onSharePress && (
          <MockPressable testID="mock-share" onPress={onSharePress} />
        )}
      </>
    ),
  };
});

const baseToken = {
  address: '0x6982508145454ce325ddbe47a25d4ec3d2311933',
  chainId: '0x1',
  symbol: 'PEPE',
  name: 'Pepe',
  isETH: false,
  isNative: false,
  balanceError: null,
  image: '',
  logo: '',
  aggregators: [],
  decimals: 18,
} as unknown as TokenDetailsRouteParams;

describe('TokenDetailsV1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentPrice = 1;
    mockUseIsPriceAlertsChainSupported.mockReturnValue(true);
  });

  it('renders the placeholder meme-TDP body with the token symbol in the header', () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsV1 token={baseToken} />,
    );

    expect(getByTestId(TOKEN_DETAILS_V1_TEST_ID)).toBeTruthy();
    expect(getByText('PEPE')).toBeTruthy();
  });

  it('renders the placeholder title and description with the token symbol', () => {
    const { getByText } = render(<TokenDetailsV1 token={baseToken} />);

    expect(getByText('Dedicated meme coin view')).toBeTruthy();
    expect(
      getByText(
        'A tailored experience for PEPE is being built. Check back soon.',
      ),
    ).toBeTruthy();
  });

  it('falls back to "this token" when the token has no symbol', () => {
    const { getByText } = render(
      <TokenDetailsV1
        token={
          {
            ...baseToken,
            symbol: undefined,
          } as unknown as TokenDetailsRouteParams
        }
      />,
    );

    expect(
      getByText(
        'A tailored experience for this token is being built. Check back soon.',
      ),
    ).toBeTruthy();
  });

  it('navigates back when the header back button is pressed', () => {
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    fireEvent.press(getByTestId('mock-back'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to manage price alerts when the bell is pressed', () => {
    const { getByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    fireEvent.press(getByTestId('mock-price-alert'));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MANAGE_PRICE_ALERTS,
      expect.objectContaining({
        symbol: 'PEPE',
        assetId: 'eip155:1/erc20:0x6982508145454Ce325dDbE47a25d4ec3d2311933',
      }),
    );
  });

  it('hides the price alert action when the chain is not supported', () => {
    mockUseIsPriceAlertsChainSupported.mockReturnValue(false);

    const { queryByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    expect(queryByTestId('mock-price-alert')).toBeNull();
  });

  it('tracks the share event and opens the share sheet', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1 token={baseToken} />,
    );
    expect(queryByTestId('share-token-bottom-sheet')).toBeNull();

    fireEvent.press(getByTestId('mock-share'));

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(getByTestId('share-token-bottom-sheet')).toBeTruthy();
  });

  it('keeps the contract address until the page is scrolled', () => {
    const { queryByTestId } = render(<TokenDetailsV1 token={baseToken} />);

    expect(queryByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeNull();
  });

  it('replaces the contract address with the live price after scrolling', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1 token={baseToken} />,
    );

    fireEvent.scroll(getByTestId('token-details-v1-scroll-view'), {
      nativeEvent: {
        contentOffset: { y: LIVE_PRICE_SCROLL_THRESHOLD_PX },
      },
    });

    expect(getByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeOnTheScreen();

    fireEvent.scroll(getByTestId('token-details-v1-scroll-view'), {
      nativeEvent: { contentOffset: { y: 0 } },
    });

    expect(queryByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeNull();
  });

  it('keeps the contract address when there is no live price', () => {
    mockCurrentPrice = 0;

    const { getByTestId, queryByTestId } = render(
      <TokenDetailsV1 token={baseToken} />,
    );

    fireEvent.scroll(getByTestId('token-details-v1-scroll-view'), {
      nativeEvent: {
        contentOffset: { y: LIVE_PRICE_SCROLL_THRESHOLD_PX },
      },
    });

    expect(queryByTestId(LIVE_PRICE_HEADER_TEST_ID)).toBeNull();
  });
});
