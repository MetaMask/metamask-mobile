import React from 'react';
import { shallow } from 'enzyme';
import CollectibleContractElement from './';

describe('CollectibleContractElement', () => {
	it('should render correctly', () => {
		const wrapper = shallow(
			<CollectibleContractElement
				collectibleContract={{
					name: 'name',
					logo: 'logo',
					address: '0x0',
					symbol: 'NM',
					description: 'description',
					total_supply: 10
				}}
			/>
		);
		expect(wrapper).toMatchSnapshot();
	});
});
