import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContractInformation from './';

describe('CollectibleContractInformation', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CollectibleContractInformation
				collectibleContract={{
					name: 'name',
					symbol: 'symbol',
					description: 'description',
					address: '0x123',
					totalSupply: 1
				}}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
