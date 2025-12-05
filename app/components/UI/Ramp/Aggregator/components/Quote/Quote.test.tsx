import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import Quote from './Quote';
import {
  CryptoCurrency,
  FiatCurrency,
  Provider,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';
import { RampType } from '../../types';
import { QuoteTags } from '@consensys/on-ramp-sdk/dist/API';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { selectIpfsGateway } from '../../../../../../selectors/preferencesController';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

// Mock the selectIpfsGateway selector
jest.mock('../../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../../selectors/preferencesController'),
  selectIpfsGateway: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
(selectIpfsGateway as unknown as jest.Mock).mockReturnValue(
  'https://mock-ipfs-gateway.com',
);

jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  // eslint-disable-next-line no-empty-function
  Reanimated.default.call = () => {};
  // simulate expanded value > 0
  Reanimated.useSharedValue = jest.fn(() => ({
    value: 1,
  }));
  Reanimated.useAnimatedStyle = jest.fn((callback) => callback());
  return Reanimated;
});

const mockQuote: QuoteResponse = {
  networkFee: 1,
  providerFee: 1,
  amountIn: 100,
  amountOut: 0.005,
  fiat: {
    symbol: 'USD',
    denomSymbol: '$',
    decimals: 2,
  } as FiatCurrency,
  provider: {
    name: 'Mock Provider',
    logos: { light: 'logo-url', dark: 'logo-url-dark', width: 50, height: 50 },
  } as Provider,
  crypto: { symbol: 'ETH', decimals: 18 } as CryptoCurrency,
  tags: { isBestRate: true, isMostReliable: true } as QuoteTags,
  amountOutInFiat: 98,
  isNativeApplePay: false,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  buy: () => undefined,
};

const mockSellQuote: SellQuoteResponse = {
  ...mockQuote,
  provider: {
    ...mockQuote.provider,
    name: 'Mock Sell Provider',
  },
  amountIn: 0.005,
  amountOut: 100,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  sell: () => undefined,
};

const defaultState = {
  engine: {
    backgroundState,
  },
};

describe('Quote Component', () => {
  it('renders correctly with buy quote', () => {
    const { getByText } = renderWithProvider(
      <Quote quote={mockQuote} showInfo={jest.fn()} rampType={RampType.BUY} />,
      { state: defaultState },
    );

    expect(getByText('Continue with Mock Provider')).toBeTruthy();
    expect(getByText(/0\.005\s*ETH/)).toBeTruthy();
    expect(getByText(/≈\s*\$\s*98\s*USD/)).toBeTruthy();
  });

  it('renders correctly with sell quote', () => {
    const { getByText } = renderWithProvider(
      <Quote
        quote={mockSellQuote}
        showInfo={jest.fn()}
        rampType={RampType.SELL}
      />,
      { state: defaultState },
    );

    expect(getByText('Continue with Mock Sell Provider')).toBeTruthy();
    expect(getByText(/0\.005\s*ETH/)).toBeTruthy();
    expect(getByText(/≈\s*\$\s*100\s*USD/)).toBeTruthy();
  });

  it('calls onPress when not highlighted and pressed', () => {
    const onPressMock = jest.fn();
    const { getByLabelText } = renderWithProvider(
      <Quote
        quote={mockQuote}
        onPress={onPressMock}
        showInfo={jest.fn()}
        rampType={RampType.BUY}
      />,
      { state: defaultState },
    );

    fireEvent.press(getByLabelText('Mock Provider'));
    expect(onPressMock).toHaveBeenCalled();
  });

  it('shows loading indicator when isLoading is true', () => {
    const { toJSON } = renderWithProvider(
      <Quote
        quote={mockQuote}
        isLoading
        showInfo={jest.fn()}
        rampType={RampType.BUY}
      />,
      { state: defaultState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays previously used provider tag', () => {
    const { getByText } = renderWithProvider(
      <Quote
        quote={mockQuote}
        previouslyUsedProvider
        showInfo={jest.fn()}
        rampType={RampType.BUY}
      />,
      { state: defaultState },
    );

    expect(getByText('Previously used')).toBeTruthy();
  });

  it('displays best rate tag', () => {
    const { getByText } = renderWithProvider(
      <Quote quote={mockQuote} showInfo={jest.fn()} rampType={RampType.BUY} />,
      { state: defaultState },
    );

    expect(getByText('Best rate')).toBeTruthy();
  });

  it('calls onPressCTA when CTA button is pressed', () => {
    const onPressCTAMock = jest.fn();
    const { getByText } = renderWithProvider(
      <Quote
        quote={mockQuote}
        onPressCTA={onPressCTAMock}
        showInfo={jest.fn()}
        rampType={RampType.BUY}
      />,
      { state: defaultState },
    );

    fireEvent.press(getByText('Continue with Mock Provider'));
    expect(onPressCTAMock).toHaveBeenCalled();
  });

  it('displays most reliable tag', () => {
    const mockQuoteWithReliableTag = {
      ...mockQuote,
      tags: { isMostReliable: true } as QuoteTags,
    };
    const { getByText } = renderWithProvider(
      <Quote
        quote={mockQuoteWithReliableTag}
        showInfo={jest.fn()}
        rampType={RampType.BUY}
      />,
      { state: defaultState },
    );

    expect(getByText('Most reliable')).toBeTruthy();
  });

  it('displays provider logo correctly', () => {
    const { getByLabelText } = renderWithProvider(
      <Quote quote={mockQuote} showInfo={jest.fn()} rampType={RampType.BUY} />,
      { state: defaultState },
    );

    expect(getByLabelText('Mock Provider logo')).toBeTruthy();
  });

  it('calls showInfo when info icon is pressed and highlighted', () => {
    const showInfoMock = jest.fn();
    const { getByLabelText } = renderWithProvider(
      <Quote
        quote={mockQuote}
        showInfo={showInfoMock}
        rampType={RampType.BUY}
        highlighted
      />,
      { state: defaultState },
    );

    fireEvent.press(getByLabelText('Mock Provider logo'));
    expect(showInfoMock).toHaveBeenCalled();
  });

  /* it('sets expandedHeight on layout', () => {
    const { getByTestId } = renderWithProvider(
      <Quote rampType={RampType.BUY} quote={mockQuote} showInfo={jest.fn()} />,
      { state: defaultState },
    );

    const animatedView = getByTestId('animated-view-height');
    const layoutEvent = {
      nativeEvent: {
        layout: { height: 100, width: 0, x: 0, y: 0 },
      },
    };

    fireEvent(animatedView, 'layout', layoutEvent);
    expect(animatedView.props.style[1].height).toBeDefined();
  });

  it('applies animated styles when highlighted', () => {
    const { getByTestId } = renderWithProvider(
      <Quote
        rampType={RampType.BUY}
        quote={mockQuote}
        showInfo={jest.fn()}
        highlighted
      />,
      { state: defaultState },
    );
    const animatedView = getByTestId('animated-view-height');
    expect(animatedView.props.style[1].height).toBeGreaterThan(0);
    expect(animatedView.props.style[1].opacity).toBe(1);
  });

  it('resets animated styles when not highlighted', () => {
    const { getByTestId } = renderWithProvider(
      <Quote
        rampType={RampType.BUY}
        quote={mockQuote}
        showInfo={jest.fn()}
        highlighted={false}
      />,
      { state: defaultState },
    );
    const animatedView = getByTestId('animated-view-height');
    expect(animatedView.props.style[1].height).toBe(0);
    expect(animatedView.props.style[1].opacity).toBe(0);
  });

  it('applies animated opacity based on expandedHeight', () => {
    const { getByTestId } = renderWithProvider(
      <Quote rampType={RampType.BUY} quote={mockQuote} showInfo={jest.fn()} />,
      { state: defaultState },
    );
    const animatedView = getByTestId('animated-view-opacity');
    expect(animatedView.props.style.opacity).toBe(1);
  }); */
});
