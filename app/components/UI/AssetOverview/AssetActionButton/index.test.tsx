import React from 'react';
import { render } from '@testing-library/react-native';
import AssetActionButton from '.';

describe('AssetActionButtons', () => {
  const mockText = 'mock text';
  it('should render correctly', () => {
    const { toJSON } = render(<AssetActionButton label={mockText} />);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render type send correctly', () => {
    const { toJSON } = render(<AssetActionButton icon="send" label={mockText} />);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render type receive correctly', () => {
    // String with more than 10 characters
    const text = 'receive receive';
    const { toJSON } = render(<AssetActionButton icon="receive" label={text} />);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render type add correctly', () => {
    const { toJSON } = render(<AssetActionButton icon="add" label={mockText} />);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render type information correctly', () => {
    const { toJSON } = render(
      <AssetActionButton icon="information" label={mockText} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render type swap correctly', () => {
    const { toJSON } = render(<AssetActionButton icon="swap" label={mockText} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
