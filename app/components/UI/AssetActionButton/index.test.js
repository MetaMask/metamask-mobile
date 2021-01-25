import React from 'react';
import { shallow } from 'enzyme';
import AssetActionButton from './';

describe('AssetActionButtons', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<AssetActionButton />);
		expect(wrapper).toMatchSnapshot();
	});
	it('should render type send correctly', () => {
		const wrapper = shallow(<AssetActionButton type="send" />);
		expect(wrapper).toMatchSnapshot();
	});
	it('should render type receive correctly', () => {
		const wrapper = shallow(<AssetActionButton type="receive" />);
		expect(wrapper).toMatchSnapshot();
	});
	it('should render type add correctly', () => {
		const wrapper = shallow(<AssetActionButton type="add" />);
		expect(wrapper).toMatchSnapshot();
	});
	it('should render type information correctly', () => {
		const wrapper = shallow(<AssetActionButton type="information" />);
		expect(wrapper).toMatchSnapshot();
	});
	it('should render type swap correctly', () => {
		const wrapper = shallow(<AssetActionButton type="swap" />);
		expect(wrapper).toMatchSnapshot();
	});
});
