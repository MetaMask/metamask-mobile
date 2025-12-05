import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import OutputAmountTag, { OUTPUT_AMOUNT_TAG_SELECTOR } from './OutputAmountTag';

describe('OutputAmountTag', () => {
  it('renders correctly with amount and symbol', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <OutputAmountTag amount="10" symbol="mUSD" />,
    );

    expect(getByTestId(OUTPUT_AMOUNT_TAG_SELECTOR)).toBeOnTheScreen();
    expect(getByText('10 mUSD')).toBeOnTheScreen();
  });

  it('renders correctly with custom symbol', () => {
    const { getByText } = renderWithProvider(
      <OutputAmountTag amount="25" symbol="USDC" />,
    );

    expect(getByText('25 USDC')).toBeOnTheScreen();
  });

  it('renders amount without symbol when symbol not provided', () => {
    const { getByText } = renderWithProvider(<OutputAmountTag amount="100" />);

    expect(getByText('100')).toBeOnTheScreen();
  });

  it('sets backgroundColor to transparent when showBackground is false', () => {
    const { getByTestId } = renderWithProvider(
      <OutputAmountTag amount="10" symbol="mUSD" showBackground={false} />,
    );

    const tagElement = getByTestId(OUTPUT_AMOUNT_TAG_SELECTOR);

    expect(tagElement.props.style).toEqual(
      expect.objectContaining({ backgroundColor: 'transparent' }),
    );
  });

  it('uses custom testID when provided', () => {
    const customTestID = 'custom-output-tag';
    const { getByTestId } = renderWithProvider(
      <OutputAmountTag amount="50" symbol="ETH" testID={customTestID} />,
    );

    expect(getByTestId(customTestID)).toBeOnTheScreen();
  });

  it('renders correctly with 0 amount', () => {
    const { getByText } = renderWithProvider(
      <OutputAmountTag amount="0" symbol="mUSD" />,
    );

    expect(getByText('0 mUSD')).toBeOnTheScreen();
  });

  it('renders correctly with large amount', () => {
    const { getByText } = renderWithProvider(
      <OutputAmountTag amount="1,500" symbol="USDT" />,
    );

    expect(getByText('1,500 USDT')).toBeOnTheScreen();
  });
});
