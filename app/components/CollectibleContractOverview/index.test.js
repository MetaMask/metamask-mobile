import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContractOverview from './';

describe('CollectibleContractOverview', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CollectibleContractOverview
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
