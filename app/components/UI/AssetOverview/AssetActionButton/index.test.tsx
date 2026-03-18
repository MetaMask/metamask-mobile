import React from 'react';
import { render } from '@testing-library/react-native';
import AssetActionButton from '.';

describe('AssetActionButtons', () => {
  const mockText = 'mock text';
  it('should render correctly', () => {
    const component = render(<AssetActionButton label={mockText} />);
    expect(component).toMatchSnapshot();
  });
  it('should render type send correctly', () => {
    const component = render(<AssetActionButton icon="send" label={mockText} />);
    expect(component).toMatchSnapshot();
  });
  it('should render type receive correctly', () => {
    // String with more than 10 characters
    const text = 'receive receive';
    const component = render(<AssetActionButton icon="receive" label={text} />);
    expect(component).toMatchSnapshot();
  });
  it('should render type add correctly', () => {
    const component = render(<AssetActionButton icon="add" label={mockText} />);
    expect(component).toMatchSnapshot();
  });
  it('should render type information correctly', () => {
    const component = render(
      <AssetActionButton icon="information" label={mockText} />,
    );
    expect(component).toMatchSnapshot();
  });
  it('should render type swap correctly', () => {
    const component = render(<AssetActionButton icon="swap" label={mockText} />);
    expect(component).toMatchSnapshot();
  });
});
