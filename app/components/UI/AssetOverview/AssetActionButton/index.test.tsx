import React from 'react';
import { shallow } from 'enzyme';
import AssetActionButton from '.';

describe('AssetActionButtons', () => {
  const mockText = 'mock text';
  it('should render correctly', () => {
    const wrapper = shallow(<AssetActionButton label={mockText} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render type send correctly', () => {
    const wrapper = shallow(<AssetActionButton icon="send" label={mockText} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render type receive correctly', () => {
    // String with more than 10 characters
    const text = 'receive receive';
    const wrapper = shallow(<AssetActionButton icon="receive" label={text} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render type add correctly', () => {
    const wrapper = shallow(<AssetActionButton icon="add" label={mockText} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render type information correctly', () => {
    const wrapper = shallow(
      <AssetActionButton icon="information" label={mockText} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render type swap correctly', () => {
    const wrapper = shallow(<AssetActionButton icon="swap" label={mockText} />);
    expect(wrapper).toMatchSnapshot();
  });
});
