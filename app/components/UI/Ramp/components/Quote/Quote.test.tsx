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
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { selectIpfsGateway } from '../../../../../selectors/preferencesController';

// Mock the selectIpfsGateway selector
jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectIpfsGateway: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
(selectIpfsGateway as unknown as jest.Mock).mockReturnValue(
  'https://mock-ipfs-gateway.com',
);

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
  tags: { isBestRate: true } as QuoteTags,
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

describe('Quote Component', () => {
  it('renders correctly with buy quote', () => {
    const { getByText } = renderWithProvider(
      <Quote quote={mockQuote} showInfo={jest.fn()} rampType={RampType.BUY} />,
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
    );

    fireEvent.press(getByLabelText('Mock Provider'));
    expect(onPressMock).toHaveBeenCalled();
  });

  it('shows loading indicator when isLoading is true', () => {
    const { getByTestId } = renderWithProvider(
      <Quote
        quote={mockQuote}
        isLoading
        showInfo={jest.fn()}
        rampType={RampType.BUY}
      />,
    );

    expect(getByTestId('buy-button-loading')).toBeTruthy();
  });

  it('displays previously used provider tag', () => {
    const { getByText } = renderWithProvider(
      <Quote
        quote={mockQuote}
        previouslyUsedProvider
        showInfo={jest.fn()}
        rampType={RampType.BUY}
      />,
    );

    expect(getByText('Previously used')).toBeTruthy();
  });

  it('displays best rate tag', () => {
    const { getByText } = renderWithProvider(
      <Quote quote={mockQuote} showInfo={jest.fn()} rampType={RampType.BUY} />,
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
    );

    fireEvent.press(getByText('Continue with Mock Provider'));
    expect(onPressCTAMock).toHaveBeenCalled();
  });
});
