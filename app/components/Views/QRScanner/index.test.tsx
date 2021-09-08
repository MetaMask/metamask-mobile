import React from 'react';
import { shallow } from 'enzyme';
import QrScanner from './';

const noop = () => null;

describe('QrScanner', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<QrScanner
				navigation={{}}
				route={{
					params: {
						onScanError: noop,
						onScanSuccess: noop,
						onStartScan: noop,
					},
				}}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
