import React from 'react';
import { shallow } from 'enzyme';
import ModalNavbarTitle from './';

describe('ModalNavbarTitle', () => {
	it('should render correctly', () => {
		const title = 'Test';
		const network = {
			provider: {
				type: 'mainnet'
			}
		};
		const wrapper = shallow(<ModalNavbarTitle title={title} network={network} />);
		expect(wrapper).toMatchSnapshot();
	});
});
