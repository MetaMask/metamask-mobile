import React from 'react';
import Text from '../../../Base/Text';
import { shallow } from 'enzyme';
import Coachmark from './';

describe('Coachmark', () => {
	it('should render correctly', () => {
		const content = <Text>{'content'}</Text>;
		const wrapper = shallow(
			<Coachmark content={content} title={'title'} currentStep={1} topIndicatorPosition={'topLeft'} />
		);
		expect(wrapper).toMatchSnapshot();
	});
});
