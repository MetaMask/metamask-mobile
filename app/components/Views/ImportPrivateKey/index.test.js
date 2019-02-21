import React from 'react';
import { shallow } from 'enzyme';
import ImportPrivateKey from './';

describe('ImportPrivateKey', () => {
	it('should render correctly', () => {
		const wrapper = shallow(<ImportPrivateKey navigation={{ getParam: () => null, state: { params: {} } }} />);
		expect(wrapper).toMatchSnapshot();
	});
});
