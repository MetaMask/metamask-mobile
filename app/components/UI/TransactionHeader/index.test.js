import React from 'react';
import { shallow } from 'enzyme';
import TransactionHeader from './';
import configureMockStore from 'redux-mock-store';

const mockStore = configureMockStore();

describe('TransactionHeader', () => {
	it('should render correctly', () => {
		const initialState = {
			engine: {
				backgroundState: {
					NetworkController: {
						provider: {
							type: 'ropsten'
						}
					}
				}
			}
		};

		const wrapper = shallow(
			<TransactionHeader currentPageInformation={{ title: 'title', url: 'url' }} type={'typedSign'} />,
			{
				context: { store: mockStore(initialState) }
			}
		);
		expect(wrapper.dive()).toMatchSnapshot();
	});
});
