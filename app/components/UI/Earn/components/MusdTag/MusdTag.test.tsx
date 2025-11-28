import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MusdTag, { MUSD_TAG_SELECTOR } from './MusdTag';

describe('MusdTag', () => {
  it('renders correctly with amount and default symbol', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MusdTag amount="10" />,
    );
    expect(getByTestId(MUSD_TAG_SELECTOR)).toBeDefined();
    expect(getByText('10 mUSD')).toBeDefined();
  });

  it('renders correctly with custom symbol', () => {
    const { getByText } = renderWithProvider(
      <MusdTag amount="25" symbol="USDC" />,
    );
    expect(getByText('25 USDC')).toBeDefined();
  });

  it('renders without background when showBackground is false', () => {
    const { getByText } = renderWithProvider(
      <MusdTag amount="10" showBackground={false} />,
    );
    expect(getByText('10 mUSD')).toBeDefined();
  });

  it('uses custom testID when provided', () => {
    const customTestID = 'custom-musd-tag';
    const { getByTestId } = renderWithProvider(
      <MusdTag amount="50" testID={customTestID} />,
    );
    expect(getByTestId(customTestID)).toBeDefined();
  });

  it('renders correctly with 0 amount', () => {
    const { getByText } = renderWithProvider(<MusdTag amount="0" />);
    expect(getByText('0 mUSD')).toBeDefined();
  });

  it('renders correctly with large amount', () => {
    const { getByText } = renderWithProvider(<MusdTag amount="1,500" />);
    expect(getByText('1,500 mUSD')).toBeDefined();
  });
});
