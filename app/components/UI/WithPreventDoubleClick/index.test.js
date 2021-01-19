import React from 'react';
import Button from '../Button';
import { withPreventDoubleClickErrorMsg, withPreventDoubleClick } from './';

const noop = () => ({});

describe('withPreventDoubleClick', () => {
	it('should render correctly', () => {
		const ButtonWithOnPress = () => <Button onPress={noop} />;
		const WithPreventDoubleClickButton = withPreventDoubleClick(ButtonWithOnPress);
		const wrapper = <WithPreventDoubleClickButton onPress={noop} />;
		expect(wrapper).toMatchSnapshot();
	});

	it('should be wrapped and named correctly', () => {
		const ButtonWithOnPress = () => <Button onPress={noop} />;
		const name = `withPreventDoubleClick(${ButtonWithOnPress.name})`;
		const WithPreventDoubleClickButton = withPreventDoubleClick(ButtonWithOnPress);
		const wrapper = <WithPreventDoubleClickButton onPress={noop} />;
		expect(wrapper.type.displayName).toBe(name);
	});

	it('should throw an error if Component is not provided', () => {
		try {
			withPreventDoubleClick();
		} catch (e) {
			expect(e.message).toBe(withPreventDoubleClickErrorMsg);
		}
	});
});
