import React from 'react';
import { shallow } from 'enzyme';
import RemoteImage from './';

describe('RemoteImage', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<RemoteImage
				source={{
					uri: `https://raw.githubusercontent.com/MetaMask/eth-contract-metadata/master/images/dai.svg`
				}}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
