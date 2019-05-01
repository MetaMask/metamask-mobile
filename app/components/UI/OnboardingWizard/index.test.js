import React from 'react';
import OnboardingWizard from './';
import { shallow } from 'enzyme';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('OnboardingWizard', () => {
	it('should render correctly', () => {
		const initialState = {
			wizard: {
				step: 1
			}
		};

		const wrapper = shallow(<OnboardingWizard />, {
			context: { store: mockStore(initialState) }
		});
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
